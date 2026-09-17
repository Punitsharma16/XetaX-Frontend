import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, KeyValuePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FieldResponse } from '../../../core/models/crm.model';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
} from '../../../shared/components/state/state-views.component';
import { FormResponse } from '../../../core/models/crm.model';
import { FieldService } from '../../fields/field.service';
import { FormService } from '../../forms/form.service';
import { FlowPreviewComponent } from '../flow-preview.component';
import { WhatsAppNavComponent } from '../whatsapp-nav.component';
import { FlowSubmission, WhatsAppFlow, WhatsAppService } from '../whatsapp.service';

/**
 * WhatsApp Flows — the forms customers fill without leaving the chat.
 *
 * A Flow is built from one of your CRM forms, so the questions and the fields
 * they land in are the same thing. Publishing freezes it at Meta; after that
 * it can be sent, and every submission shows up here with the record it
 * created.
 */
@Component({
  selector: 'app-whatsapp-flows',
  standalone: true,
  imports: [
    FlowPreviewComponent,
    DatePipe,
    KeyValuePipe,
    TitleCasePipe,
    FormsModule,
    PageHeaderComponent,
    ModalComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    WhatsAppNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './flows.component.html',
  styleUrl: './flows.component.css',
})
export class WhatsAppFlowsComponent {
  private readonly whatsapp = inject(WhatsAppService);
  private readonly forms = inject(FormService);
  private readonly fields = inject(FieldService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly flows = signal<WhatsAppFlow[]>([]);
  readonly crmForms = signal<FormResponse[]>([]);
  readonly categories = signal<string[]>([]);
  readonly busy = signal(false);

  readonly published = computed(() => this.flows().filter((f) => f.status === 'PUBLISHED'));

  /* ------------------------------------------------------- create modal */

  readonly createOpen = signal(false);
  draftName = '';
  draftCategory = 'LEAD_GENERATION';
  draftFormId: number | null = null;
  draftJson = '';
  /** Paste your own screens instead of generating them from a form. */
  readonly advanced = signal(false);

  /** The chosen form's fields, so the screens can be drawn before anything is created. */
  readonly previewFields = signal<FieldResponse[]>([]);
  readonly previewFormName = signal('');

  /** Reloads the preview whenever the form behind the Flow changes. */
  loadPreviewFields(): void {
    const formId = this.draftFormId;
    if (formId == null) {
      this.previewFields.set([]);
      this.previewFormName.set('');
      return;
    }
    this.previewFormName.set(this.crmForms().find((form) => form.id === formId)?.name ?? '');
    this.fields.getByForm(formId).subscribe({
      next: (fields) => this.previewFields.set(fields),
      error: () => this.previewFields.set([]),
    });
  }
  draftPublish = true;

  /* --------------------------------------------------------- send modal */

  readonly sendOpen = signal(false);
  sendFlow: WhatsAppFlow | null = null;
  sendPhone = '';
  sendBody = 'Please fill this in so we can help you faster.';
  sendCta = 'Open form';

  /* --------------------------------------------------------- responses */

  readonly responsesOpen = signal(false);
  readonly responses = signal<FlowSubmission[]>([]);
  readonly responsesFor = signal<WhatsAppFlow | null>(null);
  readonly responsesLoading = signal(false);

  constructor() {
    this.reload();
    this.forms.getAll().subscribe({
      next: (list) => this.crmForms.set(list ?? []),
      error: () => this.crmForms.set([]),
    });
    this.whatsapp.flowOptions().subscribe({
      next: (options) => this.categories.set(options.categories ?? []),
      error: () => this.categories.set(['LEAD_GENERATION']),
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.whatsapp.flows().subscribe({
      next: (list) => {
        this.flows.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  badge(status: string): string {
    switch (status) {
      case 'PUBLISHED':
        return 'text-bg-success';
      case 'DRAFT':
        return 'text-bg-secondary';
      case 'DEPRECATED':
        return 'text-bg-dark';
      default:
        return 'text-bg-warning';
    }
  }

  formName(formId: number | null): string {
    if (formId == null) return 'Not linked to a form';
    return this.crmForms().find((f) => f.id === formId)?.name ?? `Form #${formId}`;
  }

  /* ------------------------------------------------------------ create */

  openCreate(): void {
    this.draftName = '';
    this.draftCategory = 'LEAD_GENERATION';
    this.draftFormId = this.crmForms()[0]?.id ?? null;
    this.draftJson = '';
    this.advanced.set(false);
    this.loadPreviewFields();
    this.draftPublish = true;
    this.createOpen.set(true);
  }

  create(): void {
    if (!this.draftName.trim()) {
      this.toast.warning('Name missing', 'Give the Flow a name.');
      return;
    }
    if (!this.advanced() && this.draftFormId == null) {
      this.toast.warning('Pick a form', 'The Flow asks for that form’s fields.');
      return;
    }
    this.busy.set(true);
    this.whatsapp
      .createFlow({
        name: this.draftName.trim(),
        categories: [this.draftCategory],
        formId: this.draftFormId,
        flowJson: this.advanced() ? this.draftJson : undefined,
        publish: this.draftPublish,
      })
      .subscribe({
        next: (flow) => {
          this.busy.set(false);
          this.createOpen.set(false);
          if (flow.validationErrors?.length) {
            this.toast.warning('Meta found problems', flow.validationErrors.join('; '));
          } else {
            this.toast.success(
              flow.status === 'PUBLISHED' ? 'Flow published' : 'Flow saved as a draft',
              flow.name,
            );
          }
          this.reload();
        },
        error: () => this.busy.set(false),
      });
  }

  publish(flow: WhatsAppFlow): void {
    this.busy.set(true);
    this.whatsapp.publishFlow(flow.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.toast.success('Published', `${flow.name} can now be sent.`);
        this.reload();
      },
      error: () => this.busy.set(false),
    });
  }

  retire(flow: WhatsAppFlow): void {
    this.confirm
      .ask({
        title: 'Retire this Flow?',
        message: `${flow.name} can no longer be sent after this. Submissions already received are kept.`,
        confirmText: 'Retire',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.whatsapp.deprecateFlow(flow.id).subscribe({
          next: () => {
            this.toast.success('Retired', flow.name);
            this.reload();
          },
        });
      });
  }

  remove(flow: WhatsAppFlow): void {
    this.confirm.confirmDelete(`Flow '${flow.name}'`).subscribe((ok) => {
      if (!ok) return;
      this.whatsapp.deleteFlow(flow.id).subscribe({
        next: () => {
          this.toast.success('Deleted', flow.name);
          this.reload();
        },
      });
    });
  }

  preview(flow: WhatsAppFlow): void {
    this.whatsapp.flowPreview(flow.id).subscribe({
      next: ({ url }) => {
        if (url) window.open(url, '_blank', 'noopener');
        else this.toast.warning('No preview', 'Meta could not build a preview for this Flow.');
      },
    });
  }

  /* -------------------------------------------------------------- send */

  openSend(flow: WhatsAppFlow): void {
    this.sendFlow = flow;
    this.sendPhone = '';
    this.sendOpen.set(true);
  }

  send(): void {
    const flow = this.sendFlow;
    if (!flow) return;
    if (!this.sendPhone.trim()) {
      this.toast.warning('Number missing', 'Enter the customer’s WhatsApp number.');
      return;
    }
    this.busy.set(true);
    this.whatsapp
      .sendFlow({
        flowId: flow.id,
        phone: this.sendPhone.trim(),
        bodyText: this.sendBody.trim(),
        ctaText: this.sendCta.trim() || 'Open',
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.sendOpen.set(false);
          this.toast.success('Flow sent', `${flow.name} is on its way.`);
        },
        error: () => this.busy.set(false),
      });
  }

  /* --------------------------------------------------------- responses */

  /** The submission whose record is being retried. */
  readonly retrying = signal<number | null>(null);

  /** A submission with answers whose record failed — worth another try. */
  canRetry(row: FlowSubmission): boolean {
    return !row.recordId && row.flowId != null
      && Object.keys(row.answers ?? {}).length > 0
      && this.flows().some((flow) => flow.id === row.flowId && flow.formId != null);
  }

  retryRecord(row: FlowSubmission): void {
    this.retrying.set(row.id);
    this.whatsapp.retryFlowRecord(row.id).subscribe({
      next: (saved) => {
        this.retrying.set(null);
        this.responses.update((rows) => rows.map((r) => (r.id === saved.id ? saved : r)));
        if (saved.recordId) {
          this.toast.success('Record created', 'The submission is now a record in the form.');
        } else {
          this.toast.warning('Still no record', saved.note ?? 'The record could not be created.');
        }
      },
      error: () => this.retrying.set(null),
    });
  }

  openResponses(flow: WhatsAppFlow | null): void {
    this.responsesFor.set(flow);
    this.responsesOpen.set(true);
    this.responsesLoading.set(true);
    this.whatsapp.flowResponses(flow?.id ?? null, 0, 50).subscribe({
      next: (page) => {
        this.responses.set(page.content ?? []);
        this.responsesLoading.set(false);
      },
      error: () => {
        this.responses.set([]);
        this.responsesLoading.set(false);
      },
    });
  }
}
