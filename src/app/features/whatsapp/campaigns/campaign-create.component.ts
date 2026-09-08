import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { FormResponse, FieldResponse } from '../../../core/models/crm.model';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { FieldService } from '../../fields/field.service';
import { FormService } from '../../forms/form.service';
import {
  Campaign,
  WhatsAppService,
  WhatsAppTemplate,
} from '../whatsapp.service';
import { WhatsAppNavComponent } from '../whatsapp-nav.component';

type Step = 1 | 2 | 3;

/**
 * Three-step campaign wizard: audience (records with a phone field, or a
 * CSV with a phone column) → message ({placeholders} or approved template)
 * → review. The campaign is created as a DRAFT; CSV rows upload right after
 * creation and the user starts the campaign from the review step or later
 * from the detail page.
 */
@Component({
  selector: 'app-whatsapp-campaign-create',
  standalone: true,
  imports: [FormsModule, RouterLink, PageHeaderComponent, WhatsAppNavComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaign-create.component.html',
  styleUrl: './campaign-create.component.css',
})
export class WhatsAppCampaignCreateComponent {
  private readonly whatsapp = inject(WhatsAppService);
  private readonly formService = inject(FormService);
  private readonly fieldService = inject(FieldService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly step = signal<Step>(1);
  readonly saving = signal(false);

  /* step 1 — audience */
  sourceType: 'RECORDS' | 'CSV' = 'RECORDS';
  readonly forms = signal<FormResponse[]>([]);
  readonly fields = signal<FieldResponse[]>([]);
  selectedFormId: number | null = null;
  phoneFieldKey = '';
  csvFile: File | null = null;
  csvName = signal('');

  /* step 2 — message */
  name = '';
  messageMode: 'text' | 'template' = 'text';
  messageText = '';
  readonly templates = signal<WhatsAppTemplate[]>([]);
  templateName = '';
  templateLanguage = '';
  /** Payload key mapped to each {{n}} variable of the chosen template. */
  templateParams: string[] = [];
  scheduleAt = '';

  readonly selectedForm = computed(() =>
    this.forms().find((f) => f.id === this.selectedFormId) ?? null,
  );

  readonly placeholderKeys = computed(() => this.fields().map((f) => f.fieldKey));

  /** {{n}} variable count of the selected template's BODY component. */
  readonly templateVarCount = computed(() => {
    const template = this.templates().find((t) => t.name === this.templateName);
    if (!template?.componentsJson) return 0;
    let max = 0;
    try {
      const components = JSON.parse(template.componentsJson) as {
        type?: string;
        text?: string;
      }[];
      for (const component of components) {
        if ((component.type || '').toUpperCase() !== 'BODY' || !component.text) continue;
        for (const match of component.text.matchAll(/\{\{(\d+)}}/g)) {
          max = Math.max(max, Number(match[1]));
        }
      }
    } catch {
      /* unparseable components — treat as no variables */
    }
    return max;
  });

  onTemplatePicked(): void {
    this.templateParams = Array(this.templateVarCount()).fill('');
  }

  constructor() {
    this.formService.getAll().subscribe({ next: (forms) => this.forms.set(forms) });
    this.whatsapp.getTemplates().subscribe({
      next: (templates) =>
        this.templates.set(templates.filter((t) => t.status === 'APPROVED')),
      error: () => this.templates.set([]),
    });
  }

  onFormPicked(): void {
    this.fields.set([]);
    this.phoneFieldKey = '';
    if (this.selectedFormId == null) return;
    this.fieldService.getByForm(this.selectedFormId).subscribe({
      next: (fields) => {
        this.fields.set(fields);
        const phoneLike = fields.find(
          (f) =>
            f.fieldType === 'PHONE' ||
            /phone|mobile|contact/i.test(f.label) ||
            /phone|mobile|contact/i.test(f.fieldKey),
        );
        if (phoneLike) this.phoneFieldKey = phoneLike.fieldKey;
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
      if (this.sourceType === 'RECORDS') {
        if (!this.selectedFormId || !this.phoneFieldKey) {
          this.toast.warning('Audience incomplete', 'Pick the form and its phone field.');
          return;
        }
      } else if (!this.csvFile) {
        this.toast.warning('Audience incomplete', 'Choose a CSV file with a phone column.');
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
      if (this.messageMode === 'text' && !this.messageText.trim()) {
        this.toast.warning('Message missing', 'Write the message text.');
        return;
      }
      if (this.messageMode === 'template' && !this.templateName) {
        this.toast.warning('Template missing', 'Pick an approved template.');
        return;
      }
      if (this.messageMode === 'template' && this.templateVarCount() > 0
          && this.templateParams.some((key) => !key.trim())) {
        this.toast.warning(
          'Variables unmapped',
          'Map every template variable to a field/column so each customer gets their own values.',
        );
        return;
      }
      this.step.set(3);
    }
  }

  back(): void {
    this.step.update((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  appendPlaceholder(key: string): void {
    this.messageText = `${this.messageText}{${key}}`;
  }

  /** Creates the draft (+ CSV upload) and lands on the detail page. */
  createDraft(start: boolean): void {
    this.saving.set(true);
    const template = this.templates().find((t) => t.name === this.templateName);
    this.whatsapp
      .createCampaign({
        name: this.name.trim(),
        sourceType: this.sourceType,
        messageTemplate: this.messageMode === 'text' ? this.messageText : undefined,
        templateName: this.messageMode === 'template' ? this.templateName : undefined,
        templateLanguage: this.messageMode === 'template' ? template?.language : undefined,
        formSlug: this.sourceType === 'RECORDS' ? this.selectedForm()?.slug : undefined,
        phoneFieldKey: this.sourceType === 'RECORDS' ? this.phoneFieldKey : undefined,
        templateParams:
          this.messageMode === 'template' && this.templateParams.length
            ? this.templateParams.map((key) => key.trim())
            : undefined,
      })
      .subscribe({
        next: (campaign) => {
          if (this.sourceType === 'CSV' && this.csvFile) {
            this.whatsapp.uploadCampaignCsv(campaign.id, this.csvFile).subscribe({
              next: (updated) => this.finish(updated, start),
              error: () => {
                this.saving.set(false);
                this.router.navigate(['/app/whatsapp/campaigns', campaign.id]);
              },
            });
          } else {
            this.finish(campaign, start);
          }
        },
        error: () => this.saving.set(false),
      });
  }

  private finish(campaign: Campaign, start: boolean): void {
    if (!start) {
      this.saving.set(false);
      this.toast.success('Draft saved', campaign.name);
      this.router.navigate(['/app/whatsapp/campaigns', campaign.id]);
      return;
    }
    const scheduledAt = this.scheduleAt ? new Date(this.scheduleAt).toISOString() : undefined;
    this.whatsapp.startCampaign(campaign.id, scheduledAt).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success(
          scheduledAt ? 'Campaign scheduled' : 'Campaign started',
          campaign.name,
        );
        this.router.navigate(['/app/whatsapp/campaigns', campaign.id]);
      },
      error: () => {
        this.saving.set(false);
        this.router.navigate(['/app/whatsapp/campaigns', campaign.id]);
      },
    });
  }
}
