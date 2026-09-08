import { ChangeDetectionStrategy, Component, effect, inject, input, numberAttribute, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import {
  AutomationActionType,
  AutomationConditionRequest,
  AutomationRequest,
  AutomationResponse,
  AutomationTrigger,
  ConditionOperator,
  FieldResponse,
  StageResponse,
} from '../../../core/models/crm.model';
import { ToastService } from '../../../core/services/toast.service';
import { ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import { optionsFor } from '../../../shared/dynamic-form/dynamic-form.util';
import { AuthUser } from '../../../core/models/auth.model';
import { UserService } from '../../users/user.service';
import { FieldService } from '../../fields/field.service';
import { StageService } from '../../stages/stage.service';
import { DocumentFile, DocumentService } from '../../documents/document.service';
import { AutomationService } from '../automation.service';

interface ConditionRow {
  uid: number;
  formFieldId: number;
  operator: ConditionOperator;
  value: string;
}

const ACTION_LABELS: Record<AutomationActionType, string> = {
  [AutomationActionType.UPDATE_FIELD]: 'Update a field',
  [AutomationActionType.CHANGE_STAGE]: 'Change the stage',
  [AutomationActionType.ASSIGN_USER]: 'Assign a user',
  [AutomationActionType.SEND_EMAIL]: 'Send an email',
  [AutomationActionType.ADJUST_FIELD]: 'Increase / decrease a field',
  [AutomationActionType.SEND_WHATSAPP]: 'Send a WhatsApp message',
  [AutomationActionType.SEND_DOCUMENT]: 'Send a document (auto-filled)',
};

const TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  [AutomationTrigger.RECORD_CREATED]: 'A record is created',
  [AutomationTrigger.RECORD_UPDATED]: 'A record is updated',
  [AutomationTrigger.STAGE_CHANGED]: 'A record changes stage',
  [AutomationTrigger.STATUS_CHANGED]: 'A record status changes',
};

/**
 * Single-rule editor: one automation = when (trigger + optional stage) →
 * optional conditions → one action. Everything saves with one button; the
 * backend keeps the whole rule on the automation row itself.
 */
@Component({
  selector: 'app-automation-detail',
  standalone: true,
  imports: [RouterLink, FormsModule, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './automation-detail.component.html',
  styleUrl: './automation-detail.component.css',
})
export class AutomationDetailComponent {
  private readonly automationService = inject(AutomationService);
  private readonly fieldService = inject(FieldService);
  private readonly stageService = inject(StageService);
  private readonly documentService = inject(DocumentService);
  private readonly userService = inject(UserService);
  private readonly toast = inject(ToastService);

  readonly id = input.required({ transform: numberAttribute });

  readonly operators = Object.values(ConditionOperator);
  readonly actionTypes = Object.values(AutomationActionType);
  /**
   * Status triggers are no longer offered — the CRM keeps only the stage
   * pipeline. A legacy STATUS_CHANGED rule still renders its saved trigger.
   */
  get triggers(): AutomationTrigger[] {
    const base = Object.values(AutomationTrigger).filter(
      (t) => t !== AutomationTrigger.STATUS_CHANGED,
    );
    return this.trigger === AutomationTrigger.STATUS_CHANGED
      ? [...base, AutomationTrigger.STATUS_CHANGED]
      : base;
  }
  readonly actionLabels = ACTION_LABELS;
  readonly triggerLabels = TRIGGER_LABELS;
  readonly ActionType = AutomationActionType;
  readonly Trigger = AutomationTrigger;

  readonly loading = signal(true);
  readonly failed = signal(false);
  readonly saving = signal(false);

  readonly automation = signal<AutomationResponse | null>(null);
  readonly fields = signal<FieldResponse[]>([]);
  readonly stages = signal<StageResponse[]>([]);
  readonly documents = signal<DocumentFile[]>([]);
  readonly users = signal<AuthUser[]>([]);
  readonly conditions = signal<ConditionRow[]>([]);
  private nextUid = 1;

  // ---- the rule being edited (plain state, saved in one go) ----
  trigger: AutomationTrigger = AutomationTrigger.RECORD_CREATED;
  triggerStageId: number | null = null;
  /** SEND_DOCUMENT: which document, and over which channel. */
  documentId: number | null = null;
  channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';
  actionType: AutomationActionType = AutomationActionType.UPDATE_FIELD;
  actionFieldId: number | null = null;
  actionValue = '';
  emailSubject = '';
  emailMessage = '';
  /** ADJUST_FIELD UI: direction + positive amount → signed actionValue. */
  adjustDirection: 'increase' | 'decrease' = 'increase';
  adjustAmount = '1';

  constructor() {
    effect(() => {
      const id = this.id();
      if (Number.isFinite(id)) this.load(id);
    });
  }

  load(id = this.id()): void {
    this.loading.set(true);
    this.failed.set(false);

    this.automationService.getById(id).subscribe({
      next: (automation) => {
        this.automation.set(automation);

        forkJoin({
          fields: this.fieldService.getByForm(automation.formId).pipe(catchError(() => of([]))),
          stages: this.stageService.getByForm(automation.formId).pipe(catchError(() => of([]))),
          documents: this.documentService.list().pipe(catchError(() => of([]))),
          conditions: this.automationService.getConditions(id).pipe(catchError(() => of([]))),
          users: this.userService.getAll().pipe(catchError(() => of([] as AuthUser[]))),
        }).subscribe({
          next: ({ fields, stages, documents, conditions, users }) => {
            this.fields.set(fields ?? []);
            this.stages.set(stages ?? []);
            this.documents.set(documents ?? []);
            this.users.set(users ?? []);

            this.conditions.set(
              (conditions ?? []).map((c) => ({
                uid: this.nextUid++,
                formFieldId: c.formFieldId,
                operator: c.operator ?? ConditionOperator.EQUALS,
                value: c.value ?? '',
              })),
            );

            this.seedRule(automation);
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

  /** Copies the saved rule into the editable state. */
  private seedRule(automation: AutomationResponse): void {
    this.trigger = automation.trigger;
    this.triggerStageId = automation.triggerStageId ?? null;
    this.documentId = automation.documentId ?? null;
    this.channel = automation.channel === 'EMAIL' ? 'EMAIL' : 'WHATSAPP';
    this.actionType = automation.actionType ?? AutomationActionType.UPDATE_FIELD;
    this.actionFieldId = automation.actionFieldId ?? this.fields()[0]?.id ?? null;
    this.actionValue = automation.actionValue ?? '';
    this.emailSubject = automation.emailSubject ?? '';
    this.emailMessage = automation.emailMessage ?? '';

    // ADJUST_FIELD stores a signed amount — split it back into UI parts.
    if (this.actionType === AutomationActionType.ADJUST_FIELD) {
      const amount = parseFloat(this.actionValue || '1');
      this.adjustDirection = amount < 0 ? 'decrease' : 'increase';
      this.adjustAmount = String(Math.abs(amount || 1));
    }
  }

  onActionTypeChange(): void {
    // Reset the parts the new action does not share, keep the field target.
    this.actionValue = '';
    if (!this.actionFieldId) this.actionFieldId = this.fields()[0]?.id ?? null;
  }

  fieldOf(id: number | null): FieldResponse | undefined {
    return id === null ? undefined : this.fields().find((f) => f.id === id);
  }

  optionsOf(fieldId: number | null): string[] {
    const field = this.fieldOf(fieldId);
    return field ? optionsFor(field) : [];
  }

  /** {fieldKey} chips shown under the email message as an insert helper. */
  fieldKeys(): string[] {
    return this.fields().map((f) => f.fieldKey);
  }

  appendPlaceholder(key: string): void {
    this.emailMessage = `${this.emailMessage}{${key}}`;
  }

  // ------------------------------------------------------------- conditions

  addCondition(): void {
    const first = this.fields()[0];
    if (!first) {
      this.toast.warning('No fields', 'Add fields to this automation’s form first.');
      return;
    }

    this.conditions.update((rows) => [
      ...rows,
      { uid: this.nextUid++, formFieldId: first.id, operator: ConditionOperator.EQUALS, value: '' },
    ]);
  }

  patchCondition(uid: number, patch: Partial<ConditionRow>): void {
    this.conditions.update((rows) => rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  removeCondition(uid: number): void {
    this.conditions.update((rows) => rows.filter((r) => r.uid !== uid));
  }

  // ------------------------------------------------------------------- save

  save(): void {
    const automation = this.automation();
    if (!automation) return;

    const rows = this.conditions();
    if (rows.some((r) => !r.formFieldId || !r.value.trim())) {
      this.toast.warning('Incomplete condition', 'Every condition needs a field and a value.');
      return;
    }

    const actionValue = this.resolveActionValue();
    if (actionValue === null) return; // resolver already toasted

    const request: AutomationRequest = {
      name: automation.name,
      description: automation.description,
      formId: automation.formId,
      trigger: this.trigger,
      triggerStageId:
        this.trigger === AutomationTrigger.STAGE_CHANGED ? this.triggerStageId : null,
      documentId: this.actionType === AutomationActionType.SEND_DOCUMENT ? this.documentId : null,
      channel: this.actionType === AutomationActionType.SEND_DOCUMENT ? this.channel : null,
      actionType: this.actionType,
      actionFieldId: this.needsField() ? this.actionFieldId : null,
      actionValue,
      emailSubject:
        this.actionType === AutomationActionType.SEND_EMAIL ||
        (this.actionType === AutomationActionType.SEND_DOCUMENT && this.channel === 'EMAIL')
          ? this.emailSubject
          : null,
      emailMessage:
        this.actionType === AutomationActionType.SEND_EMAIL ||
        this.actionType === AutomationActionType.SEND_WHATSAPP ||
        this.actionType === AutomationActionType.SEND_DOCUMENT
          ? this.emailMessage
          : null,
    };

    const conditionPayload: AutomationConditionRequest[] = rows.map((r) => ({
      formFieldId: r.formFieldId,
      operator: r.operator,
      value: r.value.trim(),
    }));

    this.saving.set(true);
    /*
     * Sequential on purpose (update THEN conditions): the backend reindexes
     * the rule's knowledge on both calls, and running them in parallel let
     * two delete+add cycles interleave into duplicate/stale index entries.
     * With this order the conditions call is always the last reindex, so the
     * indexed knowledge ends up reflecting the complete saved rule.
     */
    this.automationService
      .update(automation.id, request)
      .pipe(
        switchMap((saved) =>
          this.automationService
            .saveConditions(automation.id, conditionPayload)
            .pipe(map(() => saved)),
        ),
      )
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.automation.set(saved);
          this.toast.success('Rule saved', saved.name);
        },
        error: () => this.saving.set(false),
      });
  }

  /** True when the current action targets a form field. */
  needsField(): boolean {
    return (
      this.actionType === AutomationActionType.UPDATE_FIELD ||
      this.actionType === AutomationActionType.ADJUST_FIELD ||
      this.actionType === AutomationActionType.SEND_EMAIL ||
      this.actionType === AutomationActionType.SEND_WHATSAPP ||
      this.actionType === AutomationActionType.SEND_DOCUMENT
    );
  }

  /** Builds the actionValue for the payload, validating per action type. */
  private resolveActionValue(): string | null {
    switch (this.actionType) {
      case AutomationActionType.UPDATE_FIELD:
        if (!this.actionFieldId) return this.warn('Pick the field to update.');
        if (!this.actionValue.trim()) return this.warn('Enter the new value.');
        return this.actionValue.trim();

      case AutomationActionType.CHANGE_STAGE:
        if (!this.actionValue) return this.warn('Pick the stage to move the record to.');
        return this.actionValue;

      case AutomationActionType.ASSIGN_USER:
        if (!this.actionValue) return this.warn('Pick the user to assign.');
        return this.actionValue;

      case AutomationActionType.SEND_EMAIL:
        if (!this.actionFieldId) return this.warn('Pick the field that holds the recipient email.');
        if (!this.emailMessage.trim()) return this.warn('Write the email message.');
        return '';

      case AutomationActionType.SEND_WHATSAPP:
        if (!this.actionFieldId) return this.warn('Pick the field that holds the phone number.');
        if (!this.emailMessage.trim()) return this.warn('Write the WhatsApp message.');
        return '';

      case AutomationActionType.SEND_DOCUMENT:
        if (!this.documentId) return this.warn('Pick the document to send.');
        if (!this.actionFieldId) {
          return this.warn(
            this.channel === 'EMAIL'
              ? 'Pick the field that holds the recipient email.'
              : 'Pick the field that holds the phone number.',
          );
        }
        return '';

      case AutomationActionType.ADJUST_FIELD: {
        if (!this.actionFieldId) return this.warn('Pick the field to adjust.');
        const amount = Math.abs(parseFloat(this.adjustAmount || '1') || 1);
        return this.adjustDirection === 'decrease' ? `-${amount}` : `${amount}`;
      }
    }
  }

  private warn(message: string): null {
    this.toast.warning('Incomplete rule', message);
    return null;
  }
}
