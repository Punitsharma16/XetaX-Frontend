import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AiChatService } from '../../../features/ai/ai-chat.service';
import { renderAiMarkdown } from '../../../features/ai/ai-markdown.util';
import { AiExecutionCardComponent, AiExecutionStep } from './ai-execution-card.component';

interface PanelMessage {
  id: number;
  role: 'user' | 'ai';
  text: string;
  html?: string;
  failed?: boolean;
}

/**
 * Contextual AI drawer.
 *
 * Every CRM page embeds this with its OWN suggestions and its own
 * conversation (storageKey), so "Ask AI" stays on the page instead of jumping
 * to the global AI workspace. The page passes what the assistant should offer
 * (suggestions) and reloads its data via (answered) after the assistant acts.
 */
@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [FormsModule, AiExecutionCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open) {
      <div class="aip-backdrop" (click)="close()"></div>
      <aside class="aip">
        <header class="aip__head">
          <span class="aip__spark"><i class="bi bi-stars"></i></span>
          <div class="min-w-0">
            <div class="aip__title text-truncate">AI Assistant</div>
            <div class="aip__context text-truncate">{{ contextLabel }}</div>
          </div>
          @if (messages().length) {
            <button type="button" class="btn btn-sm btn-outline-secondary aip__reset" (click)="reset()" title="New conversation">
              <i class="bi bi-plus-circle"></i>
            </button>
          }
          <button type="button" class="btn-close aip__close" (click)="close()" aria-label="Close"></button>
        </header>

        <div class="aip__scroll" #pane>
          @if (!messages().length) {
            <p class="aip__hint">Try one of these, or ask in your own words:</p>
            <div class="aip__prompts">
              @for (prompt of suggestions; track prompt) {
                <button type="button" class="aip__chip" (click)="send(prompt)">
                  <i class="bi bi-stars"></i> {{ prompt }}
                </button>
              }
            </div>
          }
          @for (message of messages(); track message.id) {
            @if (message.role === 'user') {
              <div class="aip-msg aip-msg--user"><div class="aip-msg__bubble">{{ message.text }}</div></div>
            } @else if (message.failed) {
              <div class="aip-msg">
                <div class="aip-msg__bubble aip-msg__bubble--error">
                  <i class="bi bi-exclamation-triangle me-1"></i>{{ message.text }}
                  <div class="mt-2">
                    <button type="button" class="btn btn-sm btn-outline-danger" (click)="retry()" [disabled]="busy()">
                      <i class="bi bi-arrow-clockwise"></i> Retry
                    </button>
                  </div>
                </div>
              </div>
            } @else {
              <div class="aip-msg"><div class="aip-msg__bubble ai-md" [innerHTML]="message.html"></div></div>
            }
          }
          @if (busy()) {
            <app-ai-execution-card title="Working on it" [steps]="steps()" />
          }
        </div>

        <footer class="aip__composer">
          <textarea
            class="form-control"
            rows="1"
            [placeholder]="placeholder"
            [ngModel]="draft()"
            (ngModelChange)="draft.set($event)"
            (keydown)="onKeydown($event)"
            [disabled]="busy()"
          ></textarea>
          <button type="button" class="btn btn-ai aip__send" (click)="send()" [disabled]="busy() || !draft().trim()">
            @if (busy()) {
              <span class="spinner-border spinner-border-sm"></span>
            } @else {
              <i class="bi bi-send-fill"></i>
            }
          </button>
        </footer>
      </aside>
    }
  `,
  styles: [
    `
      .aip-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 18, 34, 0.35);
        z-index: 1050;
      }
      .aip {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(430px, 100vw);
        background: var(--bs-body-bg);
        border-left: 1px solid var(--bs-border-color);
        box-shadow: -12px 0 32px rgba(15, 18, 34, 0.18);
        z-index: 1055;
        display: flex;
        flex-direction: column;
      }
      .aip__head {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 0.8rem 1rem;
        border-bottom: 1px solid var(--bs-border-color);
      }
      .aip__spark {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 10px;
        color: #fff;
        background: linear-gradient(135deg, var(--brand-500), var(--brand-700));
      }
      .aip__title {
        font-weight: 700;
        font-size: 0.85rem;
      }
      .aip__context {
        font-size: 0.72rem;
        color: var(--bs-secondary-color);
      }
      .aip__reset {
        margin-left: auto;
      }
      .aip__close {
        flex: 0 0 auto;
      }
      .aip__head .min-w-0 {
        min-width: 0;
        flex: 1 1 auto;
      }
      .aip__scroll {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 0.9rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }
      .aip__hint {
        font-size: 0.76rem;
        color: var(--bs-secondary-color);
        margin: 0;
      }
      .aip__prompts {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        align-items: flex-start;
      }
      .aip__chip {
        border: 1px solid var(--brand-200);
        background: var(--bs-body-bg);
        color: var(--brand-700);
        border-radius: var(--radius-pill);
        padding: 0.3rem 0.7rem;
        font-size: 0.76rem;
        cursor: pointer;
        text-align: left;
      }
      .aip__chip:hover {
        background: var(--brand-50);
        border-color: var(--brand-400);
      }
      .aip__chip i {
        font-size: 0.65rem;
        margin-right: 0.2rem;
      }
      .aip-msg {
        display: flex;
      }
      .aip-msg--user {
        justify-content: flex-end;
      }
      .aip-msg__bubble {
        max-width: 92%;
        border-radius: var(--radius-lg);
        padding: 0.5rem 0.7rem;
        font-size: 0.8rem;
        line-height: 1.45;
        word-break: break-word;
        background: var(--bs-tertiary-bg, #f6f7f9);
        border: 1px solid var(--bs-border-color);
      }
      .aip-msg--user .aip-msg__bubble {
        background: var(--brand-600);
        border-color: var(--brand-600);
        color: #fff;
        white-space: pre-wrap;
      }
      .aip-msg__bubble--error {
        background: var(--bs-danger-bg-subtle, #f8d7da);
        border-color: var(--bs-danger-border-subtle, #f1aeb5);
      }
      .aip__composer {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
        padding: 0.7rem 0.9rem;
        border-top: 1px solid var(--bs-border-color);
      }
      .aip__composer textarea {
        resize: none;
        max-height: 100px;
        font-size: 0.8rem;
      }
      .aip__send {
        flex: 0 0 auto;
        width: 40px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
      }
    `,
  ],
})
export class AiPanelComponent implements OnDestroy {
  private readonly ai = inject(AiChatService);

  @Input({ required: true }) open = false;
  /** Shown under the title, e.g. "Forms" or "Records · Sales Leads". */
  @Input({ required: true }) contextLabel = '';
  /** Page-specific suggested prompts. */
  @Input() suggestions: string[] = [];
  /** Distinct conversation per page context, e.g. 'forms', 'records:leads'. */
  @Input({ required: true }) storageKey = 'default';
  @Input() placeholder = 'Ask or instruct the assistant…';

  @Output() closed = new EventEmitter<void>();
  /** Fires after every successful answer so the host page can reload data. */
  @Output() answered = new EventEmitter<void>();

  readonly messages = signal<PanelMessage[]>([]);
  readonly busy = signal(false);
  readonly draft = signal('');
  readonly steps = signal<AiExecutionStep[]>([]);

  private conversationId = '';
  private nextId = 1;
  private timers: ReturnType<typeof setTimeout>[] = [];
  private restoredKey = '';

  ngOnDestroy(): void {
    this.timers.forEach(clearTimeout);
  }

  private get storage(): string {
    return `xetax.ai.panel.${this.storageKey}`;
  }

  private ensureRestored(): void {
    if (this.restoredKey === this.storageKey) return;
    this.restoredKey = this.storageKey;
    try {
      const stored = JSON.parse(localStorage.getItem(this.storage) ?? 'null');
      this.conversationId = stored?.conversationId || crypto.randomUUID();
      this.messages.set(
        (stored?.messages ?? []).map((m: PanelMessage) => ({
          ...m,
          id: this.nextId++,
          html: m.role === 'ai' && !m.failed ? renderAiMarkdown(m.text) : undefined,
        })),
      );
    } catch {
      this.conversationId = crypto.randomUUID();
    }
  }

  close(): void {
    this.closed.emit();
  }

  reset(): void {
    this.ensureRestored();
    this.messages.set([]);
    this.conversationId = crypto.randomUUID();
    this.persist();
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  send(text?: string): void {
    this.ensureRestored();
    const message = (text ?? this.draft()).trim();
    if (!message || this.busy()) return;
    this.draft.set('');
    this.push({ role: 'user', text: message });
    this.request(message);
  }

  retry(): void {
    this.ensureRestored();
    if (this.busy()) return;
    const lastUser = [...this.messages()].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;
    this.messages.update((list) => list.filter((m) => !(m.role === 'ai' && m.failed)));
    this.request(lastUser.text);
  }

  private request(message: string): void {
    this.busy.set(true);
    this.steps.set([
      { label: 'Understanding your request', state: 'running' },
      { label: 'Working in your CRM', state: 'pending' },
      { label: 'Composing the answer', state: 'pending' },
    ]);
    this.timers.push(
      setTimeout(() => this.advance(0), 1200),
      setTimeout(() => this.advance(1), 6000),
    );

    this.ai.chat(message, this.conversationId).subscribe({
      next: (res) => {
        this.stopProgress();
        this.push({ role: 'ai', text: res?.response ?? '' });
        this.busy.set(false);
        this.answered.emit();
      },
      error: (err) => {
        this.stopProgress();
        const friendly =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : 'The AI assistant could not answer right now.';
        this.push({ role: 'ai', text: friendly, failed: true });
        this.busy.set(false);
      },
    });
  }

  private advance(index: number): void {
    this.steps.update((steps) =>
      steps.map((s, i) =>
        i === index ? { ...s, state: 'completed' } : i === index + 1 ? { ...s, state: 'running' } : s,
      ),
    );
  }

  private stopProgress(): void {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    this.steps.set([]);
  }

  private push(message: Omit<PanelMessage, 'id' | 'html'>): void {
    this.messages.update((list) => [
      ...list,
      {
        ...message,
        id: this.nextId++,
        html: message.role === 'ai' && !message.failed ? renderAiMarkdown(message.text) : undefined,
      },
    ]);
    this.persist();
    queueMicrotask(() => {
      const pane = document.querySelector('.aip__scroll');
      if (pane) pane.scrollTop = pane.scrollHeight;
    });
  }

  private persist(): void {
    const messages = this.messages()
      .slice(-40)
      .map((m) => ({ role: m.role, text: m.text, failed: m.failed }));
    localStorage.setItem(this.storage, JSON.stringify({ conversationId: this.conversationId, messages }));
  }
}
