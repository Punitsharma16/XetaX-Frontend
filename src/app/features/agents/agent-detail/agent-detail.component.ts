import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import { Agent, AgentChannelConfig, AgentService, AgentSource, StageHint } from '../agent.service';
import { FieldResponse, FormResponse, StageResponse } from '../../../core/models/crm.model';
import { FormService } from '../../forms/form.service';
import { StageService } from '../../stages/stage.service';
import { FieldService } from '../../fields/field.service';
import { DocumentFile, DocumentService } from '../../documents/document.service';
import { Playbook, PlaybookRule, PlaybookRun, PlaybookService, RuleStat } from '../../playbook/playbook.service';

interface ChatMessage {
  who: 'me' | 'bot';
  text: string;
}

/** One agent: knowledge sources, live playground, and the embed snippet. */
@Component({
  selector: 'app-agent-detail',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, PageHeaderComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './agent-detail.component.html',
  styleUrl: './agent-detail.component.css',
})
export class AgentDetailComponent {
  private readonly agents = inject(AgentService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly formService = inject(FormService);
  private readonly stageService = inject(StageService);
  private readonly fieldService = inject(FieldService);
  private readonly documentService = inject(DocumentService);
  private readonly playbookService = inject(PlaybookService);

  readonly id = input.required<string>();

  readonly agent = signal<Agent | null>(null);
  readonly sources = signal<AgentSource[]>([]);
  readonly error = signal(false);
  readonly tab = signal<'sources' | 'playground' | 'embed' | 'channels' | 'playbook' | 'settings'>('sources');

  /* sources */
  readonly adding = signal(false);
  srcMode: 'pdf' | 'url' | 'text' = 'pdf';
  srcUrl = '';
  srcTextName = '';
  srcText = '';
  private pdfFile: File | null = null;
  readonly pdfName = signal('');

  /* playground */
  readonly chat = signal<ChatMessage[]>([]);
  readonly thinking = signal(false);
  draft = '';
  private readonly sessionId = 'playground-' + Math.random().toString(36).slice(2, 10);

  /* channels & pipeline */
  readonly channels = signal<AgentChannelConfig | null>(null);
  readonly savingChannels = signal(false);
  readonly forms = signal<FormResponse[]>([]);
  readonly formStages = signal<StageResponse[]>([]);
  cWhatsapp = false;
  cScope: 'ALL' | 'CAMPAIGN' = 'ALL';
  cMode: 'SUGGEST' | 'AUTO' = 'SUGGEST';
  cFormId: number | null = null;
  cHints: StageHint[] = [];
  cKeywords = '';
  cMaxTurns = 30;
  cWait = 3;
  cCapture = true;
  hintStageId: number | null = null;
  hintText = '';

  /* playbook */
  readonly playbook = signal<Playbook | null>(null);
  readonly playbookLoading = signal(false);
  readonly savingPlaybook = signal(false);
  readonly pbFields = signal<FieldResponse[]>([]);
  readonly pbStages = signal<StageResponse[]>([]);
  readonly documents = signal<DocumentFile[]>([]);
  readonly pbRuns = signal<PlaybookRun[]>([]);
  readonly pbStats = signal<RuleStat[] | null>(null);
  readonly pbBusy = signal<'preview' | 'run' | null>(null);
  readonly editingRule = signal<PlaybookRule | null>(null);
  readonly editingIndex = signal<number>(-1);
  pbFormId: number | null = null;
  pbActive = false;
  pbGoal = '';
  pbQualification: string[] = [];
  pbQuietStart = 21;
  pbQuietEnd = 9;
  pbMaxFollowUps = 3;
  pbDocumentId: number | null = null;
  pbRules: PlaybookRule[] = [];
  readonly triggerLabels: Record<string, string> = {
    NO_REPLY: 'Customer has not replied for…',
    STAGE_IDLE: 'Record stuck in a stage for…',
    RECORD_CREATED: 'After a new record, wait…',
    QUALIFIED: 'All qualification fields are filled',
    INTEREST: 'AI conversation summary says…',
  };
  readonly actionLabels: Record<string, string> = {
    SEND_MESSAGE: 'Send a message (WhatsApp → email → task)',
    SEND_DOCUMENT: 'Send the quotation / brochure',
    MOVE_STAGE: 'Move to a stage',
    CREATE_TASK: 'Create a task for a person',
    HANDOFF: 'Hand the lead to a person (task + alert)',
    NOTIFY: 'Notify the team',
  };
  readonly triggers = Object.keys(this.triggerLabels);
  readonly actions = Object.keys(this.actionLabels);
  readonly delayUnits = [
    { label: 'minutes', mult: 1 },
    { label: 'hours', mult: 60 },
    { label: 'days', mult: 1440 },
  ];
  ruleDelayValue = 1;
  ruleDelayUnit = 1440;
  ruleRepeatValue = 2;
  ruleRepeatUnit = 1440;

  /* settings */
  readonly savingSettings = signal(false);
  sName = '';
  sPersona = '';
  sWelcome = '';
  sColor = '#4f46e5';
  sActive = true;

  constructor() {
    effect(() => {
      const agentId = Number(this.id());
      if (Number.isFinite(agentId)) this.load(agentId);
    });
  }

  load(agentId: number): void {
    this.agents.get(agentId).subscribe({
      next: (agent) => {
        this.agent.set(agent);
        this.sName = agent.name;
        this.sPersona = agent.persona ?? '';
        this.sWelcome = agent.welcomeMessage ?? '';
        this.sColor = agent.themeColor;
        this.sActive = agent.status === 'ACTIVE';
        if (!this.chat().length) {
          this.chat.set([
            { who: 'bot', text: agent.welcomeMessage || 'Hi! Main aapki kaise help karun?' },
          ]);
        }
      },
      error: () => this.error.set(true),
    });
    this.agents.sources(agentId).subscribe({ next: (list) => this.sources.set(list) });
    this.agents.channels(agentId).subscribe({
      next: (cfg) => {
        this.channels.set(cfg);
        this.cWhatsapp = cfg.whatsappEnabled;
        this.cScope = cfg.whatsappScope;
        this.cMode = cfg.pipelineMode;
        this.cFormId = cfg.targetFormId;
        this.cHints = [...cfg.stageHints];
        this.cKeywords = cfg.handoffKeywords;
        this.cMaxTurns = cfg.maxAiTurns;
        this.cWait = cfg.websiteWaitMinutes;
        this.cCapture = cfg.captureFields;
        if (cfg.targetFormId) this.loadPipeline(cfg.targetFormId);
        if (cfg.targetFormId && this.pbFormId === null) {
          this.pbFormId = cfg.targetFormId;
          this.loadPlaybook();
        }
      },
      error: () => {},
    });
    this.formService.getAll().subscribe({ next: (list) => this.forms.set(list), error: () => {} });
    this.documentService.list().subscribe({ next: (list) => this.documents.set(list ?? []), error: () => {} });
  }

  /* ------------------------------------------------------------ playbook */

  onPlaybookFormChange(): void {
    this.playbook.set(null);
    this.pbStats.set(null);
    this.pbRuns.set([]);
    this.loadPlaybook();
  }

  loadPlaybook(): void {
    const formId = Number(this.pbFormId);
    if (!formId) return;
    this.playbookLoading.set(true);
    this.fieldService.getByForm(formId).subscribe({ next: (list) => this.pbFields.set(list ?? []), error: () => this.pbFields.set([]) });
    this.stageService.getByForm(formId).subscribe({ next: (list) => this.pbStages.set(list ?? []), error: () => this.pbStages.set([]) });
    this.playbookService.forForm(formId).subscribe({
      next: (pb) => {
        this.playbookLoading.set(false);
        this.applyPlaybook(pb);
        if (pb.id) this.loadRuns(pb.id);
      },
      error: () => this.playbookLoading.set(false),
    });
  }

  private applyPlaybook(pb: Playbook): void {
    this.playbook.set(pb);
    this.pbActive = pb.active;
    this.pbGoal = pb.goal ?? '';
    this.pbQualification = [...(pb.qualificationKeys ?? [])];
    this.pbQuietStart = pb.quietStart;
    this.pbQuietEnd = pb.quietEnd;
    this.pbMaxFollowUps = pb.maxFollowUps;
    this.pbDocumentId = pb.quotationDocumentId;
    this.pbRules = (pb.rules ?? []).map((r) => ({ ...r, stageIds: [...(r.stageIds ?? [])], conditions: [...(r.conditions ?? [])] }));
  }

  private loadRuns(id: number): void {
    this.playbookService.runs(id).subscribe({ next: (list) => this.pbRuns.set(list ?? []), error: () => {} });
  }

  toggleQualification(key: string): void {
    this.pbQualification = this.pbQualification.includes(key)
      ? this.pbQualification.filter((k) => k !== key)
      : [...this.pbQualification, key];
  }

  savePlaybook(): void {
    const agent = this.agent();
    const formId = Number(this.pbFormId);
    if (!agent || !formId) {
      this.toast.warning('Pick the form this playbook works on.');
      return;
    }
    this.savingPlaybook.set(true);
    this.playbookService
      .save(formId, {
        agentId: agent.id,
        active: this.pbActive,
        goal: this.pbGoal,
        qualificationKeys: this.pbQualification,
        quietStart: Number(this.pbQuietStart),
        quietEnd: Number(this.pbQuietEnd),
        maxFollowUps: Number(this.pbMaxFollowUps),
        quotationDocumentId: this.pbDocumentId ? Number(this.pbDocumentId) : null,
        rules: this.pbRules,
      })
      .subscribe({
        next: (pb) => {
          this.savingPlaybook.set(false);
          this.applyPlaybook(pb);
          if (pb.id) this.loadRuns(pb.id);
          this.toast.success('Playbook saved', pb.active ? 'It runs every minute from now on.' : 'Saved as OFF — switch it on when the rules look right.');
        },
        error: () => this.savingPlaybook.set(false),
      });
  }

  previewPlaybook(): void {
    const pb = this.playbook();
    if (!pb?.id) {
      this.toast.warning('Save the playbook first, then preview.');
      return;
    }
    this.pbBusy.set('preview');
    this.playbookService.preview(pb.id).subscribe({
      next: (stats) => { this.pbBusy.set(null); this.pbStats.set(stats); },
      error: () => this.pbBusy.set(null),
    });
  }

  runPlaybookNow(): void {
    const pb = this.playbook();
    if (!pb?.id) return;
    this.confirm
      .ask({
        title: 'Run the playbook now?',
        message: 'Eligible rules fire immediately (quiet hours and follow-up caps still apply). Messages really go out.',
        confirmText: 'Run now',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.pbBusy.set('run');
        this.playbookService.runNow(pb.id!).subscribe({
          next: (stats) => {
            this.pbBusy.set(null);
            this.pbStats.set(stats);
            this.loadRuns(pb.id!);
            const fired = stats.reduce((n, s) => n + s.fired, 0);
            this.toast.success('Playbook ran', `${fired} action${fired === 1 ? '' : 's'} fired.`);
          },
          error: () => this.pbBusy.set(null),
        });
      });
  }

  newRule(): void {
    this.editingIndex.set(-1);
    this.ruleDelayValue = 1;
    this.ruleDelayUnit = 1440;
    this.ruleRepeatValue = 2;
    this.ruleRepeatUnit = 1440;
    this.editingRule.set({
      name: '',
      trigger: 'NO_REPLY',
      afterMinutes: 1440,
      stageIds: [],
      interest: 'HOT',
      maxRepeats: 1,
      repeatEveryMinutes: null,
      action: 'SEND_MESSAGE',
      message: '',
      aiCompose: true,
      templateName: '',
      documentId: null,
      targetStageId: null,
      taskTitle: '',
      taskDueHours: 4,
      active: true,
      conditions: [],
    });
  }

  editRule(index: number): void {
    const r = this.pbRules[index];
    this.editingIndex.set(index);
    const [dv, du] = this.splitMinutes(r.afterMinutes ?? 0);
    this.ruleDelayValue = dv;
    this.ruleDelayUnit = du;
    const [rv, ru] = this.splitMinutes(r.repeatEveryMinutes ?? r.afterMinutes ?? 1440);
    this.ruleRepeatValue = rv;
    this.ruleRepeatUnit = ru;
    this.editingRule.set({ ...r, stageIds: [...(r.stageIds ?? [])], conditions: (r.conditions ?? []).map((c) => ({ ...c })) });
  }

  private splitMinutes(mins: number): [number, number] {
    if (mins >= 1440 && mins % 1440 === 0) return [mins / 1440, 1440];
    if (mins >= 60 && mins % 60 === 0) return [mins / 60, 60];
    return [mins, 1];
  }

  toggleRuleStage(id: number): void {
    const r = this.editingRule();
    if (!r) return;
    r.stageIds = r.stageIds.includes(id) ? r.stageIds.filter((s) => s !== id) : [...r.stageIds, id];
    this.editingRule.set({ ...r });
  }

  addCondition(): void {
    const r = this.editingRule();
    if (!r) return;
    r.conditions = [...r.conditions, { fieldKey: this.pbFields()[0]?.fieldKey ?? '', op: 'NOT_BLANK', value: '' }];
    this.editingRule.set({ ...r });
  }

  removeCondition(i: number): void {
    const r = this.editingRule();
    if (!r) return;
    r.conditions = r.conditions.filter((_, idx) => idx !== i);
    this.editingRule.set({ ...r });
  }

  commitRule(): void {
    const r = this.editingRule();
    if (!r) return;
    if (!r.name.trim()) { this.toast.warning('Give the rule a name.'); return; }
    if (r.action === 'MOVE_STAGE' && !r.targetStageId) { this.toast.warning('Pick the stage to move to.'); return; }
    if (r.action === 'SEND_MESSAGE' && !r.aiCompose && !(r.message ?? '').trim()) { this.toast.warning('Write the message or let the AI compose it.'); return; }
    r.afterMinutes = ['NO_REPLY', 'STAGE_IDLE', 'RECORD_CREATED'].includes(r.trigger)
      ? Math.max(0, Number(this.ruleDelayValue) * Number(this.ruleDelayUnit)) : 0;
    r.repeatEveryMinutes = (r.maxRepeats ?? 1) > 1 ? Math.max(1, Number(this.ruleRepeatValue) * Number(this.ruleRepeatUnit)) : null;
    r.targetStageId = r.targetStageId ? Number(r.targetStageId) : null;
    r.documentId = r.documentId ? Number(r.documentId) : null;
    const list = [...this.pbRules];
    if (this.editingIndex() >= 0) list[this.editingIndex()] = r; else list.push(r);
    this.pbRules = list;
    this.editingRule.set(null);
  }

  removeRule(index: number): void {
    this.pbRules = this.pbRules.filter((_, i) => i !== index);
  }

  moveRule(index: number, dir: -1 | 1): void {
    const j = index + dir;
    if (j < 0 || j >= this.pbRules.length) return;
    const list = [...this.pbRules];
    [list[index], list[j]] = [list[j], list[index]];
    this.pbRules = list;
  }

  ruleSummary(r: PlaybookRule): string {
    const stage = r.stageIds?.length ? r.stageIds.map((id) => this.pbStageName(id)).join(', ') : 'any open stage';
    const delay = this.humanMinutes(r.afterMinutes ?? 0);
    const when = r.trigger === 'NO_REPLY' ? `no reply for ${delay}`
      : r.trigger === 'STAGE_IDLE' ? `stuck ${delay}`
        : r.trigger === 'RECORD_CREATED' ? `${delay} after creation`
          : r.trigger === 'QUALIFIED' ? 'qualified'
            : `AI says ${r.interest}`;
    const repeat = (r.maxRepeats ?? 1) > 1 ? ` · up to ${r.maxRepeats}× every ${this.humanMinutes(r.repeatEveryMinutes ?? r.afterMinutes ?? 0)}` : '';
    return `${when} · ${stage}${repeat}`;
  }

  humanMinutes(mins: number): string {
    if (!mins) return 'now';
    if (mins % 1440 === 0) return `${mins / 1440}d`;
    if (mins % 60 === 0) return `${mins / 60}h`;
    return `${mins}m`;
  }

  pbStageName(id: number): string {
    return this.pbStages().find((s) => s.id === id)?.name ?? `#${id}`;
  }

  fieldLabel(key: string): string {
    return this.pbFields().find((f) => f.fieldKey === key)?.label ?? key;
  }

  channelIcon(channel: string | null): string {
    switch (channel) {
      case 'WHATSAPP': case 'WA_TEMPLATE': return 'bi-whatsapp text-success';
      case 'EMAIL': return 'bi-envelope text-primary';
      case 'TASK': return 'bi-person-check text-warning';
      case 'STAGE': return 'bi-signpost-split text-info';
      case 'NOTIFY': return 'bi-bell';
      default: return 'bi-dash-circle text-muted';
    }
  }

  /* ---------------------------------------------------- channels & pipeline */

  onTargetFormChange(): void {
    this.cHints = [];
    this.hintStageId = null;
    if (this.cFormId) this.loadPipeline(this.cFormId);
    else this.formStages.set([]);
  }

  private loadPipeline(formId: number): void {
    this.stageService.getByForm(formId).subscribe({ next: (list) => this.formStages.set(list), error: () => {} });
  }

  addHint(): void {
    const stageId = Number(this.hintStageId);
    const text = this.hintText.trim();
    if (!stageId || !text) {
      this.toast.warning('Pick a stage and describe when the AI should choose it.');
      return;
    }
    this.cHints = [...this.cHints, { stageId, hint: text }];
    this.hintText = '';
  }

  removeHint(index: number): void {
    this.cHints = this.cHints.filter((_, i) => i !== index);
  }

  stageName(id: number): string {
    return this.formStages().find((s) => s.id === id)?.name ?? `Stage #${id}`;
  }

  saveChannels(): void {
    const agent = this.agent();
    if (!agent) return;
    this.savingChannels.set(true);
    this.agents
      .saveChannels(agent.id, {
        whatsappEnabled: this.cWhatsapp,
        whatsappScope: this.cScope,
        pipelineMode: this.cMode,
        targetFormId: this.cFormId ? Number(this.cFormId) : null,
        stageHints: this.cHints,
        handoffKeywords: this.cKeywords,
        maxAiTurns: Number(this.cMaxTurns) || 30,
        websiteWaitMinutes: Number(this.cWait) || 3,
        captureFields: this.cCapture,
      })
      .subscribe({
        next: (cfg) => {
          this.savingChannels.set(false);
          this.channels.set(cfg);
          this.cHints = [...cfg.stageHints];
          this.toast.success('Channel settings saved');
        },
        error: () => this.savingChannels.set(false),
      });
  }

  /* ------------------------------------------------------------- sources */

  onPdfPicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.pdfFile = file;
    this.pdfName.set(file?.name ?? '');
  }

