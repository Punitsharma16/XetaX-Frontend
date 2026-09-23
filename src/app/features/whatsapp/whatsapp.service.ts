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
  headerFormat: string | null;
  headerMediaUrl: string | null;
}

/**
 * Values for a template's variables, in the template's own shape.
 * buttons / card buttons are keyed by button position (as a string).
 * A value may be a literal or a {fieldKey} placeholder on record and contact sends.
 */
export interface TemplateVariables {
  header: string[];
  headerMediaUrl?: string;
  body: string[];
  buttons: Record<string, string>;
  cards: { headerMediaUrl?: string; body: string[]; buttons: Record<string, string> }[];
}

/** One button under a template. Meta allows 2 URL, 1 phone, the rest replies. */
export interface TemplateButton {
  type: 'URL' | 'PHONE_NUMBER' | 'QUICK_REPLY' | 'FLOW';
  text: string;
  url?: string;
  urlExample?: string;
  phoneNumber?: string;
  flowId?: string;
  flowAction?: string;
}

/** One card of a carousel. Every card must have the same shape. */
export interface TemplateCard {
  headerFormat?: string;
  headerHandle?: string;
  headerMediaUrl?: string;
  bodyText?: string;
  exampleParams?: string[];
  buttons?: TemplateButton[];
}

export interface TemplateCreateRequest {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  headerFormat?: 'NONE' | 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  headerText?: string;
  headerExample?: string;
  headerHandle?: string;
  headerMediaUrl?: string;
  bodyText?: string;
  footerText?: string;
  exampleParams?: string[];
  buttons?: TemplateButton[];
  cards?: TemplateCard[];
}

/** A Flow — the form a customer fills inside WhatsApp. */
export interface WhatsAppFlow {
  id: number;
  metaFlowId: string | null;
  name: string;
  status: 'DRAFT' | 'PUBLISHED' | 'DEPRECATED' | 'BLOCKED' | 'THROTTLED' | string;
  category: string | null;
  flowJson: string | null;
  formId: number | null;
  fieldMap: Record<string, string>;
  publishedAt: string | null;
  lastError: string | null;
  validationErrors: string[];
}

export interface FlowCreateRequest {
  name: string;
  categories?: string[];
  flowJson?: string;
  formId?: number | null;
  fieldMap?: Record<string, string>;
  publish?: boolean;
}

export interface FlowSendRequest {
  flowId: number;
  phone?: string;
  conversationId?: number;
  recordId?: string;
  headerText?: string;
  bodyText?: string;
  footerText?: string;
  ctaText?: string;
}

/** One customer's submitted Flow. */
export interface FlowSubmission {
  id: number;
  flowId: number | null;
  flowName: string | null;
  customerPhone: string | null;
  conversationId: number | null;
  answers: Record<string, unknown>;
  recordId: string | null;
  note: string | null;
  submittedAt: string | null;
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
  /** Public link to the file on this message — null when it has none. */
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaFilename: string | null;
  mediaSize: number | null;
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
  templateVariables?: TemplateVariables;
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
  templateVariables?: TemplateVariables;
}

export interface CampaignRecipient {
  id: number;
  phone: string;
  recordId: string | null;
  status: string;
  attemptCount: number;
  error: string | null;
}

/** How Meta bills an outbound message from 1 October 2026. */
export type ChargeCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' | 'SERVICE';

export const CHARGE_LABELS: Record<ChargeCategory, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utility',
  AUTHENTICATION: 'Authentication',
  SERVICE: 'Replies (service)',
};

/** XetaX's own estimate of this month's WhatsApp bill. */
export interface ChargeEstimate {
  month: string;
  zone: string;
  currency: string;
  total: number;
  lines: { category: ChargeCategory; messages: number; amount: number }[];
  chargedMessages: number;
  freeEntryPoint: number;
  /** Service replies that cost nothing — by the cutover date, or by the allowance. */
  freeAllowance: number;
  /** How many service replies Meta leaves free each month once it charges for them. */
  freeAllowanceLimit: number;
  /** The day Meta starts charging for service replies, ISO. */
  serviceChargingFrom: string;
  /** Whether this month is on or past that day. */
  serviceCharging: boolean;
  awaitingDelivery: number;
  /** How many messages Meta itself marked billable this month. */
  metaBillable: number;
  /** How many it marked free. */
  metaFree: number;
  /** Messages Meta has priced at all — billable + free. */
  metaKnown: number;
  /** Messages we sent this month, priced by Meta or not yet. */
  metaOutbound: number;
  otherCountries: number;
  unknownCategory: number;
  unpriced: number;
}

/** Today's India price per message, and the next change if one is scheduled. */
export interface RateSummary {
  market: string;
  currency: string;
  asOf: string;
  categories: Record<ChargeCategory, { rate: number | null; next?: { rate: number; from: string } }>;
}

