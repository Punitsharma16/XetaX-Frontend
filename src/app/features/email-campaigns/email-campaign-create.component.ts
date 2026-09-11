import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { FormResponse, FieldResponse } from '../../core/models/crm.model';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { FieldService } from '../fields/field.service';
import { FormService } from '../forms/form.service';
import {
  EmailCampaign,
  EmailCampaignSenderStatus,
  EmailCampaignService,
  EmailCampaignSource,
} from './email-campaign.service';

type Step = 1 | 2 | 3;

/** Placeholder keys every contact carries — the CONTACTS audience has no form fields. */
const CONTACT_KEYS = ['name', 'email', 'phone', 'company'];

/**
 * Three-step email campaign wizard: audience (records with an email field,
 * every contact with an email, or a CSV with an email column) → subject +
 * body with {placeholders} → review. Created as a DRAFT; CSV rows upload
 * right after creation; the user starts it here or from the detail page.
 *
 * Emails leave from the org's own SMTP (Profile → Email) — the wizard refuses
 * to proceed while that is missing rather than failing at send time.
 */
@Component({
  selector: 'app-email-campaign-create',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-campaign-create.component.html',
  styleUrl: './email-campaigns.css',
})
export class EmailCampaignCreateComponent {
  private readonly campaigns = inject(EmailCampaignService);
  private readonly formService = inject(FormService);
  private readonly fieldService = inject(FieldService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly step = signal<Step>(1);
  readonly saving = signal(false);
  readonly sender = signal<EmailCampaignSenderStatus | null>(null);

  /* step 1 — audience */
  sourceType: EmailCampaignSource = 'RECORDS';
  readonly forms = signal<FormResponse[]>([]);
  readonly fields = signal<FieldResponse[]>([]);
  selectedFormId: number | null = null;
  emailFieldKey = '';
  csvFile: File | null = null;
  readonly csvName = signal('');

  /* step 2 — message */
  name = '';
  subject = '';
  body = '';
  scheduleAt = '';

  readonly selectedForm = computed(
    () => this.forms().find((f) => f.id === this.selectedFormId) ?? null,
  );

  /** Keys the user can drop into the subject/body for the chosen audience. */
  readonly placeholderKeys = computed<string[]>(() => {
    if (this.sourceType === 'CONTACTS') return CONTACT_KEYS;
    if (this.sourceType === 'RECORDS') return this.fields().map((f) => f.fieldKey);
    return [];
  });

  constructor() {
    this.formService.getAll().subscribe({ next: (forms) => this.forms.set(forms) });
    this.campaigns.senderStatus().subscribe({
      next: (status) => this.sender.set(status),
      error: () => this.sender.set(null),
    });
  }

  pickSource(source: EmailCampaignSource): void {
    this.sourceType = source;
  }

  onFormPicked(): void {
    this.fields.set([]);
    this.emailFieldKey = '';
    if (this.selectedFormId == null) return;
    this.fieldService.getByForm(this.selectedFormId).subscribe({
      next: (fields) => {
        this.fields.set(fields);
        const emailLike = fields.find(
          (f) =>
            String(f.fieldType) === 'EMAIL' ||
            /e-?mail/i.test(f.label) ||
            /e-?mail/i.test(f.fieldKey),
        );
        if (emailLike) this.emailFieldKey = emailLike.fieldKey;
      },
    });
  }

  onCsvPicked(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0] ?? null;
    this.csvFile = file;
    this.csvName.set(file?.name ?? '');
  }

  next(): void {
    if (this.step() === 1) {
      if (this.sender() && !this.sender()!.configured) {
        this.toast.warning('No sender email', 'Add your email account under Profile → Email (SMTP) first.');
        return;
      }
      if (this.sourceType === 'RECORDS' && (!this.selectedFormId || !this.emailFieldKey)) {
        this.toast.warning('Audience incomplete', 'Pick the form and its email field.');
        return;
      }
      if (this.sourceType === 'CSV' && !this.csvFile) {
        this.toast.warning('Audience incomplete', 'Choose a CSV file with an email column.');
        return;
      }
      this.step.set(2);
      return;
    }
    if (this.step() === 2) {
      if (!this.name.trim()) {
        this.toast.warning('Name missing', 'Give the campaign a name.');
        return;
      }
      if (!this.subject.trim()) {
        this.toast.warning('Subject missing', 'Write the email subject.');
        return;
      }
      if (!this.body.trim()) {
        this.toast.warning('Message missing', 'Write the email body.');
        return;
      }
      this.step.set(3);
    }
  }

  back(): void {
    this.step.update((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  appendPlaceholder(key: string): void {
    this.body = `${this.body}{${key}}`;
  }

  /** Creates the draft (+ CSV upload) and lands on the detail page. */
  createDraft(start: boolean): void {
    this.saving.set(true);
    this.campaigns
      .create({
        name: this.name.trim(),
        subject: this.subject.trim(),
        body: this.body,
        sourceType: this.sourceType,
        formSlug: this.sourceType === 'RECORDS' ? this.selectedForm()?.slug : undefined,
        emailFieldKey: this.sourceType === 'RECORDS' ? this.emailFieldKey : undefined,
      })
      .subscribe({
        next: (campaign) => {
          if (this.sourceType === 'CSV' && this.csvFile) {
            this.campaigns.uploadCsv(campaign.id, this.csvFile).subscribe({
              next: (updated) => this.finish(updated, start),
              error: () => {
                this.saving.set(false);
                this.router.navigate(['/app/email-campaigns', campaign.id]);
              },
            });
          } else {
            this.finish(campaign, start);
          }
        },
        error: () => this.saving.set(false),
      });
  }

  private finish(campaign: EmailCampaign, start: boolean): void {
    if (!start) {
      this.saving.set(false);
      this.toast.success('Draft saved', campaign.name);
      this.router.navigate(['/app/email-campaigns', campaign.id]);
      return;
    }
    const scheduledAt = this.scheduleAt ? new Date(this.scheduleAt).toISOString() : undefined;
    this.campaigns.start(campaign.id, scheduledAt).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(scheduledAt ? 'Campaign scheduled' : 'Campaign started', campaign.name);
        this.router.navigate(['/app/email-campaigns', campaign.id]);
      },
      error: () => {
        this.saving.set(false);
        this.router.navigate(['/app/email-campaigns', campaign.id]);
      },
    });
  }
}
