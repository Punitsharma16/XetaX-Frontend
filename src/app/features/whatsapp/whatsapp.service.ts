import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { Page } from '../../core/models/api.model';

/* ------------------------------------------------------------------ models */

export interface WhatsAppConfig {
  id: number | null;
  status: 'PENDING' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  qualityRating: string | null;
  accountMode: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  webhookSubscribed?: boolean;
}

export interface EmbeddedSignupMeta {
  appId: string;
  configId: string;
  graphApiVersion: string;
  configured: boolean;
}

export interface WhatsAppTemplate {
  id: number;
  name: string;
  language: string;
  category: string | null;
  status: string | null;
  componentsJson: string | null;
  rejectionReason: string | null;
}

export interface WhatsAppConversation {
  id: number;
  customerPhone: string;
  customerName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  status: string;
  recordId: string | null;
  lastInboundAt: string | null;
  /** Free text allowed only while true (24h since customer's last message). */
  windowOpen: boolean;
  windowExpiresAt: string | null;
}

export interface WhatsAppMessage {
  id: number;
  conversationId: number | null;
  direction: 'INBOUND' | 'OUTBOUND';
  messageType: string;
  body: string | null;
  templateName: string | null;
  toPhone: string | null;
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorMessage: string | null;
  recordId: string | null;
  campaignId: number | null;
  createdAt: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface SendMessageRequest {
  phone?: string;
  conversationId?: number;
  recordId?: string;
  phoneFieldKey?: string;
  message?: string;
  templateName?: string;
  templateLanguage?: string;
  componentsJson?: string;
}

export interface Campaign {
  id: number;
  name: string;
  sourceType: 'RECORDS' | 'CSV';
  status: 'DRAFT' | 'SCHEDULED' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED';
  messageTemplate: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  targetDescription: string | null;
  scheduledAt: string | null;
  totalCount: number;
  queuedCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  createdAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface CampaignCreateRequest {
  name: string;
  sourceType: 'RECORDS' | 'CSV';
  messageTemplate?: string;
  templateName?: string;
  templateLanguage?: string;
  formSlug?: string;
  phoneFieldKey?: string;
  search?: string;
  filters?: Record<string, unknown>;
  templateParams?: string[];
}

export interface CampaignRecipient {
  id: number;
  phone: string;
  recordId: string | null;
  status: string;
  attemptCount: number;
  error: string | null;
}

export interface WhatsAppUsage {
  month: string;
  counts: {
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    queued: number;
    freeText: number;
    template: number;
    inbound: number;
  };
  categories: { category: string; messages: number }[];
  spend: {
    available: boolean;
    total?: number;
    byCategory?: Record<string, number>;
    source?: string;
    note?: string;
  };
}

/* ----------------------------------------------------------------- service */

/** WhatsApp module API — /api/whatsapp/** (all owner-scoped by the JWT). */
@Injectable({ providedIn: 'root' })
export class WhatsAppService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/whatsapp';

  getConfig(quiet = false): Observable<WhatsAppConfig> {
    return this.api.get<WhatsAppConfig>(`${this.path}/config`, undefined, { quiet });
  }

  getSignupMeta(): Observable<EmbeddedSignupMeta> {
    return this.api.get<EmbeddedSignupMeta>(`${this.path}/meta`);
  }

  completeOnboarding(code: string, wabaId?: string, phoneNumberId?: string): Observable<WhatsAppConfig> {
    return this.api.post<WhatsAppConfig>(`${this.path}/onboarding/complete`, {
      code,
      wabaId,
      phoneNumberId,
    });
  }

  manualConnect(accessToken: string, wabaId: string, phoneNumberId: string): Observable<WhatsAppConfig> {
    return this.api.post<WhatsAppConfig>(`${this.path}/onboarding/manual`, {
      accessToken,
      wabaId,
      phoneNumberId,
    });
  }

