import { Injectable, inject, signal } from '@angular/core';

import { CrmApiService } from './crm-api.service';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** The bell — polls quietly so a backend blip never toasts. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(CrmApiService);

  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  start(): void {
    if (this.timer) return;
    this.refresh();
    this.timer = setInterval(() => this.refresh(), 60000);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  refresh(): void {
    this.api
      .get<{ unread: number; items: AppNotification[] }>('/api/notifications', undefined, { quiet: true })
      .subscribe({
        next: (feed) => {
          this.items.set(feed.items ?? []);
          this.unread.set(feed.unread ?? 0);
        },
        error: () => undefined,
      });
  }

  markRead(id: number): void {
    this.api.post(`/api/notifications/${id}/read`, {}).subscribe({
      next: () => this.refresh(),
      error: () => undefined,
    });
  }

  markAllRead(): void {
    this.api.post('/api/notifications/read-all', {}).subscribe({
      next: () => this.refresh(),
      error: () => undefined,
    });
  }
}
