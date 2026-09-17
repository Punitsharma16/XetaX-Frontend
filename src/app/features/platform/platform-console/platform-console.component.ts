import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/state/state-views.component';
import {
  PlanOption,
  PlatformOverview,
  PlatformService,
  WhatsAppRateRow,
  Workspace,
  WorkspaceDetail,
} from '../platform.service';

/** Every workspace on the platform, with the two levers: plan and AI credits. */
@Component({
  selector: 'app-platform-console',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, PageHeaderComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './platform-console.component.html',
  styleUrl: './platform-console.component.css',
})
export class PlatformConsoleComponent {
  private readonly platform = inject(PlatformService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly overview = signal<PlatformOverview | null>(null);
  readonly workspaces = signal<Workspace[]>([]);
  readonly plans = signal<PlanOption[]>([]);
  readonly selected = signal<WorkspaceDetail | null>(null);
  readonly busy = signal(false);

  term = '';
  planFilter = '';

  /* plan form */
  planKey = 'GROWTH';
  months = 12;
  amount = 30000;
  paymentRef = '';
  planNote = '';

  /* credit form */
  creditMessages = 1000;

  readonly planKeys = computed(() => this.plans().map((p) => p.key).filter((k) => k !== 'TRIAL'));

  /* WhatsApp rate card (India) */
  readonly rates = signal<WhatsAppRateRow[]>([]);
  rateCategory: WhatsAppRateRow['category'] = 'UTILITY';
  rateValue: number | null = null;
  rateFrom = '';
  rateNote = '';

  /** Today's price per category, so the table can mark which row is in force. */
  readonly ratesInForce = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    const inForce = new Set<number>();
    for (const category of ['MARKETING', 'UTILITY', 'AUTHENTICATION']) {
      const current = this.rates()
        .filter((r) => r.category === category && r.effectiveFrom <= today)
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
      if (current) inForce.add(current.id);
    }
    return inForce;
  });

  constructor() {
    this.load();
    this.platform.plans().subscribe({ next: (list) => this.plans.set(list ?? []) });
  }

  load(): void {
    this.loading.set(true);
    this.loadRates();
    this.platform.overview().subscribe({
      next: (o) => this.overview.set(o),
      error: () => this.overview.set(null),
    });
    this.platform.workspaces(this.term || undefined, this.planFilter || undefined).subscribe({
      next: (list) => {
        this.workspaces.set(list ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  open(w: Workspace): void {
    this.platform.workspace(w.ownerUserId).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.planKey = detail.planKey === 'TRIAL' ? 'GROWTH' : detail.planKey;
        this.amount = this.planKey === 'BUSINESS' ? 48000 : 30000;
        this.months = 12;
        this.paymentRef = '';
        this.planNote = '';
      },
    });
  }

  onPlanChange(): void {
    // Yearly at the list price, so the usual case needs no typing.
    this.amount = this.planKey === 'BUSINESS' ? 4000 * this.months : 2500 * this.months;
  }

  onMonthsChange(): void {
    this.onPlanChange();
  }

  savePlan(): void {
    const w = this.selected();
    if (!w) return;
    this.busy.set(true);
    this.platform
      .setPlan(w.ownerUserId, {
        planKey: this.planKey,
        months: Number(this.months) || 1,
        amountRupees: Number(this.amount) || 0,
        paymentRef: this.paymentRef.trim() || undefined,
        note: this.planNote.trim() || undefined,
      })
      .subscribe({
        next: (detail) => {
          this.busy.set(false);
          this.selected.set(detail);
          this.toast.success('Plan updated', `${w.email} is on ${detail.planLabel}.`);
          this.load();
        },
        error: () => this.busy.set(false),
      });
  }

  addCredit(): void {
    const w = this.selected();
    if (!w) return;
    this.busy.set(true);
    this.platform.addCredit(w.ownerUserId, Number(this.creditMessages) || 0).subscribe({
      next: (detail) => {
        this.busy.set(false);
        this.selected.set(detail);
        this.toast.success('AI credits updated', `Balance is now ${detail.topupBalance}.`);
      },
      error: () => this.busy.set(false),
    });
  }

  toggleEnabled(): void {
    const w = this.selected();
    if (!w) return;
    const next = !w.enabled;
    this.confirm
      .ask({
        title: next ? 'Enable this workspace?' : 'Disable this workspace?',
        message: next
          ? 'The owner and their whole team will be able to sign in again.'
          : 'The owner and every team member will be signed out and blocked from signing in. Their data is untouched.',
        confirmText: next ? 'Enable' : 'Disable',
        variant: next ? 'primary' : 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.busy.set(true);
        this.platform.setEnabled(w.ownerUserId, next).subscribe({
          next: (detail) => {
            this.busy.set(false);
            this.selected.set(detail);
            this.toast.success(next ? 'Workspace enabled' : 'Workspace disabled');
            this.load();
          },
          error: () => this.busy.set(false),
        });
      });
  }

  loadRates(): void {
    this.platform.whatsappRates().subscribe({
      next: (rows) => this.rates.set(rows ?? []),
      error: () => this.rates.set([]),
    });
  }

  saveRate(): void {
    const rate = Number(this.rateValue);
    if (this.rateValue === null || !Number.isFinite(rate) || rate < 0) {
      this.toast.warning('Enter the rate', 'Rupees per delivered message, e.g. 0.115');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(this.rateFrom)) {
      this.toast.warning('Pick the date', 'The date this price starts applying.');
      return;
    }
    this.busy.set(true);
    this.platform.saveWhatsappRate({
      category: this.rateCategory,
      rate,
      effectiveFrom: this.rateFrom,
      note: this.rateNote.trim() || undefined,
    }).subscribe({
      next: () => {
        this.busy.set(false);
        this.rateValue = null;
        this.rateNote = '';
        this.toast.success('Rate saved', 'Estimates use it from its date onward.');
        this.loadRates();
      },
      error: () => this.busy.set(false),
    });
  }

  deleteRate(row: WhatsAppRateRow): void {
    this.confirm.ask({
      title: 'Delete this rate?',
      message: `${row.category} ₹${row.rate} from ${row.effectiveFrom}. Estimates fall back to the price before it.`,
      confirmText: 'Delete',
      variant: 'danger',
    }).subscribe((ok) => {
      if (!ok) return;
      this.platform.deleteWhatsappRate(row.id).subscribe(() => {
        this.toast.success('Rate deleted');
        this.loadRates();
      });
    });
  }

  planBadge(w: Workspace): string {
    if (w.platformAdmin) return 'bg-dark';
    switch (w.planKey) {
      case 'BUSINESS': return 'text-bg-primary';
      case 'GROWTH': return 'text-bg-success';
      case 'PLATFORM': return 'bg-dark';
      case 'STARTER': return 'text-bg-secondary';
      default: return 'text-bg-light';
    }
  }

  /** Days left on the subscription, or null when there is nothing to expire. */
  daysLeft(w: Workspace): number | null {
    const end = w.subscriptionEndsAt ?? (w.planKey === 'TRIAL' ? w.trialEndsAt : null);
    if (!end) return null;
    return Math.ceil((new Date(end).getTime() - Date.now()) / 86400000);
  }
}
