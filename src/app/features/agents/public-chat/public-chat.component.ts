import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, effect, inject, input, signal, viewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../../environments/environment';

interface ChatLine {
  who: 'bot' | 'me' | 'human' | 'sys';
  text: string;
}

/**
 * Hosted chat page (/chat/:key) — the same public agent the website widget
 * uses, but as a shareable link: full screen on phones, a centred card on
 * desktops. No login; plain HttpClient so the auth interceptor never bounces
 * an anonymous visitor to /login.
 *
 * Optional query params seed the visitor: ?name=&phone=&email=&src=campaign
 * — sent with every message; the backend only fills blanks, so it is safe to
 * repeat. Session id lives in localStorage so a reload keeps the thread.
 */
@Component({
  selector: 'app-public-chat',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './public-chat.component.html',
  styleUrl: './public-chat.component.css',
})
export class PublicChatComponent implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);

  readonly key = input.required<string>();

  readonly name = signal('Assistant');
  readonly color = signal('#4f46e5');
  readonly lines = signal<ChatLine[]>([]);
  readonly typing = signal(false);
  readonly waiting = signal(false);
  readonly notFound = signal(false);
  readonly busy = signal(false);
  draft = '';

  private readonly bodyEl = viewChild<ElementRef<HTMLElement>>('body');
  private sid = '';
  private mode: 'ai' | 'waiting' | 'human' | string = 'ai';
  private lastId = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private prefill: Record<string, string> = {};

  private get base(): string {
    return environment.crmBaseUrl.replace(/\/$/, '');
  }

  constructor() {
    effect(() => {
      const key = this.key();
      if (!key) return;
      this.sid = this.sessionFor(key);
      const qp = this.route.snapshot.queryParamMap;
      this.prefill = {};
      for (const [q, k] of [['name', 'name'], ['phone', 'phone'], ['email', 'email'], ['src', 'source'], ['source', 'source']] as const) {
        const v = qp.get(q);
        if (v) this.prefill[k] = v;
      }
      this.load(key);
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  private load(key: string): void {
    this.http.get<{ data?: { name?: string; themeColor?: string; welcomeMessage?: string } }>(
      `${this.base}/api/public/agents/${key}/info`,
    ).subscribe({
      next: (res) => {
        const d = res?.data ?? {};
        if (d.name) this.name.set(d.name);
        if (d.themeColor) this.color.set(d.themeColor);
        this.push('bot', d.welcomeMessage || 'Hi! How can I help?');
        this.poll(); // resume a human-handled thread after a reload
      },
      error: () => this.notFound.set(true),
    });
  }

  send(): void {
    const q = this.draft.trim();
    if (!q || this.busy()) return;
    this.draft = '';
    this.busy.set(true);
    this.push('me', q);
    if (this.mode === 'ai') this.typing.set(true);

    this.http.post<{ data?: { reply?: string; mode?: string } }>(
      `${this.base}/api/public/agents/${this.key()}/chat`,
      { sessionId: this.sid, message: q, ...this.prefill },
    ).subscribe({
      next: (res) => {
        this.typing.set(false);
        const d = res?.data ?? {};
        if (d.reply) this.push('bot', d.reply);
        this.setMode(d.mode || 'ai');
        this.busy.set(false);
      },
      error: () => {
        this.typing.set(false);
        this.push('bot', 'Network issue — please try again.');
        this.busy.set(false);
      },
    });
  }

  /** Lines the visitor hasn't seen (human replies, system notes) + current mode. */
  private poll(): void {
    this.http.get<{ data?: { messages?: { id: number; role: string; text: string }[]; mode?: string } }>(
      `${this.base}/api/public/agents/${this.key()}/updates`,
      { params: { sessionId: this.sid, after: String(this.lastId) } },
    ).subscribe({
      next: (res) => {
        const d = res?.data ?? {};
        for (const m of d.messages ?? []) {
          if (m.id > this.lastId) this.lastId = m.id;
          if (m.role === 'HUMAN') this.push('human', m.text);
          else if (m.role === 'AI') this.push('bot', m.text);
          else if (m.role === 'SYSTEM' && /joined/.test(m.text)) this.push('sys', m.text);
        }
        this.setMode(d.mode || 'ai');
      },
      error: () => { /* transient — next tick retries */ },
    });
  }

  private setMode(m: string): void {
    if (m === this.mode) return;
    this.mode = m;
    this.waiting.set(m === 'waiting');
    if (m !== 'ai') {
      if (!this.pollTimer) this.pollTimer = setInterval(() => this.poll(), 3000);
    } else {
      this.stopPolling();
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private push(who: ChatLine['who'], text: string): void {
    this.lines.update((l) => [...l, { who, text }]);
    setTimeout(() => {
      const el = this.bodyEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  private sessionFor(key: string): string {
    const k = `xtx-sid-${key}`;
    try {
      let sid = localStorage.getItem(k);
      if (!sid) {
        sid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(k, sid);
      }
      return sid;
    } catch {
      return 's' + Date.now();
    }
  }
}