  addSource(): void {
    const agent = this.agent();
    if (!agent) return;
    let request;
    if (this.srcMode === 'pdf') {
      if (!this.pdfFile) {
        this.toast.warning('File missing', 'Choose a PDF first.');
        return;
      }
      request = this.agents.addPdf(agent.id, this.pdfFile);
    } else if (this.srcMode === 'url') {
      if (!this.srcUrl.trim()) {
        this.toast.warning('URL missing', 'Enter the full URL of the page.');
        return;
      }
      request = this.agents.addUrl(agent.id, this.srcUrl.trim());
    } else {
      if (!this.srcText.trim()) {
        this.toast.warning('Text missing', 'Paste the knowledge text.');
        return;
      }
      request = this.agents.addText(agent.id, this.srcTextName.trim(), this.srcText.trim());
    }
    this.adding.set(true);
    request.subscribe({
      next: (source) => {
        this.adding.set(false);
        this.srcUrl = this.srcText = this.srcTextName = '';
        this.pdfFile = null;
        this.pdfName.set('');
        this.sources.update((list) => [source, ...list]);
        if (source.status === 'INDEXED') {
          this.toast.success('Knowledge indexed', `${source.chunkCount} chunks ready`);
        } else {
          this.toast.error('Indexing failed', source.error ?? '');
        }
      },
      error: () => this.adding.set(false),
    });
  }

