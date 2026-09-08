import { ChangeDetectionStrategy, Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { PermissionService } from '../../core/services/permission.service';
import { ToastService } from '../../core/services/toast.service';
import { TeamService } from '../users/team.service';
import { WhatsAppConversation, WhatsAppService } from '../whatsapp/whatsapp.service';
import { DeskMessage, DeskService, DeskSession, DeskState, HandoffRow } from './desk.service';

type Tab = 'requests' | 'mine' | 'whatsapp';

/**
 * The floating Live Chat Desk (bottom-right of the panel). Shows only when
 * the workspace has a live AI agent or WhatsApp connected. Polls a tiny badge
 * endpoint (20s closed / 5s open) — no sockets, so it behaves the same behind
 * any proxy and for any number of tabs.
 */
@Component({
  selector: 'app-desk-widget',
  standalone: true,
  imports: [DatePipe, LowerCasePipe, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './desk-widget.component.html',
  styleUrl: './desk-widget.component.css',
})
export class DeskWidgetComponent implements OnDestroy {
  private readonly desk = inject(DeskService);
  private readonly perms = inject(PermissionService);
  private readonly toast = inject(ToastService);
  private readonly team = inject(TeamService);
  private readonly whatsapp = inject(WhatsAppService);
  private readonly router = inject(Router);

  readonly enabled = signal(false);
  readonly open = signal(false);
  readonly tab = signal<Tab>('requests');
  readonly openCount = signal(0);
  readonly mineCount = signal(0);
  readonly badge = computed(() => this.openCount() + this.mineCount());
  readonly canHandle = computed(() => this.perms.has('desk.handle'));

  readonly state = signal<DeskState | null>(null);
  readonly active = signal<DeskSession | null>(null);
  readonly messages = signal<DeskMessage[]>([]);
  readonly sending = signal(false);
  readonly assignees = signal<{ userId: string; name: string }[]>([]);
  readonly conversations = signal<WhatsAppConversation[]>([]);
  draft = '';
  assignTo = '';

  private badgeTimer: ReturnType<typeof setInterval> | null = null;
  private chatTimer: ReturnType<typeof setInterval> | null = null;
  private lastBadge = 0;
  private lastMessageId = 0;

  constructor() {
    this.refreshBadge();
    this.badgeTimer = setInterval(() => this.refreshBadge(), 20000);
    // Deep link from a bell notification: /app/…?desk=open
    effect(() => {
      if (this.router.url.includes('desk=open') && this.enabled() && !this.open()) this.toggle();
    });
  }

  ngOnDestroy(): void {
    if (this.badgeTimer) clearInterval(this.badgeTimer);
    this.stopChatPoll();
  }

  /* ------------------------------------------------------------ polling */

  private refreshBadge(): void {
    this.desk.badge().subscribe({
      next: (b) => {
        this.enabled.set(b.enabled);
        const total = b.open + b.mine;
        if (b.open > this.lastBadge && this.lastBadge >= 0 && !this.open()) {
          this.toast.info('A customer is waiting', 'Open the chat desk to reply.');
        }
        this.lastBadge = b.open;
        this.openCount.set(b.open);
        this.mineCount.set(b.mine);
        if (this.open() && total >= 0) this.loadState();
      },
      error: () => {},
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
    if (this.open()) {
      this.loadState();
      if (this.badgeTimer) clearInterval(this.badgeTimer);
      this.badgeTimer = setInterval(() => this.refreshBadge(), 5000);
    } else {
      this.closeChat();
      if (this.badgeTimer) clearInterval(this.badgeTimer);
      this.badgeTimer = setInterval(() => this.refreshBadge(), 20000);
    }
  }

  setTab(tab: Tab): void {
    this.tab.set(tab);
    if (tab === 'whatsapp' && !this.conversations().length) {
      this.whatsapp.conversations(0, 30).subscribe({
        next: (page) => this.conversations.set(page.content ?? []),
        error: () => {},
      });
    }
  }

  private loadState(): void {
    if (!this.canHandle()) return;
    this.desk.state().subscribe({
      next: (s) => {
        this.state.set(s);
        this.openCount.set(s.requests.length);
        this.mineCount.set(s.mine.length);
      },
      error: () => {},
    });
  }

  /* ------------------------------------------------------------ requests */

  accept(row: HandoffRow): void {
    this.desk.accept(row.id).subscribe({
      next: (session) => {
        this.toast.success("You're in the chat", `${session.customer} can see your replies now.`);
        this.loadState();
        this.openChat(session);
      },
      error: () => this.loadState(),
    });
  }

  decline(row: HandoffRow): void {
    this.desk.decline(row.id).subscribe({
      next: () => {
        this.toast.info('Handed back to the assistant');
        this.loadState();
      },
    });
  }

  /* ------------------------------------------------------------ chat pane */

  openChat(session: DeskSession): void {
    this.active.set(session);
    this.messages.set([]);
    this.lastMessageId = 0;
    this.tab.set('mine');
    this.pullMessages(true);
    this.stopChatPoll();
    this.chatTimer = setInterval(() => this.pullMessages(false), 3000);
    if (!this.assignees().length) {
      this.team.assignees().subscribe({ next: (list) => this.assignees.set(list), error: () => {} });
    }
  }

  closeChat(): void {
    this.active.set(null);
    this.stopChatPoll();
  }

  private stopChatPoll(): void {
    if (this.chatTimer) clearInterval(this.chatTimer);
    this.chatTimer = null;
  }

  private pullMessages(initial: boolean): void {
    const session = this.active();
    if (!session) return;
    this.desk.messages(session.id, initial ? undefined : this.lastMessageId).subscribe({
      next: (res) => {
        if (initial) this.messages.set(res.messages);
        else if (res.messages.length) this.messages.update((list) => [...list, ...res.messages]);
        const last = this.messages().at(-1);
        if (last) this.lastMessageId = last.id;
        this.active.set(res.session);
        queueMicrotask(() => {
          const pane = document.querySelector('.desk-thread');
          if (pane) pane.scrollTop = pane.scrollHeight;
        });
      },
      error: () => {},
    });
  }

  send(): void {
    const session = this.active();
    const text = this.draft.trim();
    if (!session || !text || this.sending()) return;
    this.sending.set(true);
    this.desk.reply(session.id, text).subscribe({
      next: () => {
        this.draft = '';
        this.sending.set(false);
        this.pullMessages(false);
      },
      error: () => this.sending.set(false),
    });
  }

  onKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  resolve(resumeAi: boolean): void {
    const session = this.active();
    if (!session) return;
    this.desk.resolve(session.id, resumeAi).subscribe({
      next: () => {
        this.toast.success(resumeAi ? 'Handed back to the assistant' : 'Chat closed', 'A summary will be saved on the record.');
        this.closeChat();
        this.loadState();
      },
    });
  }

  assign(): void {
    const session = this.active();
    if (!session || !this.assignTo) return;
    this.desk.assign(session.id, this.assignTo).subscribe({
      next: () => {
        this.toast.success('Assigned');
        this.assignTo = '';
        this.closeChat();
        this.loadState();
      },
    });
  }

  /* ------------------------------------------------------------ helpers */

  channelIcon(channel: string): string {
    return channel === 'WHATSAPP' ? 'bi-whatsapp' : 'bi-globe2';
  }

  waitingFor(iso: string): string {
    const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
    return mins < 1 ? 'just now' : mins === 1 ? '1 min' : `${mins} min`;
  }

  openInbox(conversation: WhatsAppConversation): void {
    this.open.set(false);
    this.router.navigate(['/app/whatsapp/conversations'], { queryParams: { c: conversation.id } });
  }
}
