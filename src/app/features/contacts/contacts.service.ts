import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../core/models/api.model';
import { CrmApiService } from '../../core/services/crm-api.service';

export interface Contact {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ContactPage {
  content: Contact[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface EmailLogEntry {
  id: number;
  toEmail: string;
  subject: string | null;
  body: string | null;
  status: 'SENT' | 'FAILED';
  error: string | null;
  createdAt: string | null;
}

export interface BulkResult {
  sent: number;
  failed: number;
  failedNames: string[];
}

export type ContactInput = Pick<Contact, 'name' | 'phone' | 'email' | 'company' | 'address' | 'notes'>;

/** Address book — CRUD + per-contact / bulk WhatsApp & email. */
@Injectable({ providedIn: 'root' })
export class ContactsService {
  private readonly api = inject(CrmApiService);
  private readonly http = inject(HttpClient);

  list(query: string, page = 0, size = 100): Observable<ContactPage> {
    return this.api.get<ContactPage>('/api/contacts', { query: query || undefined, page, size }, { quiet: true });
  }

  get(id: number): Observable<Contact> {
    return this.api.get<Contact>(`/api/contacts/${id}`, undefined, { quiet: true });
  }

  create(input: ContactInput): Observable<Contact> {
    return this.api.post<Contact>('/api/contacts', input);
  }

  update(id: number, input: ContactInput): Observable<Contact> {
    return this.api.put<Contact>(`/api/contacts/${id}`, input);
  }

  delete(id: number): Observable<unknown> {
    return this.api.delete(`/api/contacts/${id}`);
  }

  emailHistory(id: number): Observable<EmailLogEntry[]> {
    return this.api.get<EmailLogEntry[]>(`/api/contacts/${id}/emails`, undefined, { quiet: true });
  }

  sendEmail(id: number, subject: string, body: string): Observable<unknown> {
    return this.api.post(`/api/contacts/${id}/email`, { subject, body });
  }

  sendWhatsApp(id: number, message: string): Observable<unknown> {
    return this.api.post(`/api/contacts/${id}/whatsapp`, { message });
  }

  bulkEmail(ids: number[], subject: string, body: string): Observable<BulkResult> {
    return this.api.post<BulkResult>('/api/contacts/bulk-email', { ids, subject, body });
  }

  bulkWhatsApp(
    ids: number[],
    message: string,
    templateName?: string,
    templateLanguage?: string,
  ): Observable<BulkResult> {
    return this.api.post<BulkResult>('/api/contacts/bulk-whatsapp', {
      ids,
      message,
      templateName,
      templateLanguage,
    });
  }

  /** CSV import — header: name, phone, email, company, address, notes. */
  importCsv(file: File): Observable<ContactImportResult> {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<ApiResponse<ContactImportResult>>(`${environment.crmBaseUrl}/api/contacts/import`, body)
      .pipe(map((res) => res.data));
  }

  /** All contacts as CSV — authed blob download. */
  exportCsv(): Observable<Blob> {
    return this.http.get(`${environment.crmBaseUrl}/api/contacts/export`, { responseType: 'blob' });
  }

  /** Contacts already holding this phone/email (duplicate warning). */
  duplicates(
    phone: string | null,
    email: string | null,
    excludeId?: number,
  ): Observable<{ id: number; name: string; phone: string; email: string }[]> {
    return this.api.get(
      '/api/contacts/duplicates',
      { phone: phone || undefined, email: email || undefined, excludeId },
      { quiet: true },
    );
  }
}

export interface ContactImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: string[];
}
