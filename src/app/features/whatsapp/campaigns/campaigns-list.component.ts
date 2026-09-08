import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AiPanelComponent } from '../../../shared/components/ai/ai-panel.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  ErrorStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { Page, emptyPage } from '../../../core/models/api.model';
import { Campaign, WhatsAppService } from '../whatsapp.service';
import { WhatsAppNavComponent } from '../whatsapp-nav.component';

const STATUS_BADGES: Record<Campaign['status'], string> = {
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
  selector: 'app-whatsapp-campaigns-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    AiPanelComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    TableSkeletonComponent,
    PaginationComponent,
    WhatsAppNavComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './campaigns-list.component.html',
  styleUrl: './campaigns.css',
})
export class WhatsAppCampaignsListComponent {
  private readonly whatsapp = inject(WhatsAppService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly page = signal<Page<Campaign>>(emptyPage<Campaign>());
  readonly aiOpen = signal(false);

  readonly aiSuggestions = [
    'Meri WhatsApp campaigns ka status batao',
    'Create a draft campaign for the Leads form records',
    'Kitne messages delivered hue last campaign me?',
  ];

  constructor() {
    this.load(0);
  }

  load(pageIndex: number): void {
    this.loading.set(true);
    this.error.set(false);
    this.whatsapp.campaigns(pageIndex, this.page().size || 20).subscribe({
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

  badge(status: Campaign['status']): string {
    return STATUS_BADGES[status] ?? 'text-bg-secondary';
  }

  progress(campaign: Campaign): number {
    if (!campaign.totalCount) return 0;
    return Math.round(
      ((campaign.sentCount + campaign.failedCount) / campaign.totalCount) * 100,
    );
  }
}
