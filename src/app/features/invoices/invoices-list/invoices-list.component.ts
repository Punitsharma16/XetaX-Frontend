import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Page, emptyPage } from '../../../core/models/api.model';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  EmptyStateComponent,
  TableSkeletonComponent,
} from '../../../shared/components/state/state-views.component';
import { Invoice, InvoiceService, InvoiceSummary } from '../invoice.service';

/**
 * Invoice history — summary tiles (invoiced / received / pending / overdue),
 * filters and the paged list. Everything money shows two decimals; the
 * balance column is what collections actually chase.
 */
@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    PageHeaderComponent,
    EmptyStateComponent,
    TableSkeletonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoices-list.component.html',
  styleUrl: './invoices-list.component.css',
})
export class InvoicesListComponent {
  private readonly invoiceService = inject(InvoiceService);

  readonly loading = signal(true);
  readonly page = signal<Page<Invoice>>(emptyPage<Invoice>());
  readonly summary = signal<InvoiceSummary | null>(null);
  readonly pageIndex = signal(0);

  // filters
  status = '';
  q = '';
  fromDate = '';
  toDate = '';
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  readonly statuses = ['DRAFT', 'SENT', 'PARTIAL', 'PAID', 'CANCELLED'];

  constructor() {
    this.load();
    this.loadSummary();
  }

  load(): void {
    this.loading.set(true);
    this.invoiceService
      .list({
        status: this.status,
        q: this.q,
        fromDate: this.fromDate,
        toDate: this.toDate,
        page: this.pageIndex(),
        size: 20,
      })
      .subscribe({
        next: (page) => {
          this.page.set(page);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  loadSummary(): void {
    this.invoiceService.summary().subscribe({
      next: (summary) => this.summary.set(summary),
      error: () => this.summary.set(null),
    });
  }

  onFilterChange(): void {
    this.pageIndex.set(0);
    this.load();
  }

  onSearchInput(): void {
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.onFilterChange(), 350);
  }

  resetFilters(): void {
    this.status = '';
    this.q = '';
    this.fromDate = '';
    this.toDate = '';
    this.onFilterChange();
  }

  goTo(index: number): void {
    this.pageIndex.set(index);
    this.load();
  }

  balanceOf(invoice: Invoice): number {
    return Math.max(0, invoice.total - invoice.amountPaid);
  }

  isOverdue(invoice: Invoice): boolean {
    return !!invoice.dueDate
      && invoice.status !== 'PAID'
      && invoice.status !== 'CANCELLED'
      && new Date(invoice.dueDate) < new Date(new Date().toDateString());
  }

  statusClass(status: string): string {
    switch (status) {
      case 'PAID': return 'text-bg-success';
      case 'PARTIAL': return 'text-bg-warning';
      case 'SENT': return 'text-bg-primary';
      case 'CANCELLED': return 'text-bg-secondary';
      default: return 'text-bg-light border';
    }
  }
}
