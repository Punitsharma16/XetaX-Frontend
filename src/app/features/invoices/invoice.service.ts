import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from '../../core/models/api.model';
import { CrmApiService } from '../../core/services/crm-api.service';

export interface InvoiceItem {
  id?: number;
  description: string;
  hsn?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
  sortOrder?: number;
}

export interface Invoice {
  id: number;
  number: string;
  contactId: number | null;
  recordId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  status: 'DRAFT' | 'SENT' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  discount: number;
  total: number;
  amountPaid: number;
  notes: string | null;
  customerGstin: string | null;
  sellerGstin: string | null;
  gstMode: 'INTRA' | 'INTER' | null;
  roundOff: number;
  bankDetails: string | null;
  items: InvoiceItem[];
  createdAt: string | null;
}

export interface InvoicePayment {
  id: number;
  amount: number;
  paidOn: string;
  mode: string;
  reference: string | null;
  note: string | null;
}

export interface InvoiceSummary {
  invoiced: number;
  received: number;
  pending: number;
  overdue: number;
  draftCount: number;
  openCount: number;
  paidCount: number;
  totalCount: number;
}

export interface InvoiceInput {
  contactId?: number | null;
  recordId?: string | null;
  customerName?: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerAddress?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  taxPercent?: number;
  discount?: number;
  notes?: string | null;
  customerGstin?: string | null;
  sellerGstin?: string | null;
  gstMode?: string | null;
  bankDetails?: string | null;
  items: { description: string; quantity: number; unitPrice: number; hsn?: string; unit?: string }[];
}

/** Invoicing — totals are always computed server-side from the items. */
@Injectable({ providedIn: 'root' })
export class InvoiceService {
  private readonly api = inject(CrmApiService);
  private readonly http = inject(HttpClient);
  private readonly path = '/api/invoices';

  list(filters: {
    status?: string;
    q?: string;
    fromDate?: string;
    toDate?: string;
    page?: number;
    size?: number;
  }): Observable<Page<Invoice>> {
    return this.api.get<Page<Invoice>>(this.path, {
      status: filters.status || undefined,
      q: filters.q || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      page: filters.page ?? 0,
      size: filters.size ?? 20,
    }, { quiet: true });
  }

  summary(): Observable<InvoiceSummary> {
    return this.api.get<InvoiceSummary>(`${this.path}/summary`, undefined, { quiet: true });
  }

  get(id: number): Observable<Invoice> {
    return this.api.get<Invoice>(`${this.path}/${id}`, undefined, { quiet: true });
  }

  payments(id: number): Observable<InvoicePayment[]> {
    return this.api.get<InvoicePayment[]>(`${this.path}/${id}/payments`, undefined, { quiet: true });
  }

  forContact(contactId: number): Observable<Invoice[]> {
    return this.api.get<Invoice[]>(`${this.path}/for-contact/${contactId}`, undefined, { quiet: true });
  }

  forRecord(recordId: string): Observable<Invoice[]> {
    return this.api.get<Invoice[]>(`${this.path}/for-record/${recordId}`, undefined, { quiet: true });
  }

  create(input: InvoiceInput): Observable<Invoice> {
    return this.api.post<Invoice>(this.path, input);
  }

  update(id: number, input: InvoiceInput): Observable<Invoice> {
    return this.api.put<Invoice>(`${this.path}/${id}`, input);
  }

  delete(id: number): Observable<unknown> {
    return this.api.delete(`${this.path}/${id}`);
  }

  cancel(id: number): Observable<Invoice> {
    return this.api.post<Invoice>(`${this.path}/${id}/cancel`, {});
  }

  recordPayment(id: number, payment: {
    amount: number;
    paidOn?: string;
    mode?: string;
    reference?: string;
    note?: string;
  }): Observable<Invoice> {
    return this.api.post<Invoice>(`${this.path}/${id}/payments`, payment);
  }

  send(id: number, channel: 'EMAIL' | 'WHATSAPP'): Observable<Invoice> {
    return this.api.post<Invoice>(`${this.path}/${id}/send`, { channel });
  }

  /** One sentence → structured items (metered like an assistant message). */
  aiDraft(prompt: string): Observable<{
    items: { description: string; quantity: number; unitPrice: number }[];
    taxPercent: number;
    discount: number;
    notes: string;
    customerName: string;
  }> {
    return this.api.post(`${this.path}/ai-draft`, { prompt });
  }

  /** Authed PDF download/preview. */
  pdf(id: number): Observable<Blob> {
    return this.http.get(`${environment.crmBaseUrl}${this.path}/${id}/pdf`, {
      responseType: 'blob',
    });
  }
}
