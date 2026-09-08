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
import { FormResponse, StageResponse } from '../../../core/models/crm.model';
import { FormService } from '../../forms/form.service';
import { StageService } from '../../stages/stage.service';

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

  readonly id = input.required<string>();

  readonly agent = signal<Agent | null>(null);
  readonly sources = signal<AgentSource[]>([]);
  readonly error = signal(false);
  readonly tab = signal<'sources' | 'playground' | 'embed' | 'channels' | 'settings'>('sources');

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
      },
      error: () => {},
    });
    this.formService.getAll().subscribe({ next: (list) => this.forms.set(list), error: () => {} });
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
