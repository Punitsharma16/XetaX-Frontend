import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CrmApiService } from '../../core/services/crm-api.service';

export interface DocumentFile {
  id: number;
  name: string;
  originalFilename: string;
  contentType: string | null;
  size: number | null;
  supportsVariables: boolean;
  createdAt: string;
}

export interface DocSendInput {
  channel: 'WHATSAPP' | 'EMAIL';
  phone?: string;
  to?: string;
  subject?: string;
  message?: string;
  recordId?: string;
  contactId?: number;
  personalize?: boolean;
}

export interface DocBulkResult {
  sent: number;
  failed: number;
  failedNames: string[];
}

/** Document library — upload once, attach to any WhatsApp/email send. */
@Injectable({ providedIn: 'root' })
export class DocumentService {
  private readonly api = inject(CrmApiService);
  private readonly http = inject(HttpClient);

  list(): Observable<DocumentFile[]> {
    return this.api.get<DocumentFile[]>('/api/documents', undefined, { quiet: true });
  }

  upload(file: File, name: string): Observable<DocumentFile> {
    const form = new FormData();
    form.append('file', file);
    if (name.trim()) form.append('name', name.trim());
    return this.http
      .post<{ data: DocumentFile }>(`${environment.crmBaseUrl}/api/documents`, form)
      .pipe(map((res) => res.data));
  }

  delete(id: number): Observable<unknown> {
    return this.api.delete(`/api/documents/${id}`);
  }

  downloadUrl(id: number, recordId?: string): string {
    const base = `${environment.crmBaseUrl}/api/documents/${id}/download`;
    return recordId ? `${base}?recordId=${recordId}` : base;
  }

  send(id: number, input: DocSendInput): Observable<unknown> {
    return this.api.post(`/api/documents/${id}/send`, input);
  }

  sendBulk(
    id: number,
    recordIds: string[],
    channel: 'WHATSAPP' | 'EMAIL',
    subject: string | undefined,
    message: string | undefined,
    personalize: boolean,
  ): Observable<DocBulkResult> {
    return this.api.post<DocBulkResult>(`/api/documents/${id}/send-bulk`, {
      recordIds,
      channel,
      subject,
      message,
      personalize,
    });
  }
}
