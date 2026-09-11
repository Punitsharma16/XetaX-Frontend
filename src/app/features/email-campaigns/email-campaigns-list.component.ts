import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../shared/components/state/state-views.component';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';
import { Page, emptyPage } from '../../core/models/api.model';
import {
  EmailCampaign,
  EmailCampaignSenderStatus,
  EmailCampaignService,
} from './email-campaign.service';

const STATUS_BADGES: Record<EmailCampaign['status'], string> = {
  DRAFT: 'text-bg-secondary',
  SCHEDULED: 'text-bg-info',
  QUEUED: 'text-bg-info',
  RUNNING: 'text-bg-primary',
  PAUSED: 'text-bg-warning',
  COMPLETED: 'text-bg-success',
  PARTIAL: 'text-bg-warning',
  FAILED: 'text-bg-danger',
  CANCELLED: 'text-bg-dark',
};

@Component({
  selector: 'app-email-campaigns-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-campaigns-list.component.html',
  styleUrl: './email-campaigns.css',
})
export class EmailCampaignsListComponent {
  private readonly campaigns = inject(EmailCampaignService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly page = signal<Page<EmailCampaign>>(emptyPage<EmailCampaign>());
  /** null until the status call answers — the notice must not flash on load. */
  readonly sender = signal<EmailCampaignSenderStatus | null>(null);

  constructor() {
    this.load(0);
    this.campaigns.senderStatus().subscribe({
      next: (status) => this.sender.set(status),
      error: () => this.sender.set(null),
    });
  }

  load(pageIndex: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.campaigns.list(pageIndex, this.page().size || 20).subscribe({
      next: (page) => {
        this.page.set(page);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  badge(status: EmailCampaign['status']): string {
    return STATUS_BADGES[status] ?? 'text-bg-secondary';
  }

  progress(campaign: EmailCampaign): number {
    if (!campaign.totalCount) return 0;
    return Math.round(((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100);
  }
}
