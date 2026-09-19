import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface BookingPage {
  id: number;
  formId: number | null;
  publicKey: string;
  enabled: boolean;
  title: string | null;
  tagline: string | null;
  note: string | null;
  slotMinutes: number;
  /** The page customers open. */
  publicUrl: string;
  /** The QR image; add ?download=true, ?size=. */
  qrUrl: string;
}

export interface BookingForm {
  id: number;
  name: string;
  slug: string;
}

export interface BookingStaff {
  id: number;
  name: string;
  role: string | null;
  active: boolean;
  sortOrder: number;
}

export type SlotStatus = 'OPEN' | 'BOOKED' | 'BLOCKED';

export interface BookingSlot {
  id: number;
  staffId: number;
  staffName: string | null;
  /** ISO date, e.g. 2026-09-21. */
  date: string;
  /** 24h time, e.g. 11:30:00. */
  time: string;
  durationMinutes: number;
  status: SlotStatus;
  customerName: string | null;
  customerPhone: string | null;
  service: string | null;
  recordId: string | null;
  bookedVia: string | null;
}

export interface BookingOverview {
  page: BookingPage;
  bookingForms: BookingForm[];
  staff: BookingStaff[];
  slots: BookingSlot[];
}

export interface PageUpdate {
  formId?: number | null;
  enabled?: boolean;
  title?: string | null;
  tagline?: string | null;
  note?: string | null;
  slotMinutes?: number;
}

export interface StaffInput {
  name?: string;
  role?: string | null;
  active?: boolean;
  sortOrder?: number;
}

/** One call fills a stretch of diary for the chosen people. */
export interface SlotPlan {
  staffIds: number[];
  fromDate: string;
  toDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** 1 = Monday … 7 = Sunday. Empty means every day in the range. */
  weekdays?: number[];
}

/** The salon's diary: its people, their slots and the public booking page. */
@Injectable({ providedIn: 'root' })
export class BookingService {
  private readonly api = inject(CrmApiService);

  overview(): Observable<BookingOverview> {
    return this.api.get<BookingOverview>('/api/booking');
  }

  updatePage(update: PageUpdate): Observable<BookingPage> {
    return this.api.put<BookingPage>('/api/booking/page', update);
  }

  regenerateKey(): Observable<BookingPage> {
    return this.api.post<BookingPage>('/api/booking/page/regenerate-key', {});
  }

  createStaff(input: StaffInput): Observable<BookingStaff> {
    return this.api.post<BookingStaff>('/api/booking/staff', input);
  }

  updateStaff(id: number, input: StaffInput): Observable<BookingStaff> {
    return this.api.put<BookingStaff>(`/api/booking/staff/${id}`, input);
  }

  deleteStaff(id: number): Observable<unknown> {
    return this.api.delete(`/api/booking/staff/${id}`);
  }

  slots(from: string, to: string): Observable<BookingSlot[]> {
    return this.api.get<BookingSlot[]>('/api/booking/slots', { from, to });
  }

  addSlots(plan: SlotPlan): Observable<{ added: number; alreadyThere: number }> {
    return this.api.post<{ added: number; alreadyThere: number }>('/api/booking/slots', plan);
  }

  deleteSlot(id: number): Observable<unknown> {
    return this.api.delete(`/api/booking/slots/${id}`);
  }

  setBlocked(id: number, blocked: boolean): Observable<BookingSlot> {
    return this.api.put<BookingSlot>(`/api/booking/slots/${id}/blocked?blocked=${blocked}`, {});
  }

  cancelBooking(id: number): Observable<BookingSlot> {
    return this.api.post<BookingSlot>(`/api/booking/slots/${id}/cancel`, {});
  }
}
