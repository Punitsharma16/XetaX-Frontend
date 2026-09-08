import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Page } from '../../core/models/api.model';
import { CrmApiService } from '../../core/services/crm-api.service';

export interface Meeting {
  id: number;
  title: string;
  roomCode: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  recordId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  guestLink: string;
  hostLink: string;
  createdAt: string | null;
  noteCount: number;
  invitees: MeetingInvitee[];
}

export interface MeetingInvitee {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface MeetingNote {
  id: number;
  content: string;
  createdAt: string;
}

export interface MeetingCreateRequest {
  title: string;
  scheduledAt?: string;
  recordId?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  invitees?: { name?: string; phone?: string; email?: string }[];
}

/** Video meetings API — /api/meetings (owner-scoped by JWT). */
@Injectable({ providedIn: 'root' })
export class MeetingService {
  private readonly api = inject(CrmApiService);
  private readonly path = '/api/meetings';

  create(request: MeetingCreateRequest): Observable<Meeting> {
    return this.api.post<Meeting>(this.path, request);
  }

  list(page = 0, size = 50): Observable<Page<Meeting>> {
    return this.api.get<Page<Meeting>>(this.path, { page, size });
  }

  get(id: number): Observable<Meeting> {
    return this.api.get<Meeting>(`${this.path}/${id}`);
  }

  /** Room page: succeeds only for the owner — how we detect "I am the host". */
  byCode(roomCode: string): Observable<Meeting> {
    return this.api.get<Meeting>(`${this.path}/by-code/${roomCode}`, undefined, { quiet: true });
  }

  cancel(id: number): Observable<Meeting> {
    return this.api.post<Meeting>(`${this.path}/${id}/cancel`, {});
  }

  end(id: number): Observable<Meeting> {
    return this.api.post<Meeting>(`${this.path}/${id}/end`, {});
  }

  share(
    id: number,
    channel: 'WHATSAPP' | 'EMAIL',
    inviteeId?: number,
  ): Observable<{ sentCount: number; sent: string[]; failed: { to: string; reason: string }[] }> {
    return this.api.post(`${this.path}/${id}/share`, { channel, inviteeId });
  }

  notes(id: number): Observable<MeetingNote[]> {
    return this.api.get<MeetingNote[]>(`${this.path}/${id}/notes`);
  }

  addNote(id: number, content: string): Observable<MeetingNote> {
    return this.api.post<MeetingNote>(`${this.path}/${id}/notes`, { content });
  }

  deleteNote(id: number, noteId: number): Observable<string> {
    return this.api.delete(`${this.path}/${id}/notes/${noteId}`);
  }

  /** Guest join page info (public endpoint, token-gated). */
  publicInfo(roomCode: string, token: string): Observable<{ title: string; status: string; scheduledAt: string }> {
    return this.api.get<{ title: string; status: string; scheduledAt: string }>(
      `/api/public/meetings/${roomCode}`,
      { t: token },
      { quiet: true },
    );
  }
}
