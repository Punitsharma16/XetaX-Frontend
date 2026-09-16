import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TemplateButton } from './whatsapp.service';

/** One carousel card as the template modal holds it while being edited. */
export interface PreviewCard {
  body: string;
  examples: string;
  mediaUrl: string;
  sampleName?: string;
}

/**
 * The message as the customer will see it, drawn while it is being written.
 *
 * <p>Meta reviews a template from its rendered form, and a rejected template
 * costs a day, so the writer needs to see the real thing rather than a form.
 * Variables are filled with the example values entered alongside them — the
 * same values Meta is sent — and a variable with no example yet shows as a
 * chip, which is exactly the gap a reviewer would object to.
 */
@Component({
  selector: 'app-whatsapp-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wp">
      <div class="wp__phone">
        <div class="wp__bar">
          <i class="bi bi-chevron-left"></i>
          <span class="wp__avatar"></span>
          <span class="wp__who">Customer</span>
        </div>

        <div class="wp__canvas">
          <div class="wp__bubble">
            <!-- header -->
            @switch (headerKind()) {
              @case ('text') {
                <div class="wp__header">{{ filled(headerText()) }}</div>
              }
              @case ('image') {
                @if (mediaUrl()) {
                  <img class="wp__media" [src]="mediaUrl()" alt="Header" />
                } @else {
                  <div class="wp__media wp__media--empty"><i class="bi bi-image"></i></div>
                }
              }
              @case ('video') {
                <div class="wp__media wp__media--empty"><i class="bi bi-play-circle"></i></div>
              }
              @case ('document') {
                <div class="wp__doc">
                  <i class="bi bi-file-earmark-text"></i>
                  <span>{{ sampleName() || 'document.pdf' }}</span>
                </div>
              }
            }

            <!-- body -->
            @if (authentication()) {
              <div class="wp__body">{{ filled(body()) || 'Your verification code' }}</div>
              <div class="wp__body wp__code">123456</div>
              <div class="wp__footer">This code expires in 10 minutes.</div>
            } @else {
              <div class="wp__body" [innerHTML]="bodyHtml()"></div>
              @if (footer()) { <div class="wp__footer">{{ footer() }}</div> }
            }

            <div class="wp__time">{{ now }}</div>
          </div>

          <!-- carousel cards ride under the message, scrolled sideways -->
          @if (carousel() && cards().length) {
            <div class="wp__cards">
              @for (card of cards(); track $index) {
                <div class="wp__card">
                  @if (card.mediaUrl) {
                    <img class="wp__card-img" [src]="card.mediaUrl" alt="Card" />
                  } @else {
                    <div class="wp__card-img wp__card-img--empty"><i class="bi bi-image"></i></div>
                  }
                  <div class="wp__card-body" [innerHTML]="cardHtml(card)"></div>
                  @for (b of cardButtons(); track $index) {
                    <div class="wp__btn wp__btn--card">
                      <i class="bi" [class]="icon(b)"></i>{{ b.text || 'Button' }}
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- buttons sit outside the bubble, as WhatsApp draws them -->
          @if (authentication()) {
            <div class="wp__btn"><i class="bi bi-clipboard"></i>Copy code</div>
          } @else {
            @for (b of buttons(); track $index) {
              <div class="wp__btn"><i class="bi" [class]="icon(b)"></i>{{ b.text || 'Button' }}</div>
            }
          }
        </div>
      </div>

      @if (missingExamples() > 0) {
        <div class="wp__note">
          <i class="bi bi-exclamation-circle me-1"></i>
          {{ missingExamples() }} variable{{ missingExamples() === 1 ? '' : 's' }} still
          {{ missingExamples() === 1 ? 'has' : 'have' }} no example value — Meta rejects a
          template it cannot see filled in.
        </div>
      }
    </div>
  `,
  styles: [`
    .wp { position: sticky; top: 0; }
    .wp__phone {
      border: 1px solid var(--border-subtle, #dee2e6); border-radius: 14px;
      overflow: hidden; background: #ECE5DD; max-width: 320px; margin: 0 auto;
    }
    .wp__bar {
      display: flex; align-items: center; gap: 0.5rem;
      background: #075E54; color: #fff; padding: 0.5rem 0.65rem; font-size: 0.8rem;
    }
    .wp__avatar { width: 22px; height: 22px; border-radius: 50%; background: rgba(255,255,255,0.35); }
    .wp__who { font-weight: 600; }
    .wp__canvas { padding: 0.75rem 0.6rem; min-height: 180px; max-height: 60vh; overflow-y: auto; }
    .wp__bubble {
      background: #fff; border-radius: 8px; padding: 0.45rem 0.55rem;
      box-shadow: 0 1px 1px rgba(0,0,0,0.12); font-size: 0.8rem; color: #111b21;
      word-break: break-word; white-space: pre-wrap;
    }
    .wp__header { font-weight: 700; margin-bottom: 0.25rem; }
    .wp__media {
      width: 100%; border-radius: 6px; margin-bottom: 0.35rem; max-height: 150px; object-fit: cover;
    }
    .wp__media--empty {
      height: 110px; display: flex; align-items: center; justify-content: center;
      background: #dfe5e7; color: #8696a0; font-size: 1.6rem;
    }
    .wp__doc {
      display: flex; align-items: center; gap: 0.4rem; background: #f5f6f6;
      border-radius: 6px; padding: 0.4rem 0.5rem; margin-bottom: 0.35rem; font-size: 0.72rem;
    }
    .wp__body { white-space: pre-wrap; }
    .wp__code { font-weight: 700; letter-spacing: 3px; font-size: 1rem; margin-top: 0.2rem; }
    .wp__footer { color: #8696a0; font-size: 0.68rem; margin-top: 0.3rem; }
    .wp__time { color: #8696a0; font-size: 0.62rem; text-align: right; margin-top: 0.15rem; }
    .wp__btn {
      background: #fff; border-radius: 8px; margin-top: 3px; padding: 0.4rem;
      text-align: center; color: #00a5f4; font-size: 0.78rem;
      box-shadow: 0 1px 1px rgba(0,0,0,0.12);
    }
    .wp__btn i { margin-right: 0.3rem; }
    .wp__cards { display: flex; gap: 6px; overflow-x: auto; padding: 6px 0 2px; }
    .wp__card {
      flex: 0 0 62%; background: #fff; border-radius: 8px; padding: 0.35rem;
      box-shadow: 0 1px 1px rgba(0,0,0,0.12); font-size: 0.72rem;
    }
    .wp__card-img { width: 100%; height: 76px; object-fit: cover; border-radius: 6px; }
    .wp__card-img--empty {
      display: flex; align-items: center; justify-content: center;
      background: #dfe5e7; color: #8696a0; font-size: 1.2rem;
    }
    .wp__card-body { margin-top: 0.25rem; white-space: pre-wrap; }
    .wp__btn--card { font-size: 0.7rem; padding: 0.25rem; }
    .wp__note {
      margin: 0.5rem auto 0; max-width: 320px;
      font-size: 0.72rem; color: var(--bs-warning-text-emphasis, #664d03);
      background: var(--bs-warning-bg-subtle, #fff3cd); border-radius: 6px; padding: 0.4rem 0.5rem;
    }
    :host ::ng-deep .wp__var {
      background: #ffe8a3; border-radius: 3px; padding: 0 2px; color: #7a5b00;
    }
  `],
})
export class WhatsAppPreviewComponent {
  readonly category = input<string>('MARKETING');
  readonly headerType = input<string>('NONE');
  readonly headerText = input<string>('');
  readonly headerExample = input<string>('');
  readonly mediaUrl = input<string>('');
  readonly sampleName = input<string>('');
  readonly body = input<string>('');
  /** Comma-separated example values for the body's {{1}}, {{2}}… */
  readonly examples = input<string>('');
  readonly footer = input<string>('');
  readonly buttons = input<TemplateButton[]>([]);
  readonly carousel = input(false);
  readonly cards = input<PreviewCard[]>([]);

  readonly now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  readonly authentication = computed(() => this.category() === 'AUTHENTICATION');

  readonly headerKind = computed(() => {
    if (this.authentication()) return 'none';
    const type = this.headerType();
    if (type === 'TEXT') return this.headerText() ? 'text' : 'none';
    if (type === 'IMAGE') return 'image';
    if (type === 'VIDEO') return 'video';
    if (type === 'DOCUMENT') return 'document';
    return 'none';
  });

  /** The body with its examples dropped in, variables without one left visible. */
  readonly bodyHtml = computed(() =>
    this.render(this.body() || 'Your message text appears here.', this.split(this.examples())));

  cardHtml(card: PreviewCard): string {
    return this.render(card.body || 'Card text', this.split(card.examples));
  }

  /** Card buttons are edited per template, not per card, in this modal. */
  readonly cardButtons = computed(() => this.buttons());

  /** How many {{n}} across body and cards still have no example value. */
  readonly missingExamples = computed(() => {
    let missing = this.countMissing(this.body(), this.split(this.examples()));
    if (this.headerType() === 'TEXT' && /\{\{\d+}}/.test(this.headerText()) && !this.headerExample().trim()) {
      missing += 1;
    }
    if (this.carousel()) {
      for (const card of this.cards()) missing += this.countMissing(card.body, this.split(card.examples));
    }
    return missing;
  });

  /** Plain substitution for single-line text (the header). */
  filled(text: string): string {
    const example = this.headerExample().trim();
    return (text || '').replace(/\{\{\d+}}/g, () => example || '…');
  }

  icon(button: TemplateButton): string {
    switch (button.type) {
      case 'URL': return 'bi-box-arrow-up-right';
      case 'PHONE_NUMBER': return 'bi-telephone';
      case 'FLOW': return 'bi-ui-checks';
      default: return 'bi-reply';
    }
  }

  private split(examples: string): string[] {
    return (examples || '').split(',').map((value) => value.trim());
  }

  private countMissing(text: string, values: string[]): number {
    let missing = 0;
    for (const match of (text || '').matchAll(/\{\{(\d+)}}/g)) {
      if (!values[Number(match[1]) - 1]) missing += 1;
    }
    return missing;
  }

  /**
   * Substitutes the examples and escapes everything else — the result goes in
   * through innerHTML so an unfilled variable can be marked, and raw text must
   * never be able to carry markup of its own.
   */
  private render(text: string, values: string[]): string {
    const escape = (value: string) => value
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return escape(text)
      .replace(/\{\{(\d+)}}/g, (whole, index) => {
        const value = values[Number(index) - 1];
        return value ? escape(value) : `<span class="wp__var">${escape(whole)}</span>`;
      })
      // WhatsApp's own light markdown, so bold text previews as bold.
      .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
      .replace(/_([^_\n]+)_/g, '<i>$1</i>');
  }
}
