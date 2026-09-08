import {
  AfterViewChecked,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ConfirmService } from '../../../core/services/confirm.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import {
  AiExecutionCardComponent,
  AiExecutionStep,
} from '../../../shared/components/ai/ai-execution-card.component';
import { AiUsagePanelComponent } from '../../billing/ai-usage-panel.component';
import { AiChatService } from '../ai-chat.service';
import { renderAiMarkdown } from '../ai-markdown.util';

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  html?: string;
  failed?: boolean;
}

interface StoredConversation {
  conversationId: string;
  messages: { role: 'user' | 'ai'; text: string; failed?: boolean }[];
}

const STORAGE_KEY = 'xetax.ai.conversation';
const MAX_STORED_MESSAGES = 60;

const SUGGESTED_PROMPTS = [
  'Show my forms',
  'Create a new form',
  'Explain my Support Tickets form',
  'Show my form stages',
  'Create fields for my form',
];

/**
 * AI Workspace — the assistant's home.
 *
 * Natural-language interface over the CRM: the backend resolves the signed-in
 * user, runs Spring AI tool calls (forms, fields, stages, automations,
 * records) and answers with the result. While a request is in flight an
 * execution card shows progress states; because the backend returns one final
 * answer (no streaming / tool events yet), the card's steps are a progress
 * indicator, not a live tool feed — the layout is ready for real events.
 */
