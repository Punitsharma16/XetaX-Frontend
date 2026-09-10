import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface PlatformOverview {
  workspaces: number;
  members: number;
  disabledUsers: number;
  payingWorkspaces: number;
  expiringIn14Days: number;
  bookedAmount: number;
  planCounts: Record<string, number>;
  aiThisMonth: { assistant: number; agent: number };
}

export interface Workspace {
  ownerUserId: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  enabled: boolean;
  platformAdmin: boolean;
  createdAt: string | null;
  planKey: string;
  planLabel: string;
  trialEndsAt: string | null;
  topupBalance: number;
  subscriptionEndsAt: string | null;
  subscriptionAmount: number | null;
  members: number;
  forms: number;
  records: number;
  assistantUsed: number;
  agentUsed: number;
  assistantQuota: number;
  agentQuota: number;
}

export interface WorkspaceDetail extends Workspace {
  team: { id: string; name: string; email: string; enabled: boolean }[];
  subscriptions: {
    planKey: string;
    status: string;
    startsAt: string;
    endsAt: string;
    amount: number;
    paymentRef: string | null;
    note: string | null;
  }[];
}

export interface PlanOption {
  key: string;
  label: string;
  assistantMonthly: number;
  agentMonthly: number;
  maxMembers: number;
  maxRecords: number;
}

/** XetaX's own back office — /api/platform, platform admins only. */
@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly api = inject(CrmApiService);

  overview(): Observable<PlatformOverview> {
    return this.api.get<PlatformOverview>('/api/platform/overview', undefined, { quiet: true });
  }

  workspaces(q?: string, plan?: string): Observable<Workspace[]> {
    return this.api.get<Workspace[]>('/api/platform/workspaces', { q, plan }, { quiet: true });
  }

  workspace(ownerUserId: string): Observable<WorkspaceDetail> {
    return this.api.get<WorkspaceDetail>(`/api/platform/workspaces/${ownerUserId}`);
  }

  plans(): Observable<PlanOption[]> {
    return this.api.get<PlanOption[]>('/api/platform/plans', undefined, { quiet: true });
  }

  setPlan(
    ownerUserId: string,
    body: { planKey: string; months: number; amountRupees: number; paymentRef?: string; note?: string },
  ): Observable<WorkspaceDetail> {
    return this.api.post<WorkspaceDetail>(`/api/platform/workspaces/${ownerUserId}/plan`, body);
  }

  addCredit(ownerUserId: string, messages: number): Observable<WorkspaceDetail> {
    return this.api.post<WorkspaceDetail>(`/api/platform/workspaces/${ownerUserId}/ai-credit`, { messages });
  }

  setEnabled(ownerUserId: string, enabled: boolean): Observable<WorkspaceDetail> {
    return this.api.post<WorkspaceDetail>(`/api/platform/workspaces/${ownerUserId}/status`, { enabled });
  }
}
