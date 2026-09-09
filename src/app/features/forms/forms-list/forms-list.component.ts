import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { FormResponse } from '../../../core/models/crm.model';
import { AiPanelComponent } from '../../../shared/components/ai/ai-panel.component';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
} from '../../../shared/components/state/state-views.component';
import { FormService } from '../form.service';
import { Router } from '@angular/router';
import {
  PackCard,
  TemplateService,
} from '../template.service';

/** Icon/colour choices offered when authoring a form. */
const ICONS = [
  'bi-table', 'bi-people', 'bi-briefcase', 'bi-cart', 'bi-ticket-detailed',
  'bi-headset', 'bi-building', 'bi-journal-text', 'bi-truck', 'bi-heart-pulse',
];

const COLORS = ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#0891b2'];

@Component({
  selector: 'app-forms-list',
  standalone: true,
  imports: [
    AiPanelComponent,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    SearchBoxComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forms-list.component.html',
  styleUrl: './forms-list.component.css',
})
export class FormsListComponent {
  private readonly formService = inject(FormService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly icons = ICONS;
  readonly colors = COLORS;

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly forms = signal<FormResponse[]>([]);
  readonly term = signal('');

  readonly modalOpen = signal(false);

  /* ------------------------------------------------ vertical packs */
  private readonly templateService = inject(TemplateService);
  private readonly router = inject(Router);
  readonly templates = signal<PackCard[]>([]);
  readonly galleryOpen = signal(false);
  readonly galleryTab = signal<'builtin' | 'mine'>('builtin');
  readonly previewFor = signal<PackCard | null>(null);
  readonly applying = signal(false);
  templateFormName = '';
  applyAgent = true;
  applyPlaybook = true;
  applyAutomations = true;
  applyWhatsapp = true;

  readonly builtinPacks = computed(() => this.templates().filter((t) => t.builtin));
  readonly myPacks = computed(() => this.templates().filter((t) => !t.builtin));

  /* save-as-pack + import */
  readonly exportFor = signal<FormResponse | null>(null);
  readonly exporting = signal(false);
  packName = '';
  readonly importOpen = signal(false);
  readonly importing = signal(false);
  importJson = '';

  openGallery(): void {
    this.galleryOpen.set(true);
    this.loadPacks();
  }

  private loadPacks(): void {
    this.templateService.catalog().subscribe({
      next: (list) => this.templates.set(list),
      error: () => this.templates.set([]),
    });
  }

  /** Step 1: card click => full preview (kya-kya banega) — abhi kuch create NAHI hota. */
  openPreview(template: PackCard): void {
    this.previewFor.set(template);
    this.templateFormName = template.name;
    this.applyAgent = !!template.agent;
    this.applyPlaybook = !!template.includes?.playbook;
    this.applyAutomations = true;
    this.applyWhatsapp = true;
  }

  /** Step 2: user ke confirm par hi create hota hai. */
  confirmApply(): void {
    const template = this.previewFor();
    if (!template) return;
    this.applying.set(true);
    this.templateService
      .apply(template.key, {
        name: this.templateFormName.trim() || undefined,
        includeAgent: this.applyAgent,
        includePlaybook: this.applyPlaybook,
        includeAutomations: this.applyAutomations,
        includeWhatsapp: this.applyWhatsapp,
      })
      .subscribe({
        next: (result) => {
          this.applying.set(false);
          this.previewFor.set(null);
          this.galleryOpen.set(false);
          const parts = [
            `${result.fieldCount} fields`,
            `${result.stageCount} stages`,
            `${result.automationCount} draft automations`,
          ];
          if (result.whatsappDraftCount) parts.push(`${result.whatsappDraftCount} WhatsApp drafts`);
          if (result.agentId) parts.push('an AI assistant');
          if (result.playbookId) parts.push('a sales playbook');
          this.toast.success(`${result.form.name} ready!`, `${parts.join(', ')}. ${result.note}`);
          this.router.navigate(['/app/forms', result.form.id]);
        },
        error: () => this.applying.set(false),
      });
  }

  openExport(form: FormResponse, event?: Event): void {
    event?.stopPropagation();
    this.exportFor.set(form);
    this.packName = form.name;
  }

  confirmExport(): void {
    const form = this.exportFor();
    if (!form) return;
    this.exporting.set(true);
    this.templateService.exportForm(form.id, this.packName.trim() || undefined).subscribe({
      next: (pack) => {
        this.exporting.set(false);
        this.exportFor.set(null);
        this.toast.success('Pack saved', `"${pack.name}" is under My packs — install it in any workspace or share its JSON.`);
        this.loadPacks();
      },
      error: () => this.exporting.set(false),
    });
  }

  confirmImport(): void {
    const json = this.importJson.trim();
    if (!json) return;
    this.importing.set(true);
    this.templateService.importPack(json).subscribe({
      next: (pack) => {
        this.importing.set(false);
        this.importOpen.set(false);
        this.importJson = '';
        this.galleryTab.set('mine');
        this.toast.success('Pack imported', `"${pack.name}" is ready to install.`);
        this.loadPacks();
      },
      error: () => this.importing.set(false),
    });
  }

  deletePack(pack: PackCard, event?: Event): void {
    event?.stopPropagation();
    if (!pack.customId) return;
    this.confirm.confirmDelete(`pack "${pack.name}"`).subscribe((ok) => {
      if (!ok) return;
      this.templateService.deleteCustom(pack.customId!).subscribe({ next: () => this.loadPacks() });
    });
  }

  packJsonUrl(pack: PackCard): string {
    return pack.customId ? this.templateService.customJsonUrl(pack.customId) : '';
  }

  copyPackJson(pack: PackCard, event?: Event): void {
    event?.stopPropagation();
    const json = JSON.stringify(
      {
        key: pack.key, name: pack.name, icon: pack.icon, color: pack.color, tagline: pack.tagline,
        description: pack.description, industry: pack.industry, tags: pack.tags, fields: pack.fields,
        stages: pack.stages, automations: pack.automations, whatsappTemplates: pack.whatsappTemplates,
        agent: pack.agent, playbook: pack.playbook,
      },
      null,
      2,
    );
    navigator.clipboard?.writeText(json).then(
      () => this.toast.success('Copied', 'Pack JSON is on your clipboard — paste it into "Import pack" anywhere.'),
      () => this.toast.error('Copy failed'),
    );
  }

  playbookLine(r: { name: string; trigger: string; action: string; afterMinutes?: number | null }): string {
    const when: Record<string, string> = {
      NO_REPLY: 'customer silent',
      STAGE_IDLE: 'stuck in stage',
      RECORD_CREATED: 'after a new record',
      QUALIFIED: 'once qualified',
      INTEREST: 'AI interest signal',
    };
    const what: Record<string, string> = {
      SEND_MESSAGE: 'send a message',
      SEND_DOCUMENT: 'send the quotation',
      MOVE_STAGE: 'move the stage',
      CREATE_TASK: 'create a task',
      HANDOFF: 'hand to a person',
      NOTIFY: 'notify the team',
    };
    const mins = r.afterMinutes ?? 0;
    const delay = mins >= 1440 ? `${Math.round(mins / 1440)}d` : mins >= 60 ? `${Math.round(mins / 60)}h` : mins ? `${mins}m` : '';
    return `${when[r.trigger] ?? r.trigger}${delay ? ' ' + delay : ''} → ${what[r.action] ?? r.action}`;
  }

  automationLine(a: {
    trigger: string;
    triggerStageCode: string | null;
    triggerStatusName?: string | null;
    actionType: string;
  }): string {
    const act = a.actionType === 'SEND_WHATSAPP' ? 'a WhatsApp message is sent'
      : a.actionType === 'SEND_EMAIL' ? 'an email is sent'
        : a.actionType === 'SEND_DOCUMENT' ? 'a document is auto-filled & sent'
          : a.actionType === 'ADJUST_FIELD' ? 'a field is updated'
            : a.actionType === 'CREATE_TASK' ? 'a task is created for a person'
              : a.actionType === 'CHANGE_STAGE' ? 'the stage changes'
                : 'an action runs';
    const when = a.trigger === 'RECORD_CREATED'
      ? 'As soon as a record is created'
      : a.trigger === 'STATUS_CHANGED' && a.triggerStatusName
        ? `When the status becomes "${a.triggerStatusName}"`
        : a.triggerStageCode
          ? `When a record reaches "${a.triggerStageCode}"`
          : 'When a record changes stage';
    return `${when} → ${act}`;
  }

  readonly aiOpen = signal(false);
  readonly aiSuggestions = [
    'Create a new form with the fields I describe: ',
    'Show my forms',
    'Which of my forms has no fields yet?',
  ];
  readonly editing = signal<FormResponse | null>(null);
  /** Slug follows the name until the user edits it by hand. */
  private slugTouched = false;

  readonly visible = computed(() => {
    const term = this.term().toLowerCase();
    if (!term) return this.forms();
    return this.forms().filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        f.slug.toLowerCase().includes(term) ||
        (f.description ?? '').toLowerCase().includes(term),
    );
  });

  readonly editorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    description: [''],
    icon: ['bi-table'],
    color: ['#4f46e5'],
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.formService.getAll().subscribe({
      next: (forms) => {
        this.forms.set(forms ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  onSearch(term: string): void {
    this.term.set(term);
  }

  // ---------------------------------------------------------------- editor

  openCreate(): void {
    this.editing.set(null);
    this.slugTouched = false;
    this.editorForm.reset({
      name: '',
      slug: '',
      description: '',
      icon: 'bi-table',
      color: '#4f46e5',
    });
    this.modalOpen.set(true);
  }

  openEdit(form: FormResponse, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.editing.set(form);
    this.slugTouched = true; // never rewrite an existing slug automatically
    this.editorForm.reset({
      name: form.name,
      slug: form.slug,
      description: form.description ?? '',
      icon: form.icon || 'bi-table',
      color: form.color || '#4f46e5',
    });
    this.modalOpen.set(true);
  }

  closeEditor(): void {
    if (this.saving()) return;
    this.modalOpen.set(false);
  }

  onNameInput(): void {
    if (this.slugTouched) return;
    this.editorForm.controls.slug.setValue(
      FormService.toSlug(this.editorForm.controls.name.value),
    );
  }

  onSlugInput(): void {
    this.slugTouched = true;
  }

  pickIcon(icon: string): void {
    this.editorForm.controls.icon.setValue(icon);
  }

  pickColor(color: string): void {
    this.editorForm.controls.color.setValue(color);
  }

  save(): void {
    if (this.editorForm.invalid) {
      this.editorForm.markAllAsTouched();
      return;
    }

    const payload = this.editorForm.getRawValue();
    const current = this.editing();
    this.saving.set(true);

    const request$ = current
      ? this.formService.update(current.id, payload)
      : this.formService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Form updated' : 'Form created', payload.name);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(form: FormResponse, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    this.confirm
      .ask({
        title: `Delete "${form.name}"?`,
        message:
          'This removes the form together with its fields, stages and records. This action cannot be undone.',
        confirmText: 'Delete form',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.formService.delete(form.id).subscribe({
          next: () => {
            this.toast.success('Form deleted', form.name);
            this.load();
          },
        });
      });
  }
}
