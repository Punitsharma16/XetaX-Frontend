import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface MetaSignupMeta {
  appId: string;
  configId: string;
  graphApiVersion: string;
  configured: boolean;
}

export interface MetaPageOption {
  id: string;
  name: string;
  instagram: string;
}

export interface MetaAdAccountOption {
  id: string;
  name: string;
  currency: string;
}

export interface MetaConnectChoices {
  pages: MetaPageOption[];
  adAccounts: MetaAdAccountOption[];
}

export interface MetaConnection {
  id: number;
  pageId: string;
  pageName: string;
  instagram: boolean;
  adAccountId: string | null;
  adAccountName: string | null;
  currency: string | null;
  targetFormId: number | null;
  targetFormName?: string;
  wonStageId: number | null;
  fieldMap: Record<string, string>;
  status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastError: string | null;
  lastLeadAt: string | null;
  lastInsightSyncAt: string | null;
}

export interface CampaignRow {
  campaignId: string | null;
  campaign: string;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  costPerLead: number | null;
  won: number;
  costPerWon: number | null;
}

export interface AdReport {
  from: string;
  to: string;
  currency: string;
  wonStageConfigured: boolean;
  totals: {
    spend: number;
    leads: number;
    won: number;
    costPerLead: number | null;
    costPerWon: number | null;
  };
  campaigns: CampaignRow[];
}

export interface RecentAdLead {
  recordId: string | null;
  campaign: string | null;
  ad: string | null;
  form: string | null;
  platform: string | null;
  at: string;
}

/** Facebook & Instagram lead ads — /api/meta. */
@Injectable({ providedIn: 'root' })
export class MetaService {
  private readonly api = inject(CrmApiService);

  signupMeta(): Observable<MetaSignupMeta> {
    return this.api.get<MetaSignupMeta>('/api/meta/signup-meta', undefined, { quiet: true });
  }

  connections(): Observable<MetaConnection[]> {
    return this.api.get<MetaConnection[]>('/api/meta/connections', undefined, { quiet: true });
  }

  connect(code: string): Observable<MetaConnectChoices> {
    return this.api.post<MetaConnectChoices>('/api/meta/connect', { code });
  }

  choose(body: {
    pageId: string;
    adAccountId?: string | null;
    formId?: number | null;
    wonStageId?: number | null;
  }): Observable<MetaConnection> {
    return this.api.post<MetaConnection>('/api/meta/choose', body);
  }

  update(
    id: number,
    body: {
      formId?: number | null;
      wonStageId?: number | null;
      adAccountId?: string | null;
      fieldMap?: Record<string, string>;
    },
  ): Observable<MetaConnection> {
    return this.api.put<MetaConnection>(`/api/meta/connections/${id}`, body);
  }

  disconnect(id: number): Observable<string> {
    return this.api.delete(`/api/meta/connections/${id}`);
  }

  suggestedMap(formId: number): Observable<Record<string, string>> {
    return this.api.get<Record<string, string>>(`/api/meta/field-map/${formId}`, undefined, { quiet: true });
  }

  report(from?: string, to?: string): Observable<AdReport> {
    return this.api.get<AdReport>('/api/meta/report', { from, to });
  }

  recentLeads(): Observable<RecentAdLead[]> {
    return this.api.get<RecentAdLead[]>('/api/meta/recent-leads', undefined, { quiet: true });
  }

  syncSpend(id: number, days = 30): Observable<{ rows: number }> {
    return this.api.post<{ rows: number }>(`/api/meta/connections/${id}/sync?days=${days}`, {});
  }
}
