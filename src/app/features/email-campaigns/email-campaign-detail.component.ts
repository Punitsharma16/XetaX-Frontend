import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { ErrorStateComponent } from '../../shared/components/state/state-views.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { Page, emptyPage } from '../../core/models/api.model';
import {
  EmailCampaign,
  EmailCampaignRecipient,
  EmailCampaignService,
} from './email-campaign.service';

/** Live campaign view: counters poll every 5s while the campaign runs. */
@Component({
  selector: 'app-email-campaign-detail',
  standalone: true,
  imports: [DatePipe, RouterLink, PageHeaderComponent, ErrorStateComponent, PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-campaign-detail.component.html',
  styleUrl: './email-campaigns.css',
})
export class EmailCampaignDetailComponent implements OnDestroy {
  private readonly campaigns = inject(EmailCampaignService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  /** Route param (withComponentInputBinding). */
  readonly id = input.required<string>();

  readonly campaign = signal<EmailCampaign | null>(null);
  readonly error = signal(false);
  readonly recipients = signal<Page<EmailCampaignRecipient>>(emptyPage<EmailCampaignRecipient>());
  readonly statusFilter = signal('');
  readonly working = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  readonly progress = computed(() => {
    const campaign = this.campaign();
    if (!campaign?.totalCount) return 0;
    return Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100);
  });

  constructor() {
    effect(() => {
      const campaignId = Number(this.id());
      if (!Number.isFinite(campaignId)) return;
      this.reload();
    });
    this.pollTimer = setInterval(() => {
      if (this.campaign()?.status === 'RUNNING') this.reload(true);
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  reload(silent = false): void {
    const campaignId = Number(this.id());
    this.campaigns.get(campaignId).subscribe({
      next: (campaign) => {
        this.campaign.set(campaign);
        this.error.set(false);
        this.loadRecipients(this.recipients().number);
      },
      error: () => {
        if (!silent) this.error.set(true);
      },
    });
  }

  loadRecipients(page: number): void {
    const campaignId = Number(this.id());
    this.campaigns
      .recipients(campaignId, page, this.recipients().size || 50, this.statusFilter() || undefined)
      .subscribe({ next: (result) => this.recipients.set(result) });
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.loadRecipients(0);
  }

  pause(): void {
    const campaign = this.campaign();
    if (!campaign) return;
    this.campaigns.pause(campaign.id).subscribe({
      next: (updated) => {
        this.campaign.set(updated);
        this.toast.success('Campaign paused');
      },
    });
  }

  resume(): void {
    const campaign = this.campaign();
    if (!campaign) return;
    this.campaigns.resume(campaign.id).subscribe({
      next: (updated) => {
        this.campaign.set(updated);
        this.toast.success('Campaign resumed');
      },
    });
  }

  start(): void {
    const campaign = this.campaign();
    if (!campaign) return;
    this.confirm
      .ask({
        title: 'Start this campaign?',
        message: `${campaign.totalCount} emails will be queued for sending from your own address.`,
        confirmText: 'Start sending',
        variant: 'primary',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.working.set(true);
        this.campaigns.start(campaign.id).subscribe({
          next: (updated) => {
            this.working.set(false);
            this.campaign.set(updated);
            this.toast.success('Campaign started', updated.name);
          },
          error: () => this.working.set(false),
        });
      });
  }

  cancel(): void {
    const campaign = this.campaign();
    if (!campaign) return;
    this.confirm
      .ask({
        title: 'Cancel this campaign?',
        message: 'Recipients not yet sent will be skipped.',
        confirmText: 'Cancel campaign',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.campaigns.cancel(campaign.id).subscribe({
          next: (updated) => {
            this.campaign.set(updated);
            this.toast.success('Campaign cancelled');
          },
        });
      });
  }

  badge(status: string): string {
    switch (status) {
      case 'RUNNING':
        return 'text-bg-primary';
      case 'COMPLETED':
      case 'SENT':
        return 'text-bg-success';
      case 'PARTIAL':
      case 'PAUSED':
        return 'text-bg-warning';
      case 'FAILED':
        return 'text-bg-danger';
      case 'CANCELLED':
        return 'text-bg-dark';
      case 'SCHEDULED':
      case 'QUEUED':
        return 'text-bg-info';
      default:
        return 'text-bg-secondary';
    }
  }
}