/** The most a campaign can cost before it starts. */
export interface CampaignEstimate {
  recipients: number;
  india: number;
  otherCountries: number;
  category: ChargeCategory | null;
  templateCategory: string | null;
  rate: number | null;
  rateDate: string;
  amount: number | null;
  currency: string;
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
  estimate?: ChargeEstimate;
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
  /** India rates — readable by any signed-in user; quiet so a note never raises an error toast. */
  rates(): Observable<RateSummary> {
    return this.api.get<RateSummary>(`${this.path}/rates`, undefined, { quiet: true });
  }

  campaignEstimate(id: number): Observable<CampaignEstimate> {
    return this.api.get<CampaignEstimate>(`${this.path}/campaigns/${id}/estimate`, undefined, { quiet: true });
  }

  usage(): Observable<WhatsAppUsage> {
    return this.api.get<WhatsAppUsage>(`${this.path}/usage`, undefined, { quiet: true });
  }


  getTemplates(): Observable<WhatsAppTemplate[]> {
    return this.api.get<WhatsAppTemplate[]>(`${this.path}/templates`, undefined, { quiet: true });
  }

  createTemplate(request: TemplateCreateRequest): Observable<WhatsAppTemplate> {
    return this.api.post<WhatsAppTemplate>(`${this.path}/templates`, request);
  }

  /**
   * Uploads the sample image a Meta reviewer sees for a media header and
   * returns the handle that goes into the template being created.
   */
  /**
   * Sends the reviewer's sample to Meta and keeps the same file on our server.
   * `url` is that file's public link — what every send of the template carries —
   * or null for a format a header cannot carry.
   */
  uploadTemplateSample(file: File): Observable<{ handle: string; url: string | null }> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<{ handle: string; url: string | null }>(`${this.path}/templates/sample`, form);
  }

  /**
   * Edits a template Meta already has. Its name and language cannot change —
   * Meta refuses — so they are not sent; everything else is replaced wholesale
   * and the template goes back through review.
   */
  updateTemplate(id: number, request: TemplateCreateRequest): Observable<WhatsAppTemplate> {
    return this.api.put<WhatsAppTemplate>(`${this.path}/templates/${id}`, request);
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

  /**
   * `quiet` keeps a failed background refresh silent — the inbox polls this
   * every few seconds and a flaky minute must not stack up error toasts.
   */
  conversations(page = 0, size = 50, quiet = false): Observable<Page<WhatsAppConversation>> {
    return this.api.get<Page<WhatsAppConversation>>(
      `${this.path}/conversations`,
      { page, size },
      { quiet },
    );
  }

  conversationMessages(id: number, page = 0, size = 50): Observable<Page<WhatsAppMessage>> {
    return this.api.get<Page<WhatsAppMessage>>(`${this.path}/conversations/${id}/messages`, {
      page,
      size,
    });
  }

  /* ------------------------------------------------------------- flows */

  flows(): Observable<WhatsAppFlow[]> {
    return this.api.get<WhatsAppFlow[]>(`${this.path}/flows`, undefined, { quiet: true });
  }

  flow(id: number): Observable<WhatsAppFlow> {
    return this.api.get<WhatsAppFlow>(`${this.path}/flows/${id}`);
  }

  flowOptions(): Observable<{ categories: string[] }> {
    return this.api.get<{ categories: string[] }>(`${this.path}/flows/options`, undefined, { quiet: true });
  }

  createFlow(request: FlowCreateRequest): Observable<WhatsAppFlow> {
    return this.api.post<WhatsAppFlow>(`${this.path}/flows`, request);
  }

  updateFlow(id: number, request: FlowCreateRequest): Observable<WhatsAppFlow> {
    return this.api.put<WhatsAppFlow>(`${this.path}/flows/${id}`, request);
  }

  publishFlow(id: number): Observable<WhatsAppFlow> {
    return this.api.post<WhatsAppFlow>(`${this.path}/flows/${id}/publish`, {});
  }

  deprecateFlow(id: number): Observable<WhatsAppFlow> {
    return this.api.post<WhatsAppFlow>(`${this.path}/flows/${id}/deprecate`, {});
  }

  deleteFlow(id: number): Observable<string> {
    return this.api.delete(`${this.path}/flows/${id}`);
  }

  flowPreview(id: number): Observable<{ url?: string }> {
    return this.api.get<{ url?: string }>(`${this.path}/flows/${id}/preview`);
  }

  sendFlow(request: FlowSendRequest): Observable<FlowSubmission> {
    return this.api.post<FlowSubmission>(`${this.path}/flows/send`, request);
  }

  /** Tries the CRM record again for a submission whose record failed. */
  retryFlowRecord(responseId: number): Observable<FlowSubmission> {
    return this.api.post<FlowSubmission>(`${this.path}/flows/responses/${responseId}/record`, {});
  }

  flowResponses(flowId: number | null, page = 0, size = 20): Observable<Page<FlowSubmission>> {
    return this.api.get<Page<FlowSubmission>>(`${this.path}/flows/responses`, {
      flowId: flowId ?? undefined,
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
