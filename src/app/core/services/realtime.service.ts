import { Injectable, inject, signal } from '@angular/core';
import { Observable, Subject, filter } from 'rxjs';

import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../authentication/token-storage.service';

/** A "something changed, go and read it" frame from /ws/app. */
export interface RealtimeEvent {
  type: string;
  [key: string]: unknown;
}

/** Proxies drop a silent socket, so say hello well inside the usual minute. */
const PING_MS = 25_000;
const FIRST_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

/**
 * The panel's live link to the backend.
 *
 * Nothing is ever sent through it but keepalives: the server pushes a tiny
 * frame naming what changed, and the feature that cares refetches through the
 * normal REST call. That keeps one code path for reading data and makes the
 * socket a pure latency improvement.
 *
 * It is deliberately failure-tolerant. A refused upgrade, a proxy that blocks
 * WebSockets, a backend restart — each ends with `connected()` false, and every
 * caller keeps its own poll running as the fallback, so the panel degrades to
 * exactly the behaviour it had before this service existed.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private readonly storage = inject(TokenStorageService);

  /** Callers slow their polling down while this is true. */
  readonly connected = signal(false);

  private socket: WebSocket | null = null;
  private readonly frames = new Subject<RealtimeEvent>();
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private attempt = 0;
  private wanted = false;

  /** Frames of one type, e.g. `on('whatsapp.inbound')`. */
  on(type: string): Observable<RealtimeEvent> {
    return this.frames.pipe(filter((event) => event.type === type));
  }

  start(): void {
    this.wanted = true;
    this.connect();
  }

  stop(): void {
    this.wanted = false;
    this.clearTimers();
    const socket = this.socket;
    this.socket = null;
    this.connected.set(false);
    if (socket) {
      socket.onclose = null;
      socket.onerror = null;
      try {
        socket.close();
      } catch {
        /* already gone */
      }
    }
  }

  private connect(): void {
    if (!this.wanted || this.socket) return;

    const token = this.storage.accessToken;
    if (!token) {
      // Signed out, or the session is mid-refresh — try again shortly.
      this.scheduleRetry();
      return;
    }

    let socket: WebSocket;
    try {
      socket = new WebSocket(this.url(token));
    } catch {
      this.scheduleRetry();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      this.attempt = 0;
      this.connected.set(true);
      this.pingTimer = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) socket.send('ping');
      }, PING_MS);
    };

    socket.onmessage = (event) => {
      const raw = typeof event.data === 'string' ? event.data : '';
      if (!raw || raw === 'pong') return;
      try {
        const frame = JSON.parse(raw) as RealtimeEvent;
        if (frame && typeof frame.type === 'string') this.frames.next(frame);
      } catch {
        /* a frame we cannot read is not worth dropping the socket for */
      }
    };

    socket.onerror = () => socket.close();

    socket.onclose = () => {
      this.socket = null;
      this.connected.set(false);
      this.clearTimers();
      this.scheduleRetry();
    };
  }

  /**
   * Exponential backoff with jitter. The jitter matters: after a backend
   * restart every open panel is trying to reconnect at once, and without it
   * they would all knock on the same second, over and over.
   */
  private scheduleRetry(): void {
    if (!this.wanted || this.retryTimer) return;
    const base = Math.min(MAX_RETRY_MS, FIRST_RETRY_MS * 2 ** this.attempt);
    this.attempt = Math.min(this.attempt + 1, 10);
    const delay = base / 2 + Math.random() * (base / 2);
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }

  private clearTimers(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private url(token: string): string {
    const base = environment.crmBaseUrl.replace(/^http/, 'ws').replace(/\/+$/, '');
    return `${base}/ws/app?token=${encodeURIComponent(token)}`;
  }
}
