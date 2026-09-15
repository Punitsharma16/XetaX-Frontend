import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { RealtimeService } from '../../../core/services/realtime.service';
import { ToastService } from '../../../core/services/toast.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent, ErrorStateComponent } from '../../../shared/components/state/state-views.component';
import {
  WhatsAppConversation,
  WhatsAppMessage,
  WhatsAppService,
  WhatsAppTemplate,
} from '../whatsapp.service';
import { WhatsAppNavComponent } from '../whatsapp-nav.component';
import { TemplateVariablesComponent, emptyVariables, templateSlots, variablesComplete } from '../template-variables.component';
import type { TemplateVariables } from '../whatsapp.service';

/**
 * Two-pane WhatsApp inbox: conversation list + selected thread.
 *
 * An incoming message arrives over the live socket, so a new chat or a reply
 * lands on screen as it happens. Both sides also keep a timer: it polls every
 * 10s while the socket is down, and drops to a slow safety-net refresh while
 * it is up, which is what makes a blocked WebSocket a non-event rather than a
 * broken inbox. "New chat" starts a thread by phone number.
 */
@Component({
  selector: 'app-whatsapp-conversations',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    WhatsAppNavComponent,
    TemplateVariablesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-conversations.component.html',
  styleUrl: './whatsapp-conversations.component.css',
})
export class WhatsAppConversationsComponent implements OnDestroy {
  private readonly whatsapp = inject(WhatsAppService);
  private readonly toast = inject(ToastService);
  private readonly realtime = inject(RealtimeService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly conversations = signal<WhatsAppConversation[]>([]);
  readonly selected = signal<WhatsAppConversation | null>(null);
  readonly messages = signal<WhatsAppMessage[]>([]);
  readonly sending = signal(false);
  readonly filter = signal('');

  draft = '';
  newChatOpen = signal(false);
  newPhone = '';

  /** Approved templates — the only way to reply once the 24h window closes. */
  readonly templates = signal<WhatsAppTemplate[]>([]);
  replyTemplate = '';
  /** Values for the reply template's variables. */
  replyVars: TemplateVariables | null = null;

  get replyTemplateObj() {
    return this.templates().find((t) => t.name === this.replyTemplate) ?? null;
  }

  /** Open thread → messages. */
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  /** Whole page → conversation list, so new chats arrive on their own. */
  private listTimer: ReturnType<typeof setInterval> | null = null;
  private liveSub: Subscription | null = null;
  private lastListFetch = 0;
  private lastMessageFetch = 0;

  /** Tick rate, and the gap each poll honours once the socket is live. */
  private static readonly POLL_MS = 10_000;
  private static readonly SAFETY_NET_MS = 60_000;

  readonly visibleConversations = computed(() => {
    const query = this.filter().trim().toLowerCase();
    const list = this.conversations();
    if (!query) return list;
    return list.filter(
      (c) =>
        c.customerPhone.includes(query) ||
        (c.customerName ?? '').toLowerCase().includes(query),
    );
  });

  constructor() {
    this.reload();
    this.listTimer = setInterval(
      () => this.listTick(),
      WhatsAppConversationsComponent.POLL_MS,
    );
    this.liveSub = this.realtime.on('whatsapp.inbound').subscribe((event) => {
      this.refreshConversations();
      // Already reading that thread? Pull the new message straight in.
      const openId = this.selected()?.id;
      if (openId != null && Number(event['conversationId']) === openId) {
        this.loadMessages(openId, true);
      }
    });
    this.whatsapp.getTemplates().subscribe({
      next: (templates) =>
        this.templates.set(templates.filter((t) => t.status === 'APPROVED')),
      error: () => this.templates.set([]),
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
    if (this.listTimer) {
      clearInterval(this.listTimer);
      this.listTimer = null;
    }
    this.liveSub?.unsubscribe();
    this.liveSub = null;
  }

  /** A timer tick is skipped while the socket is healthy and covering us. */
  private due(last: number): boolean {
    const gap = this.realtime.connected()
      ? WhatsAppConversationsComponent.SAFETY_NET_MS
      : WhatsAppConversationsComponent.POLL_MS;
    return Date.now() - last >= gap - 500;
  }

  private listTick(): void {
    if (this.due(this.lastListFetch)) this.refreshConversations();
  }

  private messageTick(conversationId: number): void {
    if (this.due(this.lastMessageFetch)) this.loadMessages(conversationId, true);
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(false);
    this.whatsapp.conversations(0, 100).subscribe({
      next: (page) => {
        this.conversations.set(page.content);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  /**
   * Background list refresh. Unlike reload() it never flips `loading` or
   * `error`, so the list neither blinks nor gets replaced by a retry screen
   * when one poll fails — the previous list simply stays on screen.
   */
  private refreshConversations(): void {
    this.lastListFetch = Date.now();
    this.whatsapp.conversations(0, 100, true).subscribe({
      next: (page) => {
        const openId = this.selected()?.id;
        const list = page.content.map((c) =>
          // Reading a thread clears its unread server-side; until that lands,
          // don't flash a badge on the conversation the user is looking at.
          c.id === openId ? { ...c, unreadCount: 0 } : c,
        );
        this.conversations.set(list);

        // Keep the open thread's header/window state in step with the server
        // (the 24h reply window can close, or the customer's name arrive).
        if (openId != null) {
          const fresh = list.find((c) => c.id === openId);
          if (fresh) this.selected.set(fresh);
        }
      },
      error: () => undefined,
    });
  }

  open(conversation: WhatsAppConversation): void {
    this.selected.set(conversation);
    this.messages.set([]);
    this.loadMessages(conversation.id);
    this.stopPolling();
    this.pollTimer = setInterval(
      () => this.messageTick(conversation.id),
      WhatsAppConversationsComponent.POLL_MS,
    );
    // opening clears unread on the server; mirror it locally
    this.conversations.update((list) =>
      list.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)),
    );
  }

  private loadMessages(conversationId: number, silent = false): void {
    this.lastMessageFetch = Date.now();
    this.whatsapp.conversationMessages(conversationId, 0, 100).subscribe({
      next: (page) => {
        // API returns newest-first; the thread renders oldest-first
        this.messages.set([...page.content].reverse());
      },
      error: () => {
        if (!silent) this.toast.error('Could not load messages');
      },
    });
  }

  sendAttachment(event: Event): void {
    const conversation = this.selected();
    const file = (event.target as HTMLInputElement).files?.[0];
    (event.target as HTMLInputElement).value = '';
    if (!conversation || !file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toast.warning('File badi hai', 'Max 5MB tak bhej sakte ho.');
      return;
    }
    this.sending.set(true);
    this.whatsapp.sendMedia(conversation.id, file, this.draft.trim() || undefined).subscribe({
      next: () => {
        this.sending.set(false);
        this.draft = '';
        this.toast.success('Media queued', file.name);
        this.loadMessages(conversation.id, true);
      },
      error: () => this.sending.set(false),
    });
  }

  sendReply(): void {
    const conversation = this.selected();
    if (!conversation) return;
    if (!conversation.windowOpen) {
      this.sendTemplateReply();
      return;
    }
    const text = this.draft.trim();
    if (!text) return;
    this.sending.set(true);
    this.whatsapp.send({ conversationId: conversation.id, message: text }).subscribe({
      next: () => {
        this.sending.set(false);
        this.draft = '';
        this.loadMessages(conversation.id, true);
      },
      error: () => this.sending.set(false),
    });
  }

  private sendTemplateReply(): void {
    const conversation = this.selected();
    if (!conversation || !this.replyTemplate) return;
    const template = this.templates().find((t) => t.name === this.replyTemplate);
    const slots = templateSlots(template);
    if (!variablesComplete(slots, template, this.replyVars ?? emptyVariables(slots))) {
      this.toast.warning('Fill every template variable', 'Each variable of this template needs a value.');
      return;
    }
    this.sending.set(true);
    this.whatsapp
      .send({
        conversationId: conversation.id,
        templateName: this.replyTemplate,
        templateLanguage: template?.language,
        templateVariables: this.replyVars ?? undefined,
      })
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.toast.success('Template sent');
          this.loadMessages(conversation.id, true);
        },
        error: () => this.sending.set(false),
      });
  }

  startNewChat(): void {
    const phone = this.newPhone.trim();
    const text = this.draft.trim();
    if (!phone || !text) {
      this.toast.warning('Missing details', 'Enter the phone number and a message.');
      return;
    }
    this.sending.set(true);
    this.whatsapp.send({ phone, message: text }).subscribe({
      next: () => {
        this.sending.set(false);
        this.draft = '';
        this.newPhone = '';
        this.newChatOpen.set(false);
        this.toast.success('Message queued');
        this.reload();
      },
      error: () => this.sending.set(false),
    });
  }

  statusIcon(message: WhatsAppMessage): string {
    switch (message.status) {
      case 'READ':
        return 'bi-check2-all text-primary';
      case 'DELIVERED':
        return 'bi-check2-all';
      case 'SENT':
        return 'bi-check2';
      case 'FAILED':
        return 'bi-exclamation-circle text-danger';
      default:
        return 'bi-clock';
    }
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
