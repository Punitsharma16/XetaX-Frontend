import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { Page } from '../../core/models/api.model';

/* ------------------------------------------------------------------ models */

export type EmailCampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'QUEUED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type EmailCampaignSource = 'RECORDS' | 'CONTACTS' | 'CSV';

export interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  body: string;
  sourceType: EmailCampaignSource;
  status: EmailCampaignStatus;
  targetDescription: string | null;
  totalCount: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface EmailCampaignCreateRequest {
  name: string;
  subject: string;
  body: string;
  sourceType: EmailCampaignSource;
  formSlug?: string;
  emailFieldKey?: string;
  search?: string;
  filters?: Record<string, unknown>;
}

export interface EmailCampaignRecipient {
  id: number;
  email: string;
  recordId: string | null;
  contactId: number | null;
  status: 'PENDING' | 'QUEUED' | 'SENT' | 'FAILED';
  attemptCount: number;
  error: string | null;
}

/** Whether the org has its own SMTP saved (the only sender campaigns use) + pacing limits. */
export interface EmailCampaignSenderStatus {
  configured: boolean;
  fromEmail: string | null;
  maxRecipients: number;
  sendsPerMinute: number;
}

/* ----------------------------------------------------------------- service */

/**
 * /api/email/campaigns — same endpoints as the WhatsApp campaign API, so the
 * two wizards stay interchangeable in the user's head: audience → message →
 * review, then start / pause / resume / cancel from the detail page.
 */
@Injectable({ providedIn: 'root' })
export class EmailCampaignService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/email/campaigns';

  senderStatus(): Observable<EmailCampaignSenderStatus> {
    return this.api.get<EmailCampaignSenderStatus>(`${this.path}/status`, undefined, { quiet: true });
  }

  list(page = 0, size = 20): Observable<Page<EmailCampaign>> {
    return this.api.get<Page<EmailCampaign>>(this.path, { page, size });
  }

  get(id: number): Observable<EmailCampaign> {
    return this.api.get<EmailCampaign>(`${this.path}/${id}`);
  }

  create(request: EmailCampaignCreateRequest): Observable<EmailCampaign> {
    return this.api.post<EmailCampaign>(this.path, request);
  }

  uploadCsv(id: number, file: File): Observable<EmailCampaign> {
    const form = new FormData();
    form.append('file', file);
    return this.api.post<EmailCampaign>(`${this.path}/${id}/csv`, form);
  }

  start(id: number, scheduledAt?: string): Observable<EmailCampaign> {
    return this.api.post<EmailCampaign>(`${this.path}/${id}/start`, scheduledAt ? { scheduledAt } : {});
  }

  pause(id: number): Observable<EmailCampaign> {
    return this.api.post<EmailCampaign>(`${this.path}/${id}/pause`, {});
  }

  resume(id: number): Observable<EmailCampaign> {
    return this.api.post<EmailCampaign>(`${this.path}/${id}/resume`, {});
  }

  cancel(id: number): Observable<EmailCampaign> {
    return this.api.post<EmailCampaign>(`${this.path}/${id}/cancel`, {});
  }

  recipients(id: number, page = 0, size = 50, status?: string): Observable<Page<EmailCampaignRecipient>> {
    return this.api.get<Page<EmailCampaignRecipient>>(`${this.path}/${id}/recipients`, {
      page,
      size,
      status,
    });
  }
}