@Component({
  selector: 'app-ai-workspace',
  standalone: true,
  imports: [FormsModule, PageHeaderComponent, AiExecutionCardComponent, AiUsagePanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ai-workspace.component.html',
  styleUrl: './ai-workspace.component.css',
})
export class AiWorkspaceComponent implements AfterViewChecked, OnDestroy {
  private readonly ai = inject(AiChatService);
  private readonly confirm = inject(ConfirmService);

  /** Optional prefill from contextual "Ask AI" buttons (?q=...). */
  readonly q = input<string | undefined>(undefined);

  @ViewChild('scrollPane') private scrollPane?: ElementRef<HTMLElement>;

  readonly prompts = SUGGESTED_PROMPTS;

  readonly messages = signal<ChatMessage[]>([]);
  readonly busy = signal(false);
  readonly draft = signal('');
  readonly steps = signal<AiExecutionStep[]>([]);

  readonly hasFailedTail = computed(() => {
    const list = this.messages();
    return list.length > 0 && list[list.length - 1].failed === true;
  });

  private conversationId = '';
  private nextId = 1;
  private stepTimers: ReturnType<typeof setTimeout>[] = [];
  private shouldScroll = false;
  private prefillApplied = false;

  constructor() {
    this.restore();
  }

  ngAfterViewChecked(): void {
    if (!this.prefillApplied) {
      this.prefillApplied = true;
      const prefill = this.q();
      if (prefill && !this.draft()) this.draft.set(prefill);
    }
    if (this.shouldScroll && this.scrollPane) {
      this.scrollPane.nativeElement.scrollTop = this.scrollPane.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }

  // ---------------------------------------------------------------- actions

  send(text?: string): void {
    const message = (text ?? this.draft()).trim();
    if (!message || this.busy()) return;

    this.draft.set('');
    this.push({ role: 'user', text: message });
    this.request(message);
  }

  /** Re-runs the last user message after a failure (drops the failed bubble). */
  retry(): void {
    if (this.busy()) return;
    const list = this.messages();
    const lastUser = [...list].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    this.messages.set(list.filter((m) => !(m.role === 'ai' && m.failed)));
    this.request(lastUser.text);
  }

  clearConversation(): void {
    this.confirm
      .ask({
        title: 'Start a new conversation?',
        message: 'The assistant will forget this conversation on your screen.',
        confirmText: 'New conversation',
        variant: 'danger',
      })
      .subscribe((ok) => {
        if (!ok) return;
        this.messages.set([]);
        this.conversationId = crypto.randomUUID();
        this.persist();
      });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  // ---------------------------------------------------------------- request

  private request(message: string): void {
    this.busy.set(true);
    this.startProgress();

    // Stream-first: tokens paint as they arrive. Falls back to the classic
    // one-shot endpoint if streaming is unavailable.
    let streamed = '';
    this.ai
      .chatStream(message, this.conversationId, (token) => {
        if (!streamed) {
          this.finishProgress();
          this.push({ role: 'ai', text: '' });
        }
        streamed += token;
        this.updateLastAi(streamed);
      })
      .then(() => {
        if (!streamed) this.requestFallback(message);
        else this.busy.set(false);
      })
      .catch(() => {
        if (streamed) {
          this.busy.set(false);
        } else {
          this.requestFallback(message);
        }
      });
  }

  /** Replace the text of the last (streaming) assistant bubble. */
  private updateLastAi(text: string): void {
    this.messages.update((list) => {
      const next = [...list];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i].role === 'ai') {
          next[i] = { ...next[i], text };
          break;
        }
      }
      return next;
    });
    this.shouldScroll = true;
    this.persist();
  }

  private requestFallback(message: string): void {
    this.ai.chat(message, this.conversationId).subscribe({
      next: (res) => {
        this.finishProgress();
        this.push({ role: 'ai', text: res?.response ?? '' });
        this.busy.set(false);
      },
      error: (err) => {
        this.clearTimers();
        const friendly =
          err?.error?.message && typeof err.error.message === 'string'
            ? err.error.message
            : 'The AI assistant could not answer right now.';
        this.push({ role: 'ai', text: friendly, failed: true });
        this.busy.set(false);
      },
    });
  }

  /* Presentational progress: the backend answers in a single response, so
     these states pace the wait rather than mirror real tool events. */
  private startProgress(): void {
    this.clearTimers();
    this.steps.set([
      { label: 'Understanding your request', state: 'running' },
      { label: 'Working in your CRM', state: 'pending' },
      { label: 'Composing the answer', state: 'pending' },
    ]);
    this.stepTimers.push(
      setTimeout(() => this.advance(0), 1200),
      setTimeout(() => this.advance(1), 6000),
    );
  }

  private advance(index: number): void {
    this.steps.update((steps) =>
      steps.map((s, i) =>
        i === index ? { ...s, state: 'completed' } : i === index + 1 ? { ...s, state: 'running' } : s,
      ),
    );
  }

  private finishProgress(): void {
    this.clearTimers();
    this.steps.set([]);
  }

  private clearTimers(): void {
    this.stepTimers.forEach(clearTimeout);
    this.stepTimers = [];
  }

  // ---------------------------------------------------------------- storage

  private push(message: Omit<ChatMessage, 'id' | 'html'>): void {
    const entry: ChatMessage = {
      ...message,
      id: this.nextId++,
      html: message.role === 'ai' && !message.failed ? renderAiMarkdown(message.text) : undefined,
    };
    this.messages.update((list) => [...list, entry]);
    this.shouldScroll = true;
    this.persist();
  }

  private restore(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const stored: StoredConversation | null = raw ? JSON.parse(raw) : null;
      this.conversationId = stored?.conversationId || crypto.randomUUID();
      const messages = (stored?.messages ?? []).map((m) => ({
        id: this.nextId++,
        role: m.role,
        text: m.text,
        failed: m.failed,
        html: m.role === 'ai' && !m.failed ? renderAiMarkdown(m.text) : undefined,
      }));
      this.messages.set(messages);
      this.shouldScroll = messages.length > 0;
    } catch {
      this.conversationId = crypto.randomUUID();
    }
  }

  private persist(): void {
    const messages = this.messages()
      .slice(-MAX_STORED_MESSAGES)
      .map((m) => ({ role: m.role, text: m.text, failed: m.failed }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversationId: this.conversationId, messages }));
  }
}
