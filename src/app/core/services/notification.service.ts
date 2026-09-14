import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';

import { CrmApiService } from './crm-api.service';
import { RealtimeService } from './realtime.service';

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** How often the bell refetches when the live socket is down. */
const POLL_MS = 60_000;
/**
 * And when it is up: the socket already announces every new notification, so
 * this is only a safety net for a frame lost to a flaky connection.
 */
const SAFETY_NET_MS = 300_000;

/** The bell — live over the socket, polling quietly whenever it is not. */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(CrmApiService);
  private readonly realtime = inject(RealtimeService);

  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;
  private liveSub: Subscription | null = null;
  private lastFetch = 0;

  start(): void {
    if (this.timer) return;
    this.refresh();
    this.timer = setInterval(() => this.tick(), POLL_MS);
    this.liveSub = this.realtime.on('notification').subscribe(() => this.refresh());
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.liveSub?.unsubscribe();
    this.liveSub = null;
  }

  /** Skip the fetch while the socket is healthy and one ran recently. */
  private tick(): void {
    const minGap = this.realtime.connected() ? SAFETY_NET_MS : POLL_MS;
    if (Date.now() - this.lastFetch < minGap - 500) return;
    this.refresh();
  }

  refresh(): void {
    this.lastFetch = Date.now();
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
