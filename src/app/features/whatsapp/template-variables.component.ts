import { ChangeDetectionStrategy, Component, computed, effect, input, output, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { TemplateVariables, WhatsAppTemplate } from './whatsapp.service';

export interface ButtonSlot {
  index: number;
  type: string;
  label: string;
  url: string;
  needsValue: boolean;
}

export interface CardSlot {
  index: number;
  headerFormat: string;
  bodyText: string;
  bodyVars: number;
  buttons: ButtonSlot[];
}

export interface TemplateSlots {
  headerFormat: string | null;
  headerText: string;
  headerVars: number;
  bodyText: string;
  bodyVars: number;
  buttons: ButtonSlot[];
  cards: CardSlot[];
  authentication: boolean;
}

const VAR = /\{\{(\d+)}}/g;
const MEDIA = ['IMAGE', 'VIDEO', 'DOCUMENT'];

function maxVar(text: string | undefined): number {
  let max = 0;
  for (const m of (text || '').matchAll(VAR)) max = Math.max(max, Number(m[1]));
  return max;
}

function buttonSlots(buttons: any[] | undefined): ButtonSlot[] {
  return (buttons || []).map((b, index) => {
    const type = String(b?.type || '').toUpperCase();
    const url = String(b?.url || '');
    return {
      index,
      type,
      label: b?.text || type,
      url,
      needsValue: (type === 'URL' && /\{\{\d+}}/.test(url)) || type === 'OTP' || type === 'COPY_CODE',
    };
  });
}

/**
 * Every variable a template has — header, body, each button, each carousel
 * card — read from its saved components. Mirrors the backend's
 * WhatsAppTemplateVariables so the form asks for exactly what a send needs.
 */
export function templateSlots(template: WhatsAppTemplate | null | undefined): TemplateSlots | null {
  if (!template) return null;
  const slots: TemplateSlots = {
    headerFormat: null, headerText: '', headerVars: 0, bodyText: '', bodyVars: 0,
    buttons: [], cards: [], authentication: (template.category || '').toUpperCase() === 'AUTHENTICATION',
  };
  let components: any[] = [];
  try {
    components = JSON.parse(template.componentsJson || '[]');
  } catch {
    components = [];
  }
  for (const c of Array.isArray(components) ? components : []) {
    const type = String(c?.type || '').toUpperCase();
    if (type === 'HEADER') {
      slots.headerFormat = String(c.format || 'TEXT').toUpperCase();
      if (slots.headerFormat === 'TEXT') {
        slots.headerText = c.text || '';
        slots.headerVars = maxVar(c.text);
      }
    } else if (type === 'BODY') {
      slots.bodyText = c.text || '';
      slots.bodyVars = maxVar(c.text);
    } else if (type === 'BUTTONS') {
      slots.buttons = buttonSlots(c.buttons);
    } else if (type === 'CAROUSEL') {
      (c.cards || []).forEach((card: any, index: number) => {
        const slot: CardSlot = { index, headerFormat: 'IMAGE', bodyText: '', bodyVars: 0, buttons: [] };
        for (const part of card?.components || []) {
          const t = String(part?.type || '').toUpperCase();
          if (t === 'HEADER') slot.headerFormat = String(part.format || 'IMAGE').toUpperCase();
          else if (t === 'BODY') { slot.bodyText = part.text || ''; slot.bodyVars = maxVar(part.text); }
          else if (t === 'BUTTONS') slot.buttons = buttonSlots(part.buttons);
        }
        slots.cards.push(slot);
      });
    }
  }
  // An OTP body always carries the code.
  if (slots.authentication && slots.bodyVars === 0) slots.bodyVars = 1;
  return slots;
}

export function emptyVariables(slots: TemplateSlots | null): TemplateVariables {
  const buttons: Record<string, string> = {};
  // For an OTP template the code is typed once, in the body.
  if (slots && !slots.authentication) {
    for (const b of slots.buttons) if (b.needsValue) buttons[String(b.index)] = '';
  }
  return {
    header: Array(slots?.headerVars || 0).fill(''),
    headerMediaUrl: '',
    body: Array(slots?.bodyVars || 0).fill(''),
    buttons,
    cards: (slots?.cards || []).map((card) => {
      const cardButtons: Record<string, string> = {};
      for (const b of card.buttons) if (b.needsValue) cardButtons[String(b.index)] = '';
      return { headerMediaUrl: '', body: Array(card.bodyVars).fill(''), buttons: cardButtons };
    }),
  };
}

/** Keeps previously saved values that still fit the template's shape. */
export function mergeInitial(base: TemplateVariables, initial: TemplateVariables | null | undefined): TemplateVariables {
  if (!initial) return base;
  const fit = (target: string[], from: string[] | undefined) => target.map((v, i) => from?.[i] ?? v);
  const out: TemplateVariables = {
    header: fit(base.header, initial.header),
    headerMediaUrl: initial.headerMediaUrl ?? base.headerMediaUrl,
    body: fit(base.body, initial.body),
    buttons: { ...base.buttons },
    cards: base.cards.map((card, i) => ({
      headerMediaUrl: initial.cards?.[i]?.headerMediaUrl ?? card.headerMediaUrl,
      body: fit(card.body, initial.cards?.[i]?.body),
      buttons: { ...card.buttons },
    })),
  };
  for (const k of Object.keys(out.buttons)) if (initial.buttons?.[k] != null) out.buttons[k] = initial.buttons[k];
  out.cards.forEach((card, i) => {
    for (const k of Object.keys(card.buttons)) {
      const v = initial.cards?.[i]?.buttons?.[k];
      if (v != null) card.buttons[k] = v;
    }
  });
  return out;
}

/**
 * Meta's variable rules — numbered with no gaps, never side by side, and in a
 * body not at the very start or end. Returns the problem, or null when fine.
 */
export function templateVariableProblem(where: string, text: string, noEdges: boolean): string | null {
  const nums = [...(text || '').matchAll(VAR)].map((m) => Number(m[1]));
  if (!nums.length) return null;
  const max = Math.max(...nums);
  for (let i = 1; i <= max; i++) {
    if (!nums.includes(i)) return `${where} variables must be numbered {{1}}, {{2}}… with no gaps — {{${i}}} is missing`;
  }
  const t = text.trim();
  if (noEdges && (t.startsWith('{{') || t.endsWith('}}'))) {
    return `${where} can't start or end with a variable — add some words around it`;
  }
  if (/}}\s*\{\{/.test(text)) return `${where} has two variables side by side — put some text between them`;
  return null;
}

export function hasVariables(slots: TemplateSlots | null, template: WhatsAppTemplate | null | undefined): boolean {
  if (!slots) return false;
  const mediaWithoutLink = !!slots.headerFormat && MEDIA.includes(slots.headerFormat) && !template?.headerMediaUrl;
  return mediaWithoutLink || slots.headerVars > 0 || slots.bodyVars > 0 || slots.cards.length > 0
    || slots.buttons.some((b) => b.needsValue);
}

/** True when every required value is filled — the same rule the backend enforces. */
export function variablesComplete(
  slots: TemplateSlots | null,
  template: WhatsAppTemplate | null | undefined,
  v: TemplateVariables,
): boolean {
  if (!slots) return true;
  const filled = (s: string | undefined) => !!s && !!s.trim();
  if (slots.headerFormat && MEDIA.includes(slots.headerFormat) && !template?.headerMediaUrl && !filled(v.headerMediaUrl)) {
    return false;
  }
  if (v.header.length !== slots.headerVars || !v.header.every(filled)) return false;
  if (v.body.length !== slots.bodyVars || !v.body.every(filled)) return false;
  if (!slots.authentication && !slots.buttons.filter((b) => b.needsValue).every((b) => filled(v.buttons[String(b.index)]))) {
    return false;
  }
  return slots.cards.every((card, i) => {
    const cv = v.cards[i];
    if (!cv) return card.bodyVars === 0 && card.buttons.every((b) => !b.needsValue);
    return cv.body.length === card.bodyVars && cv.body.every(filled)
      && card.buttons.filter((b) => b.needsValue).every((b) => filled(cv.buttons[String(b.index)]));
  });
}

/**
 * Asks for every value a WhatsApp template needs, shaped like the template.
 *
 * mode "values": free text (a literal, or a {fieldKey} placeholder where the
 * sender resolves them). mode "fields": pick a field/column for each value,
 * for campaigns that fill it per recipient.
 */
@Component({
  selector: 'app-template-variables',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (slots(); as s) {
      @if (show()) {
        <div class="tv">
          <div class="tv__title">
            <i class="bi bi-braces me-1"></i>Template variables
            @if (hint()) { <span class="tv__hint">— {{ hint() }}</span> }
          </div>

          @if (mediaNeedsLink()) {
            <label class="form-label small mb-1">{{ label(s.headerFormat) }} to send in the header</label>
            <input class="form-control form-control-sm mb-2" [(ngModel)]="model.headerMediaUrl"
                   (ngModelChange)="emit()" placeholder="https://… public link" />
          }

          @if (s.headerVars > 0) {
            <div class="tv__part">Header: <span class="tv__text">{{ s.headerText }}</span></div>
            <div class="row g-2 mb-2">
              @for (value of model.header; track $index; let i = $index) {
                <div class="col-12 col-md-4">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text">{{ braces(i + 1) }}</span>
                    @if (mode() === 'fields') {
                      <select class="form-select" [(ngModel)]="model.header[i]" (ngModelChange)="emit()">
                        <option value="">Choose…</option>
                        @for (f of fields(); track f) { <option [value]="f">{{ f }}</option> }
                      </select>
                    } @else {
                      <input class="form-control" [(ngModel)]="model.header[i]" (ngModelChange)="emit()" />
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (s.bodyVars > 0) {
            <div class="tv__part">
              @if (s.authentication) { Verification code } @else { Body: <span class="tv__text">{{ s.bodyText }}</span> }
            </div>
            <div class="row g-2 mb-2">
              @for (value of model.body; track $index; let i = $index) {
                <div class="col-12 col-md-4">
                  <div class="input-group input-group-sm">
                    <span class="input-group-text">{{ s.authentication ? 'Code' : braces(i + 1) }}</span>
                    @if (mode() === 'fields') {
                      <select class="form-select" [(ngModel)]="model.body[i]" (ngModelChange)="emit()">
                        <option value="">Choose…</option>
                        @for (f of fields(); track f) { <option [value]="f">{{ f }}</option> }
                      </select>
                    } @else {
                      <input class="form-control" [(ngModel)]="model.body[i]" (ngModelChange)="emit()" />
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (!s.authentication) {
            @for (b of s.buttons; track b.index) {
              @if (b.needsValue) {
                <div class="tv__part">
                  Button {{ b.index + 1 }} “{{ b.label }}”
                  @if (b.type === 'URL') { <span class="tv__text">{{ b.url }}</span> }
                  @if (b.type === 'COPY_CODE') { <span class="tv__text">coupon code</span> }
                </div>
                <div class="mb-2">
                  @if (mode() === 'fields') {
                    <select class="form-select form-select-sm" [(ngModel)]="model.buttons[key(b.index)]" (ngModelChange)="emit()">
                      <option value="">Choose…</option>
                      @for (f of fields(); track f) { <option [value]="f">{{ f }}</option> }
                    </select>
                  } @else {
                    <input class="form-control form-control-sm" [(ngModel)]="model.buttons[key(b.index)]"
                           (ngModelChange)="emit()" [placeholder]="b.type === 'URL' ? 'Value for {{1}} at the end of the link' : 'Code'" />
                  }
                </div>
              }
            }
          }

          @for (card of s.cards; track card.index; let ci = $index) {
            <div class="tv__card">
              <div class="tv__part fw-semibold">Card {{ card.index + 1 }}</div>
              <input class="form-control form-control-sm mb-2" [(ngModel)]="model.cards[ci].headerMediaUrl"
                     (ngModelChange)="emit()" placeholder="{{ label(card.headerFormat) }} link (leave blank to use the saved one)" />
              @if (card.bodyVars > 0) {
                <div class="tv__part">Body: <span class="tv__text">{{ card.bodyText }}</span></div>
                <div class="row g-2 mb-2">
                  @for (value of model.cards[ci].body; track $index; let i = $index) {
                    <div class="col-12 col-md-4">
                      <div class="input-group input-group-sm">
                        <span class="input-group-text">{{ braces(i + 1) }}</span>
                        @if (mode() === 'fields') {
                          <select class="form-select" [(ngModel)]="model.cards[ci].body[i]" (ngModelChange)="emit()">
                            <option value="">Choose…</option>
                            @for (f of fields(); track f) { <option [value]="f">{{ f }}</option> }
                          </select>
                        } @else {
                          <input class="form-control" [(ngModel)]="model.cards[ci].body[i]" (ngModelChange)="emit()" />
                        }
                      </div>
                    </div>
                  }
                </div>
              }
              @for (b of card.buttons; track b.index) {
                @if (b.needsValue) {
                  <div class="tv__part">Button {{ b.index + 1 }} “{{ b.label }}” <span class="tv__text">{{ b.url }}</span></div>
                  @if (mode() === 'fields') {
                    <select class="form-select form-select-sm mb-2" [(ngModel)]="model.cards[ci].buttons[key(b.index)]" (ngModelChange)="emit()">
                      <option value="">Choose…</option>
                      @for (f of fields(); track f) { <option [value]="f">{{ f }}</option> }
                    </select>
                  } @else {
                    <input class="form-control form-control-sm mb-2" [(ngModel)]="model.cards[ci].buttons[key(b.index)]" (ngModelChange)="emit()" />
                  }
                }
              }
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .tv { border: 1px dashed var(--bs-border-color); border-radius: 0.5rem; padding: 0.6rem 0.7rem; margin: 0.5rem 0; }
    .tv__title { font-size: 0.78rem; font-weight: 600; margin-bottom: 0.4rem; }
    .tv__hint { font-weight: 400; color: var(--bs-secondary-color); }
    .tv__part { font-size: 0.74rem; color: var(--bs-secondary-color); margin: 0.2rem 0; }
    .tv__text { font-family: var(--bs-font-monospace); font-size: 0.72rem; }
    .tv__card { border-top: 1px solid var(--bs-border-color); padding-top: 0.4rem; margin-top: 0.4rem; }
  `],
})
export class TemplateVariablesComponent {
  readonly template = input<WhatsAppTemplate | null>(null);
  readonly mode = input<'values' | 'fields'>('values');
  readonly fields = input<string[]>([]);
  readonly hint = input<string>('');
  /** Values saved earlier (editing a rule or campaign) — kept where they still fit. */
  readonly initial = input<TemplateVariables | null>(null);
  readonly valueChange = output<TemplateVariables>();

  readonly slots = computed(() => templateSlots(this.template()));
  readonly show = computed(() => hasVariables(this.slots(), this.template()));
  readonly mediaNeedsLink = computed(() => {
    const s = this.slots();
    return !!s?.headerFormat && MEDIA.includes(s.headerFormat) && !this.template()?.headerMediaUrl;
  });

  model: TemplateVariables = emptyVariables(null);

  constructor() {
    effect(() => {
      const slots = this.slots();
      untracked(() => {
        this.model = mergeInitial(emptyVariables(slots), this.initial());
        this.emit();
      });
    });
  }

  emit(): void {
    this.valueChange.emit(JSON.parse(JSON.stringify(this.model)));
  }

  braces(n: number): string {
    return '{{' + n + '}}';
  }

  key(index: number): string {
    return String(index);
  }

  label(format: string | null): string {
    return (format || 'file').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }
}
