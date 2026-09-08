import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import {
  FieldResponse,
  FormResponse,
  RecordResponse,
  StageResponse,
} from '../../../core/models/crm.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import { DynamicFieldComponent } from '../../../shared/dynamic-form/dynamic-field.component';
import {
  buildFormGroup,
  toRecordData,
  visibleFields,
} from '../../../shared/dynamic-form/dynamic-form.util';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { CommPanelComponent } from '../../outreach/comm-panel.component';
import { TaskPanelComponent } from '../../tasks/task-panel.component';
import { FieldService } from '../../fields/field.service';
import { FormService } from '../../forms/form.service';
import { StageService } from '../../stages/stage.service';
import { RecordActivityEntry, RecordService } from '../record.service';
import { DeskService, DeskSession } from '../../desk/desk.service';

/**
 * Full-page record editor — replaces the old edit modal so the page has room
 * to grow (activity, related data, …). The pipeline strip on top shows every
 * stage; the record's current stage pulses and clicking another stage moves
 * the record (firing STAGE_CHANGED automations server-side).
 */
@Component({
  selector: 'app-record-detail',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    DynamicFieldComponent,
    ErrorStateComponent,
    CommPanelComponent,
    TaskPanelComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './record-detail.component.html',
  styleUrl: './record-detail.component.css',
})
export class RecordDetailComponent {
  private readonly recordService = inject(RecordService);
  private readonly formService = inject(FormService);
  private readonly fieldService = inject(FieldService);
  private readonly stageService = inject(StageService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly desk = inject(DeskService);

  readonly slug = input.required<string>();
  readonly recordId = input.required<string>();

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly saving = signal(false);
  readonly movingStage = signal(false);

  readonly form = signal<FormResponse | null>(null);
  readonly fields = signal<FieldResponse[]>([]);
  readonly stages = signal<StageResponse[]>([]);
  readonly record = signal<RecordResponse | null>(null);

  /** Record timeline — newest first, loaded with the record. */
  readonly activity = signal<RecordActivityEntry[]>([]);

  /** Latest bot conversation for this record (summary + pending AI suggestion). */
  readonly aiSession = signal<DeskSession | null>(null);
  readonly applyingSuggestion = signal(false);

  readonly editorGroup = signal<FormGroup>(new FormGroup({}));

  readonly editorFields = computed(() => visibleFields(this.fields()));

  /** Phone/email for the communication panel — first matching field's value. */
  readonly commPhone = computed(() => {
    const record = this.record();
    if (!record) return '';
    const field = this.fields().find(
      (f) => f.fieldType === 'PHONE' || /phone|mobile|whatsapp/i.test(f.fieldKey),
    );
    return field ? String(record.data?.[field.fieldKey] ?? '') : '';
  });

  readonly commEmail = computed(() => {
    const record = this.record();
    if (!record) return '';
    const field = this.fields().find(
      (f) => f.fieldType === 'EMAIL' || /email/i.test(f.fieldKey),
    );
    return field ? String(record.data?.[field.fieldKey] ?? '') : '';
  });

  /** Hands off to the Meetings page with guest info prefilled from this record. */
  startMeeting(): void {
    const record = this.record();
    if (!record) return;
    const fields = this.fields();
    const phoneField = fields.find(
      (f) => f.fieldType === 'PHONE' || /phone|mobile|contact/i.test(f.fieldKey),
    );
    const emailField = fields.find(
      (f) => f.fieldType === 'EMAIL' || /email/i.test(f.fieldKey),
    );
    const nameField = fields.find((f) => /name/i.test(f.fieldKey));
    this.router.navigate(['/app/meetings'], {
      queryParams: {
        new: 1,
        recordId: record.id,
        title: `Meeting — ${this.recordTitle()}`,
        name: nameField ? (record.data?.[nameField.fieldKey] ?? '') : '',
        phone: phoneField ? (record.data?.[phoneField.fieldKey] ?? '') : '',
        email: emailField ? (record.data?.[emailField.fieldKey] ?? '') : '',
      },
    });
  }

  constructor() {
    effect(() => {
      const slug = this.slug();
      const id = this.recordId();
      if (slug && id) this.load(slug, id);
    });
  }

  private load(slug: string, id: string): void {
    this.loadAi(id);
    this.loading.set(true);
    this.failed.set(false);

    this.recordService.activity(id).subscribe({
      next: (items) => this.activity.set(items ?? []),
      error: () => this.activity.set([]),
    });

    this.formService.getAll().subscribe({
      next: (forms) => {
        const form = (forms ?? []).find((f) => f.slug === slug) ?? null;
        this.form.set(form);

        if (!form) {
          this.failed.set(true);
          this.loading.set(false);
          return;
        }

        forkJoin({
          fields: this.fieldService.getByForm(form.id).pipe(catchError(() => of([]))),
          stages: this.stageService.getByForm(form.id).pipe(catchError(() => of([]))),
          record: this.recordService.getById(id),
        }).subscribe({
          next: ({ fields, stages, record }) => {
            this.fields.set(fields ?? []);
            this.stages.set(stages ?? []);
            this.record.set(record);
            this.editorGroup.set(buildFormGroup(fields ?? [], record.data ?? {}));
            this.loading.set(false);
          },
          error: () => {
            this.failed.set(true);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  /** First text-ish value doubles as the page title so the header feels alive. */
  recordTitle(): string {
    const record = this.record();
    if (!record) return 'Record';
    const first = this.editorFields()[0];
    const value = first ? record.data?.[first.fieldKey] : null;
    return value ? String(value) : `Record ${record.id.slice(-6)}`;
  }

  // ----------------------------------------------------------------- stages

  isCurrent(stage: StageResponse): boolean {
    return this.record()?.stageId === stage.id;
  }

  moveToStage(stage: StageResponse): void {
    const record = this.record();
    if (!record || this.isCurrent(stage) || this.movingStage()) return;

    this.movingStage.set(true);
    this.recordService.changeStage(record.id, stage.id).subscribe({
      next: () => {
        this.movingStage.set(false);
        this.toast.success('Stage updated', `Moved to ${stage.name}`);
        // Automations may have rewritten fields — reload the whole record.
        this.load(this.slug(), this.recordId());
      },
      error: () => this.movingStage.set(false),
    });
  }

  // ------------------------------------------------------------------- save

  save(): void {
    const group = this.editorGroup();
    if (group.invalid) {
      group.markAllAsTouched();

      const invalid = this.editorFields()
        .filter((f) => group.get(f.fieldKey)?.invalid)
        .map((f) => f.label);

      this.toast.warning(
        'Check the form',
        invalid.length
          ? `Fix: ${invalid.slice(0, 4).join(', ')}${invalid.length > 4 ? ` and ${invalid.length - 4} more` : ''}.`
          : 'Some fields still need attention.',
      );
      return;
    }

    const record = this.record();
    if (!record) return;

    const data = toRecordData(this.fields(), group.getRawValue());
    this.saving.set(true);

    this.recordService.update(this.slug(), record.id, data).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Record updated');
        this.backToList();
      },
      error: () => this.saving.set(false),
    });
  }

  backToList(): void {
    this.router.navigate(['/app/records', this.slug()]);
  }

  /** Invoices are allowed only once the record parks in a final stage. */
  onFinalStage(): boolean {
    const record = this.record();
    if (!record) return false;
    const stage = this.stages().find((s) => s.id === record.stageId);
    return !!stage?.isFinal;
  }

  activityIcon(type: string): string {
    switch (type) {
      case 'AI_SUMMARY': return 'bi-stars';
      case 'AI_SUGGESTION': return 'bi-lightbulb';
      case 'CREATED': return 'bi-plus-circle';
      case 'STAGE_CHANGED': return 'bi-signpost-split';
      case 'STATUS_CHANGED': return 'bi-flag';
      case 'ASSIGNED': return 'bi-person-check';
      case 'DOCUMENT_SENT': return 'bi-file-earmark-arrow-up';
      case 'WHATSAPP_SENT': return 'bi-whatsapp';
      default: return 'bi-pencil';
    }
  }

  /* ------------------------------------------------------------ AI conversation */

  private loadAi(id: string): void {
    this.desk.recordAi(id).subscribe({
      next: (res) => this.aiSession.set(res.session),
      error: () => this.aiSession.set(null),
    });
  }

  applyAiSuggestion(): void {
    const session = this.aiSession();
    if (!session) return;
    this.applyingSuggestion.set(true);
    this.desk.applySuggestion(session.id).subscribe({
      next: () => {
        this.applyingSuggestion.set(false);
        this.toast.success('Applied', 'The record moved as the AI suggested.');
        this.load(this.slug(), this.recordId());
      },
      error: () => this.applyingSuggestion.set(false),
    });
  }

  dismissAiSuggestion(): void {
    const session = this.aiSession();
    if (!session) return;
    this.desk.dismissSuggestion(session.id).subscribe({ next: () => this.loadAi(this.recordId()) });
  }
}
