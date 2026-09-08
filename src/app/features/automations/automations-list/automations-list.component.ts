import { AiPanelComponent } from '../../../shared/components/ai/ai-panel.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  AutomationResponse,
  AutomationTrigger,
  FormResponse,
} from '../../../core/models/crm.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SearchBoxComponent } from '../../../shared/components/search-box/search-box.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { FormService } from '../../forms/form.service';
import { AutomationService } from '../automation.service';

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  [AutomationTrigger.RECORD_CREATED]: 'When a record is created',
  [AutomationTrigger.RECORD_UPDATED]: 'When a record is updated',
  [AutomationTrigger.STAGE_CHANGED]: 'When a record changes stage',
  [AutomationTrigger.STATUS_CHANGED]: 'When a record status changes',
};

@Component({
  selector: 'app-automations-list',
  standalone: true,
  imports: [
    AiPanelComponent,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    SearchBoxComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automations-list.component.html',
  styleUrl: './automations-list.component.css',
})
export class AutomationsListComponent {
  private readonly automationService = inject(AutomationService);
  private readonly formService = inject(FormService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  /** STATUS_CHANGED is legacy-only — not offered for new automations. */
  readonly triggers = Object.values(AutomationTrigger).filter(
    (t) => t !== AutomationTrigger.STATUS_CHANGED,
  );
  readonly triggerLabels = TRIGGER_LABELS;

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly automations = signal<AutomationResponse[]>([]);
  readonly forms = signal<FormResponse[]>([]);
  readonly term = signal('');

  readonly modalOpen = signal(false);
  readonly aiOpen = signal(false);
  readonly aiSuggestions = [
    'Build an automation on one of my forms: ',
    'What automations do I have?',
    'Create a rule: when a record changes stage, send an email',
  ];
  readonly editing = signal<AutomationResponse | null>(null);

  readonly visible = computed(() => {
    const term = this.term().toLowerCase();
    if (!term) return this.automations();
    return this.automations().filter(
      (a) =>
        a.name.toLowerCase().includes(term) ||
        (a.description ?? '').toLowerCase().includes(term) ||
        (a.formName ?? '').toLowerCase().includes(term),
    );
  });

  readonly editorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    formId: [0, [Validators.required, Validators.min(1)]],
    trigger: [AutomationTrigger.RECORD_CREATED, Validators.required],
  });

  constructor() {
    this.load();
    this.formService.getAll().subscribe({
      next: (forms) => this.forms.set(forms ?? []),
      error: () => this.forms.set([]),
    });
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);

    this.automationService.getAll().subscribe({
      next: (list) => {
        this.automations.set(list ?? []);
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

  formName(automation: AutomationResponse): string {
    return (
      automation.formName ||
      this.forms().find((f) => f.id === automation.formId)?.name ||
      `Form #${automation.formId}`
    );
  }

  triggerLabel(trigger: AutomationTrigger): string {
    return TRIGGER_LABELS[trigger] ?? trigger;
  }

  // ---------------------------------------------------------------- editor

  openCreate(): void {
    this.editing.set(null);
    this.editorForm.reset({
      name: '',
      description: '',
      formId: this.forms()[0]?.id ?? 0,
      trigger: AutomationTrigger.RECORD_CREATED,
    });
    this.modalOpen.set(true);
  }

  openEdit(automation: AutomationResponse): void {
    this.editing.set(automation);
    this.editorForm.reset({
      name: automation.name,
      description: automation.description ?? '',
      formId: automation.formId,
      trigger: automation.trigger,
    });
    this.modalOpen.set(true);
  }

  closeEditor(): void {
    if (!this.saving()) this.modalOpen.set(false);
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
      ? this.automationService.update(current.id, payload)
      : this.automationService.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Automation updated' : 'Automation created', payload.name);
        this.load();
      },
      error: () => this.saving.set(false),
    });
  }

  remove(automation: AutomationResponse): void {
    this.confirm
      .ask({
        title: `Delete "${automation.name}"?`,
        message: 'Its conditions and actions will be removed with it.',
        confirmText: 'Delete automation',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.automationService.delete(automation.id).subscribe({
          next: () => {
            this.toast.success('Automation deleted', automation.name);
            this.load();
          },
        });
      });
  }
}
