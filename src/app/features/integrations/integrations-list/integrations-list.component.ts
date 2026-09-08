import { AiPanelComponent } from '../../../shared/components/ai/ai-panel.component';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import {
  FieldResponse,
  FormResponse,
  IntegrationResponse,
  IntegrationStatus,
  IntegrationType,
  MappingItemRequest,
  MappingItemResponse,
} from '../../../core/models/crm.model';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { FieldService } from '../../fields/field.service';
import { FormService } from '../../forms/form.service';
import { IntegrationService } from '../integration.service';

const TYPE_META: Record<IntegrationType, { label: string; icon: string }> = {
  [IntegrationType.GENERIC_WEBHOOK]: { label: 'Generic webhook', icon: 'bi-broadcast' },
  [IntegrationType.REST_API]: { label: 'REST API', icon: 'bi-hdd-network' },
  [IntegrationType.WHATSAPP]: { label: 'WhatsApp', icon: 'bi-whatsapp' },
  [IntegrationType.FACEBOOK]: { label: 'Facebook', icon: 'bi-facebook' },
  [IntegrationType.INSTAGRAM]: { label: 'Instagram', icon: 'bi-instagram' },
  [IntegrationType.SHOPIFY]: { label: 'Shopify', icon: 'bi-bag' },
  [IntegrationType.GOOGLE_SHEETS]: { label: 'Google Sheets', icon: 'bi-file-earmark-spreadsheet' },
};

interface MappingRow {
  uid: number;
  sourceField: string;
  formFieldId: number | null;
}

