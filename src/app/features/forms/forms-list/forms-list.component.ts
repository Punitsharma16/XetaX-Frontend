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
  FormTemplate,
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

  /* ------------------------------------------------ business templates */
  private readonly templateService = inject(TemplateService);
  private readonly router = inject(Router);
  readonly templates = signal<FormTemplate[]>([]);
  readonly galleryOpen = signal(false);
  readonly previewFor = signal<FormTemplate | null>(null);
  readonly applying = signal(false);
  templateFormName = '';

  openGallery(): void {
    this.galleryOpen.set(true);
    if (!this.templates().length) {
      this.templateService.catalog().subscribe({
        next: (list) => this.templates.set(list),
        error: () => this.templates.set([]),
      });
    }
  }

  /** Step 1: card click => full preview (kya-kya banega) — abhi kuch create NAHI hota. */
  openPreview(template: FormTemplate): void {
    this.previewFor.set(template);
    this.templateFormName = template.name;
  }

  /** Step 2: user ke confirm par hi create hota hai. */
  confirmApply(): void {
    const template = this.previewFor();
    if (!template) return;
    this.applying.set(true);
    this.templateService.apply(template.key, this.templateFormName.trim() || undefined).subscribe({
      next: (result) => {
        this.applying.set(false);
        this.previewFor.set(null);
        this.galleryOpen.set(false);
        this.toast.success(
          `${result.form.name} ready!`,
          `${result.fieldCount} fields, ${result.stageCount} stages, ${result.automationCount} draft automations. ${result.note}`,
        );
        this.router.navigate(['/app/forms', result.form.id]);
      },
      error: () => this.applying.set(false),
    });
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
