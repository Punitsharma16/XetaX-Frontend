import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface DeskBadge {
  open: number;
  mine: number;
  enabled: boolean;
}

export interface HandoffRow {
  id: number;
  sessionId: number;
  channel: 'WEBSITE' | 'WHATSAPP';
  customer: string;
  lastMessage: string | null;
  aiSummary: string | null;
  reason: string | null;
  createdAt: string;
  escalated: boolean;
  recordId: string | null;
}

export interface DeskSession {
  id: number;
  channel: 'WEBSITE' | 'WHATSAPP';
  customer: string;
  phone: string | null;
  recordId: string | null;
  contactId: number | null;
  status: 'AI' | 'WAITING_HUMAN' | 'HUMAN' | 'RESOLVED';
  acceptedBy: string | null;
  acceptedByName: string | null;
  lastMessageAt: string | null;
  lastMessage: string;
  lastRole: string;
  summary: string | null;
  summaryAt?: string | null;
  pendingStageId?: number | null;
  pendingStageName?: string | null;
}

export interface DeskState {
  requests: HandoffRow[];
  mine: DeskSession[];
  others: DeskSession[];
  enabled: boolean;
}

export interface DeskMessage {
  id: number;
  role: 'CUSTOMER' | 'AI' | 'HUMAN' | 'SYSTEM';
  text: string;
  at: string;
  sender: string | null;
}

/** Live Chat Desk — /api/desk (desk.handle permission; badge is open to every member). */
@Injectable({ providedIn: 'root' })
export class DeskService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/desk';

  badge(): Observable<DeskBadge> {
    return this.api.get<DeskBadge>(`${this.path}/badge`, undefined, { quiet: true });
  }

  state(): Observable<DeskState> {
    return this.api.get<DeskState>(`${this.path}/state`, undefined, { quiet: true });
  }

  accept(requestId: number): Observable<DeskSession> {
    return this.api.post<DeskSession>(`${this.path}/requests/${requestId}/accept`, {});
  }

  decline(requestId: number): Observable<unknown> {
    return this.api.post(`${this.path}/requests/${requestId}/decline`, {});
  }

  messages(sessionId: number, after?: number): Observable<{ session: DeskSession; messages: DeskMessage[] }> {
    return this.api.get<{ session: DeskSession; messages: DeskMessage[] }>(
      `${this.path}/sessions/${sessionId}/messages`,
      { after: after || undefined },
      { quiet: true },
    );
  }

  reply(sessionId: number, text: string): Observable<{ id: number; at: string }> {
    return this.api.post<{ id: number; at: string }>(`${this.path}/sessions/${sessionId}/messages`, { text });
  }

  resolve(sessionId: number, resumeAi: boolean): Observable<unknown> {
    return this.api.post(`${this.path}/sessions/${sessionId}/resolve`, { resumeAi });
  }

  assign(sessionId: number, userId: string): Observable<unknown> {
    return this.api.post(`${this.path}/sessions/${sessionId}/assign`, { userId });
  }

  recordAi(recordId: string): Observable<{ session: DeskSession | null }> {
    return this.api.get<{ session: DeskSession | null }>(`${this.path}/records/${recordId}/ai`, undefined, {
      quiet: true,
    });
  }

  applySuggestion(sessionId: number): Observable<unknown> {
    return this.api.post(`${this.path}/sessions/${sessionId}/apply-suggestion`, {});
  }

  dismissSuggestion(sessionId: number): Observable<unknown> {
    return this.api.post(`${this.path}/sessions/${sessionId}/dismiss-suggestion`, {});
  }
}