@Component({
  selector: 'app-integrations-list',
  standalone: true,
  imports: [
    AiPanelComponent,
    ReactiveFormsModule,
    RouterLink,
    PageHeaderComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './integrations-list.component.html',
  styleUrl: './integrations-list.component.css',
})
export class IntegrationsListComponent {
  private readonly integrationService = inject(IntegrationService);
  private readonly formService = inject(FormService);
  private readonly fieldService = inject(FieldService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly types = Object.values(IntegrationType);
  readonly typeMeta = TYPE_META;
  readonly Status = IntegrationStatus;

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly integrations = signal<IntegrationResponse[]>([]);
  readonly forms = signal<FormResponse[]>([]);

  // ---- create / edit ----
  readonly modalOpen = signal(false);
  readonly aiOpen = signal(false);
  readonly aiSuggestions = [
    'What webhook integrations do I have and which forms do they feed?',
    'How do I connect an external website form to my CRM?',
  ];
  readonly editing = signal<IntegrationResponse | null>(null);

  // ---- mapping ----
  readonly mappingOpen = signal(false);
  readonly mappingFor = signal<IntegrationResponse | null>(null);
  readonly mappingFields = signal<FieldResponse[]>([]);
  readonly mappingRows = signal<MappingRow[]>([]);
  readonly mappingLoading = signal(false);
  readonly mappingSaving = signal(false);
  private nextUid = 1;

  // ---- webhook tester ----
  readonly testOpen = signal(false);
  readonly testFor = signal<IntegrationResponse | null>(null);
  readonly testFields = signal<FieldResponse[]>([]);
  readonly testMappings = signal<MappingItemResponse[]>([]);

  readonly revealed = signal<Set<number>>(new Set());

  readonly editorForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: [''],
    formId: [0, [Validators.required, Validators.min(1)]],
    type: [IntegrationType.GENERIC_WEBHOOK, Validators.required],
  });

  readonly canCreate = computed(() => this.forms().length > 0);
  readonly pendingCount = computed(
    () => this.integrations().filter((i) => i.status === IntegrationStatus.PENDING).length,
  );

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

    this.integrationService.getAll().subscribe({
      next: (list) => {
        this.integrations.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  meta(type: IntegrationType) {
    return TYPE_META[type] ?? { label: type, icon: 'bi-plug' };
  }

  formName(integration: IntegrationResponse): string {
    return (
      integration.formName ||
      this.forms().find((f) => f.id === integration.formId)?.name ||
      (integration.formId ? `Form #${integration.formId}` : '—')
    );
  }

  /** Absolute ingest URL the third party should POST to. */
  webhookUrl(integration: IntegrationResponse): string {
    return this.integrationService.webhookUrl(integration);
  }

  // ------------------------------------------------------------------ keys

  isRevealed(id: number): boolean {
    return this.revealed().has(id);
  }

  toggleReveal(id: number): void {
    this.revealed.update((set) => {
      const next = new Set(set);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  mask(value: string): string {
    if (!value) return '—';
    return value.length <= 8 ? '••••••••' : `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
  }

  copy(value: string, label: string): void {
    if (!value) return;
    navigator.clipboard
      ?.writeText(value)
      .then(() => this.toast.success(`${label} copied`))
      .catch(() => this.toast.error('Copy failed', 'Your browser blocked clipboard access.'));
  }

  // ---------------------------------------------------------------- editor

  openCreate(): void {
    this.editing.set(null);
    this.editorForm.reset({
      name: '',
      description: '',
      formId: this.forms()[0]?.id ?? 0,
      type: IntegrationType.GENERIC_WEBHOOK,
    });
    this.modalOpen.set(true);
  }

  openEdit(integration: IntegrationResponse): void {
    this.editing.set(integration);
    this.editorForm.reset({
      name: integration.name,
      description: integration.description ?? '',
      // formId now comes back from the API, so an edit no longer risks
      // reassigning the integration to a different form.
      formId: integration.formId ?? 0,
      type: integration.type,
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
      ? this.integrationService.update(current.id, payload)
      : this.integrationService.create(payload);

    request$.subscribe({
      next: (created) => {
        this.saving.set(false);
        this.modalOpen.set(false);
        this.toast.success(current ? 'Integration updated' : 'Integration created', payload.name);
        this.load();

        // A new integration stays PENDING until its mapping exists, so take the
        // user straight there rather than leaving a dead endpoint behind.
        if (!current && created) {
          this.openMapping(created);
        }
      },
      error: () => this.saving.set(false),
    });
  }

  remove(integration: IntegrationResponse): void {
    this.confirm
      .ask({
        title: `Delete "${integration.name}"?`,
        message: 'Its endpoint stops accepting payloads immediately.',
        confirmText: 'Delete integration',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.integrationService.delete(integration.id).subscribe({
          next: () => {
            this.toast.success('Integration deleted', integration.name);
            this.load();
          },
        });
      });
  }

  // --------------------------------------------------------------- mapping

  /**
   * Field mapping.
   *
   * Only the integration's own form is valid — saveMappings rejects any
   * formFieldId outside it. Existing mappings are read back so reopening the
   * panel shows what is stored; a save still replaces the whole set.
   */
  openMapping(integration: IntegrationResponse): void {
    this.mappingFor.set(integration);
    this.mappingRows.set([]);
    this.mappingFields.set([]);
    this.mappingOpen.set(true);

    if (!integration.formId) {
      this.toast.warning('Unknown target form', 'This integration has no form attached.');
      return;
    }

    this.mappingLoading.set(true);
    this.fieldService.getByForm(integration.formId).subscribe({
      next: (fields) => {
        this.mappingFields.set(fields ?? []);

        this.integrationService.getMappings(integration.id).subscribe({
          next: (existing) => {
            this.mappingLoading.set(false);

            // Seed a row per field, prefilled with the stored source key so the
            // panel reflects reality instead of always starting blank.
            const byFieldId = new Map(
              (existing ?? []).map((m) => [m.formFieldId, m.sourceField]),
            );
            this.mappingRows.set(
              (fields ?? []).map((f) => ({
                uid: this.nextUid++,
                sourceField: byFieldId.get(f.id) ?? '',
                formFieldId: f.id,
              })),
            );
          },
          error: () => {
            this.mappingLoading.set(false);
            this.mappingRows.set(
              (fields ?? []).map((f) => ({
                uid: this.nextUid++,
                sourceField: '',
                formFieldId: f.id,
              })),
            );
          },
        });

        if (!fields?.length) {
          this.toast.warning('No fields', 'Add fields to this form before mapping.');
        }
      },
      error: () => {
        this.mappingFields.set([]);
        this.mappingLoading.set(false);
      },
    });
  }

  closeMapping(): void {
    if (!this.mappingSaving()) this.mappingOpen.set(false);
  }

  addMappingRow(): void {
    this.mappingRows.update((rows) => [
      ...rows,
      { uid: this.nextUid++, sourceField: '', formFieldId: this.mappingFields()[0]?.id ?? null },
    ]);
  }

  patchMappingRow(uid: number, patch: Partial<MappingRow>): void {
    this.mappingRows.update((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  removeMappingRow(uid: number): void {
    this.mappingRows.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  saveMapping(): void {
    const integration = this.mappingFor();
    if (!integration) return;

    const rows = this.mappingRows().filter((r) => r.sourceField.trim() && r.formFieldId);
    if (!rows.length) {
      this.toast.warning('Nothing to save', 'Fill in at least one source key.');
      return;
    }

    // The backend lowercases both the stored key and the incoming payload keys,
    // so matching is case-insensitive — normalise here to show what is stored.
    const mappings: MappingItemRequest[] = rows.map((r) => ({
      sourceField: r.sourceField.trim().toLowerCase(),
      formFieldId: r.formFieldId as number,
    }));

    this.mappingSaving.set(true);
    this.integrationService.saveMappings(integration.id, { mappings }).subscribe({
      next: () => {
        this.mappingSaving.set(false);
        this.mappingOpen.set(false);
        this.toast.success(
          'Mapping saved',
          `${mappings.length} field(s) mapped — integration is now active.`,
        );
        this.load();
      },
      error: () => this.mappingSaving.set(false),
    });
  }

  // --------------------------------------------------------- webhook tester

  openTest(integration: IntegrationResponse): void {
    this.testFor.set(integration);
    this.testFields.set([]);
    this.testMappings.set([]);
    this.testOpen.set(true);

    if (integration.formId) {
      this.fieldService.getByForm(integration.formId).subscribe({
        next: (fields) => this.testFields.set(fields ?? []),
        error: () => this.testFields.set([]),
      });
    }

    // The payload must use the MAPPED source keys — the ingest endpoint drops
    // anything else, so a fieldKey-based sample would 400 on required fields.
    this.integrationService.getMappings(integration.id).subscribe({
      next: (mappings) => this.testMappings.set(mappings ?? []),
      error: () => this.testMappings.set([]),
    });
  }

  closeTest(): void {
    this.testOpen.set(false);
  }

  /** Ready-to-run curl for the integration's public endpoint. */
  curlSnippet(integration: IntegrationResponse): string {
    const body = this.samplePayload();
    return [
      `curl -X POST '${this.webhookUrl(integration)}' \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -H 'X-API-KEY: ${integration.apiKey}' \\`,
      `  -d '${body}'`,
    ].join('\n');
  }

  /**
   * Sample body keyed by the integration's stored SOURCE keys — the only keys
   * the ingest endpoint accepts. Field keys are just a fallback for a pending
   * integration that has no mapping saved yet.
   */
  samplePayload(): string {
    const mappings = this.testMappings();
    if (mappings.length) {
      const sample: Record<string, string> = {};
      for (const mapping of mappings.slice(0, 8)) {
        sample[mapping.sourceField] =
          `sample ${(mapping.fieldLabel || mapping.sourceField).toLowerCase()}`;
      }
      return JSON.stringify(sample);
    }

    const fields = this.testFields();
    if (!fields.length) return '{ "your_source_key": "value" }';

    const sample: Record<string, string> = {};
    for (const field of fields.slice(0, 5)) {
      sample[field.fieldKey] = `sample ${field.label.toLowerCase()}`;
    }
    return JSON.stringify(sample);
  }

  copyCurl(integration: IntegrationResponse): void {
    this.copy(this.curlSnippet(integration), 'curl command');
  }
}
