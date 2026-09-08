import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';

import { ToastService } from '../../core/services/toast.service';
import { BillingService, BillingSummary, TopupPack } from './billing.service';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

/**
 * The AI page's usage + top-up card: plan, monthly quota bars, per-agent
 * breakdown and Razorpay top-up packs. Buying is owner-only; everyone can see
 * where the quota stands.
 */
@Component({
  selector: 'app-ai-usage-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-usage-panel.component.html',
  styleUrl: './ai-usage-panel.component.css',
})
export class AiUsagePanelComponent {
  private readonly billing = inject(BillingService);
  private readonly toast = inject(ToastService);

  readonly summary = signal<BillingSummary | null>(null);
  readonly loading = signal(true);
  readonly paying = signal<string | null>(null);

  readonly assistantPct = computed(() => this.pct(this.s()?.assistantUsed, this.s()?.assistantQuota));
  readonly agentPct = computed(() => this.pct(this.s()?.agentUsed, this.s()?.agentQuota));
  readonly warning = computed(() => {
    const s = this.s();
    if (!s) return false;
    return this.assistantPct() >= 80 || this.agentPct() >= 80;
  });

  private s(): BillingSummary | null {
    return this.summary();
  }

  private pct(used?: number, quota?: number): number {
    if (!quota || quota <= 0) return used ? 100 : 0;
    return Math.min(100, Math.round(((used ?? 0) * 100) / quota));
  }

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.billing.summary().subscribe({
      next: (summary) => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  priceOf(pack: TopupPack): string {
    return '₹' + (pack.amountPaise / 100).toLocaleString('en-IN');
  }

  barClass(pct: number): string {
    return pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warning' : 'bg-primary';
  }

  buy(pack: TopupPack): void {
    const s = this.s();
    if (!s?.isOwner) {
      this.toast.warning('Only the workspace owner can buy top-ups');
      return;
    }
    if (!s.razorpayConfigured) {
      this.toast.warning('Payment is not configured yet — contact support');
      return;
    }
    this.paying.set(pack.key);
    this.billing.createTopupOrder(pack.key).subscribe({
      next: (order) => this.openCheckout(order.keyId, order.orderId, order.amountPaise, pack),
      error: () => this.paying.set(null),
    });
  }

  /** Loads checkout.js on first use, then opens the Razorpay modal. */
  private openCheckout(keyId: string, orderId: string, amountPaise: number, pack: TopupPack): void {
    const start = () => {
      const razorpay = new window.Razorpay!({
        key: keyId,
        amount: amountPaise,
        currency: 'INR',
        name: 'XetaX CRM',
        description: pack.label,
        order_id: orderId,
        theme: { color: '#6366f1' },
        modal: { ondismiss: () => this.paying.set(null) },
        handler: (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => this.verify(response),
      });
      razorpay.open();
    };

    if (window.Razorpay) {
      start();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = start;
    script.onerror = () => {
      this.paying.set(null);
      this.toast.error('Could not load the payment window — check your connection');
    };
    document.body.appendChild(script);
  }

  private verify(response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }): void {
    this.billing
      .verifyTopup(
        response.razorpay_order_id,
        response.razorpay_payment_id,
        response.razorpay_signature,
      )
      .subscribe({
        next: (result) => {
          this.paying.set(null);
          this.toast.success(`${result.credited.toLocaleString('en-IN')} AI messages added`);
          this.load();
        },
        error: () => this.paying.set(null),
      });
  }
}
