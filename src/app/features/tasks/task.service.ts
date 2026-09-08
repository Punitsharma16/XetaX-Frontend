import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { CrmApiService } from '../../core/services/crm-api.service';

export interface TaskItem {
  id: number;
  title: string;
  notes: string | null;
  dueAt: string | null;
  status: 'OPEN' | 'DONE';
  contactId: number | null;
  recordId: string | null;
  linkedName: string | null;
  remindEmail: boolean;
  remindWhatsApp: boolean;
  createdAt: string;
  doneAt: string | null;
}

export interface TaskInput {
  title: string;
  notes?: string;
  dueAt?: string | null;
  contactId?: number | null;
  recordId?: string | null;
  linkedName?: string | null;
  remindEmail?: boolean;
  remindWhatsApp?: boolean;
}

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly api = inject(CrmApiService);

  mine(status: 'OPEN' | 'DONE'): Observable<TaskItem[]> {
    return this.api.get<TaskItem[]>('/api/tasks', { status }, { quiet: true });
  }

  forContact(contactId: number): Observable<TaskItem[]> {
    return this.api.get<TaskItem[]>(`/api/tasks/contact/${contactId}`, undefined, { quiet: true });
  }

  forRecord(recordId: string): Observable<TaskItem[]> {
    return this.api.get<TaskItem[]>(`/api/tasks/record/${recordId}`, undefined, { quiet: true });
  }

  create(input: TaskInput): Observable<TaskItem> {
    return this.api.post<TaskItem>('/api/tasks', input);
  }

  setDone(id: number, value: boolean): Observable<TaskItem> {
    return this.api.post<TaskItem>(`/api/tasks/${id}/done?value=${value}`, {});
  }

  delete(id: number): Observable<unknown> {
    return this.api.delete(`/api/tasks/${id}`);
  }
}
