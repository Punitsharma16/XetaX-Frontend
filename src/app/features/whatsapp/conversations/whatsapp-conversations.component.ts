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

/**
 * Two-pane WhatsApp inbox: conversation list + selected thread. The open
 * thread polls every 10s (statuses arrive via webhooks/Kafka, so ticks and
 * replies show up without a manual refresh). "New chat" starts a thread by
 * phone number.
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './whatsapp-conversations.component.html',
  styleUrl: './whatsapp-conversations.component.css',
})
export class WhatsAppConversationsComponent implements OnDestroy {
  private readonly whatsapp = inject(WhatsAppService);
  private readonly toast = inject(ToastService);

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

  private pollTimer: ReturnType<typeof setInterval> | null = null;

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
    this.whatsapp.getTemplates().subscribe({
      next: (templates) =>
        this.templates.set(templates.filter((t) => t.status === 'APPROVED')),
      error: () => this.templates.set([]),
    });
  }

  ngOnDestroy(): void {
    this.stopPolling();
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

  open(conversation: WhatsAppConversation): void {
    this.selected.set(conversation);
    this.messages.set([]);
    this.loadMessages(conversation.id);
    this.stopPolling();
    this.pollTimer = setInterval(() => this.loadMessages(conversation.id, true), 10_000);
    // opening clears unread on the server; mirror it locally
    this.conversations.update((list) =>
      list.map((c) => (c.id === conversation.id ? { ...c, unreadCount: 0 } : c)),
    );
  }

  private loadMessages(conversationId: number, silent = false): void {
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
    this.sending.set(true);
    this.whatsapp
      .send({
        conversationId: conversation.id,
        templateName: this.replyTemplate,
        templateLanguage: template?.language,
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