  deleteSource(source: AgentSource): void {
    const agent = this.agent();
    if (!agent) return;
    this.confirm.confirmDelete(`source '${source.name}'`).subscribe((ok) => {
      if (!ok) return;
      this.agents.deleteSource(agent.id, source.id).subscribe({
        next: () => {
          this.sources.update((list) => list.filter((s) => s.id !== source.id));
          this.toast.success('Source removed', 'The agent will no longer answer from it.');
        },
      });
    });
  }

  /* ---------------------------------------------------------- playground */

  send(): void {
    const agent = this.agent();
    const question = this.draft.trim();
    if (!agent || !question || this.thinking()) return;
    this.draft = '';
    this.chat.update((list) => [...list, { who: 'me', text: question }]);
    this.thinking.set(true);
    this.agents.publicChat(agent.publicKey, this.sessionId, question).subscribe({
      next: (result) => {
        this.thinking.set(false);
        this.chat.update((list) => [...list, { who: 'bot', text: result.reply }]);
      },
      error: () => {
        this.thinking.set(false);
        this.chat.update((list) => [
          ...list,
          { who: 'bot', text: 'Something went wrong — please try again.' },
        ]);
      },
    });
  }

  /* --------------------------------------------------------------- embed */

  snippet(): string {
    const agent = this.agent();
    return agent ? this.agents.embedSnippet(agent) : '';
  }