  disconnect(): Observable<WhatsAppConfig> {
    return this.api.post<WhatsAppConfig>(`${this.path}/disconnect`, {});
  }

  /** quiet: "not connected" is a normal state pages handle themselves. */
  usage(): Observable<WhatsAppUsage> {
    return this.api.get<WhatsAppUsage>(`${this.path}/usage`, undefined, { quiet: true });
  }


  getTemplates(): Observable<WhatsAppTemplate[]> {
    return this.api.get<WhatsAppTemplate[]>(`${this.path}/templates`, undefined, { quiet: true });
  }

  createTemplate(request: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    headerText?: string;
    bodyText?: string;
    footerText?: string;
    exampleParams?: string[];
  }): Observable<WhatsAppTemplate> {
    return this.api.post<WhatsAppTemplate>(`${this.path}/templates`, request);
  }

  deleteTemplate(name: string): Observable<string> {
    return this.api.delete(`${this.path}/templates/${name}`);
  }

  syncTemplates(): Observable<WhatsAppTemplate[]> {
    return this.api.post<WhatsAppTemplate[]>(`${this.path}/templates/sync`, {});
  }

  send(request: SendMessageRequest): Observable<WhatsAppMessage> {
    return this.api.post<WhatsAppMessage>(`${this.path}/messages/send`, request);
  }

  sendMedia(conversationId: number, file: File, caption?: string): Observable<WhatsAppMessage> {
    const form = new FormData();
    form.append('file', file);
    form.append('conversationId', String(conversationId));
    if (caption) form.append('caption', caption);
    return this.api.post<WhatsAppMessage>(`${this.path}/messages/send-media`, form);
  }

  recordHistory(recordId: string): Observable<WhatsAppMessage[]> {
    return this.api.get<WhatsAppMessage[]>(`${this.path}/messages/record/${recordId}`);
  }

  conversations(page = 0, size = 50): Observable<Page<WhatsAppConversation>> {
    return this.api.get<Page<WhatsAppConversation>>(`${this.path}/conversations`, { page, size });
  }

  conversationMessages(id: number, page = 0, size = 50): Observable<Page<WhatsAppMessage>> {
    return this.api.get<Page<WhatsAppMessage>>(`${this.path}/conversations/${id}/messages`, {
      page,
      size,
    });
  }

  campaigns(page = 0, size = 20): Observable<Page<Campaign>> {
    return this.api.get<Page<Campaign>>(`${this.path}/campaigns`, { page, size });
  }

  campaign(id: number): Observable<Campaign> {
    return this.api.get<Campaign>(`${this.path}/campaigns/${id}`);
  }

  createCampaign(request: CampaignCreateRequest): Observable<Campaign> {
    return this.api.post<Campaign>(`${this.path}/campaigns`, request);
  }

  uploadCampaignCsv(id: number, file: File): Observable<Campaign> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<Campaign>(`${this.path}/campaigns/${id}/csv`, form);
  }

  startCampaign(id: number, scheduledAt?: string): Observable<Campaign> {
    return this.api.post<Campaign>(`${this.path}/campaigns/${id}/start`,
      scheduledAt ? { scheduledAt } : {});
  }

  pauseCampaign(id: number): Observable<Campaign> {
    return this.api.post<Campaign>(`${this.path}/campaigns/${id}/pause`, {});
  }

  resumeCampaign(id: number): Observable<Campaign> {
    return this.api.post<Campaign>(`${this.path}/campaigns/${id}/resume`, {});
  }

  cancelCampaign(id: number): Observable<Campaign> {
    return this.api.post<Campaign>(`${this.path}/campaigns/${id}/cancel`, {});
  }

  recipients(id: number, page = 0, size = 50, status?: string): Observable<Page<CampaignRecipient>> {
    return this.api.get<Page<CampaignRecipient>>(`${this.path}/campaigns/${id}/recipients`, {
      page,
      size,
      status,
    });
  }
}
