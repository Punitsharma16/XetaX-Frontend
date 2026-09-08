import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';
import { EmailLogEntry } from '../contacts/contacts.service';

export interface WaChatMessage {
  id: number;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  body: string | null;
  templateName: string | null;
  status: string | null;
  createdAt: string | null;
}

/** Address-based communication — shared by contact & record detail pages. */
@Injectable({ providedIn: 'root' })
export class OutreachService {
  private readonly api = inject(CrmApiService);

  emails(to: string): Observable<EmailLogEntry[]> {
    return this.api.get<EmailLogEntry[]>('/api/outreach/emails', { to }, { quiet: true });
  }

  whatsappHistory(phone: string): Observable<WaChatMessage[]> {
    return this.api.get<WaChatMessage[]>('/api/outreach/whatsapp', { phone }, { quiet: true });
  }

  sendEmail(to: string, subject: string, body: string): Observable<unknown> {
    return this.api.post('/api/outreach/email', { to, subject, body });
  }

  sendWhatsApp(input: {
    phone: string;
    message?: string;
    templateName?: string;
    templateLanguage?: string;
    recordId?: string;
    buttonsJson?: string;
  }): Observable<unknown> {
    return this.api.post('/api/outreach/whatsapp', input);
  }
}