  copySnippet(): void {
    navigator.clipboard?.writeText(this.snippet()).then(
      () => this.toast.success('Copied', 'The script is on your clipboard — paste it into your site <body>.'),
      () => this.toast.error('Copy failed'),
    );
  }

  /** Hosted chat page for this agent — served by this panel's own domain. */
  shareLink(): string {
    const agent = this.agent();
    return agent ? `${window.location.origin}/chat/${agent.publicKey}` : '';
  }

  qrSrc(): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=264x264&margin=8&data=${encodeURIComponent(this.shareLink())}`;
  }

  copyShareLink(): void {
    navigator.clipboard?.writeText(this.shareLink()).then(
      () => this.toast.success('Copied', 'Chat link is on your clipboard — paste it into any campaign.'),
      () => this.toast.error('Copy failed'),
    );
  }

  /* ------------------------------------------------------------ settings */

  saveSettings(): void {
    const agent = this.agent();
    if (!agent) return;
    this.savingSettings.set(true);
    this.agents
      .update(agent.id, {
        name: this.sName.trim(),
        persona: this.sPersona,
        welcomeMessage: this.sWelcome,
        themeColor: this.sColor,
        status: this.sActive ? 'ACTIVE' : 'DISABLED',
      })
      .subscribe({
        next: (updated) => {
          this.savingSettings.set(false);
          this.agent.set(updated);
          this.toast.success('Agent updated');
        },
        error: () => this.savingSettings.set(false),
      });
  }
}
