import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface AgentUsageRow {
  agentId: number;
  agentName: string;
  messages: number;
}

export interface TopupPack {
  key: string;
  label: string;
  messages: number;
  amountPaise: number;
}

export interface TopupHistoryRow {
  packKey: string;
  messages: number;
  amountPaise: number;
  paidAt: string;
}

export interface SubscriptionInfo {
  planKey: string;
  startsAt: string;
  endsAt: string;
  daysLeft: number;
}

export interface BillingSummary {
  planKey: string;
  planLabel: string;
  trialEndsAt: string | null;
  trialExpired: boolean;
  subscription: SubscriptionInfo | null;
  assistantQuota: number;
  assistantUsed: number;
  agentQuota: number;
  agentUsed: number;
  topupBalance: number;
  yearMonth: number;
  isOwner: boolean;
  razorpayConfigured: boolean;
  razorpayKeyId: string | null;
  agents: AgentUsageRow[];
  packs: TopupPack[];
  topupHistory: TopupHistoryRow[];
}

export interface TopupOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  packKey: string;
}

/** AI quota + Razorpay top-ups. Plan upgrades themselves are manual for now. */
@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly api = inject(CrmApiService);

  summary(): Observable<BillingSummary> {
    return this.api.get<BillingSummary>('/api/billing/summary', undefined, { quiet: true });
  }

  createTopupOrder(packKey: string): Observable<TopupOrder> {
    return this.api.post<TopupOrder>('/api/billing/topup/order', { packKey });
  }

  verifyTopup(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Observable<{ credited: number }> {
    return this.api.post<{ credited: number }>('/api/billing/topup/verify', {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });
  }
}
