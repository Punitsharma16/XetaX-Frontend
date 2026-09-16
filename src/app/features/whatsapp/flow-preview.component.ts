import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { FieldResponse } from '../../core/models/crm.model';

/** Field types WhatsApp has no control for — mirrors WhatsAppFlowBuilder. */
const UNSUPPORTED = ['FILE', 'IMAGE', 'JSON', 'PASSWORD', 'MULTI_SELECT'];
const PER_SCREEN = 6;
const MAX_SCREENS = 8;

interface PreviewControl {
  label: string;
  kind: 'text' | 'textarea' | 'date' | 'optin' | 'choice';
  required: boolean;
  options: string[];
  problem: string | null;
}

/**
 * The Flow as the customer will step through it, drawn from the chosen form.
 *
 * <p>The splitting rules here are the ones WhatsAppFlowBuilder actually uses —
 * same page size, same ceiling, same skipped field types — so what is drawn is
 * what will be generated. The point is to catch the two failures before Meta
 * does: a form too long to be a Flow, and a choice field with no options.
 */
@Component({
  selector: 'app-flow-preview',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fp">
      @if (!fields().length) {
        <div class="fp__hint">Pick a form to see the screens your customer will get.</div>
      } @else if (!usable().length) {
        <div class="fp__error">
          <i class="bi bi-exclamation-triangle me-1"></i>
          This form has no fields a WhatsApp Flow can ask for.
        </div>
      } @else {
        @if (tooLong()) {
          <div class="fp__error">
            <i class="bi bi-exclamation-triangle me-1"></i>
            {{ usable().length }} fields need {{ screens().length }} screens — WhatsApp allows
            {{ max }}. Hide the fields a customer does not need to fill.
          </div>
        }
        @if (problems().length) {
          <div class="fp__error">
            <i class="bi bi-exclamation-triangle me-1"></i>
            @for (problem of problems(); track problem) { <div>{{ problem }}</div> }
          </div>
        }

        <div class="fp__screens">
          @for (screen of screens(); track $index; let s = $index; let last = $last) {
            <div class="fp__screen">
              <div class="fp__bar">
                <i class="bi bi-x-lg"></i>
                <span>{{ screenTitle(s) }}</span>
              </div>
              <div class="fp__form">
                @for (control of screen; track $index) {
                  <div class="fp__control">
                    <label class="fp__label">
                      {{ control.label }}@if (control.required) { <span class="fp__req">*</span> }
                    </label>
                    @switch (control.kind) {
                      @case ('textarea') { <div class="fp__input fp__input--area"></div> }
                      @case ('date') {
                        <div class="fp__input"><i class="bi bi-calendar3"></i></div>
                      }
                      @case ('optin') {
                        <div class="fp__optin"><span class="fp__box"></span>{{ control.label }}</div>
                      }
                      @case ('choice') {
                        @for (option of control.options.slice(0, 3); track option) {
                          <div class="fp__radio"><span class="fp__dot"></span>{{ option }}</div>
                        }
                        @if (control.options.length > 3) {
                          <div class="fp__more">+{{ control.options.length - 3 }} more</div>
                        }
                        @if (control.problem) { <div class="fp__bad">{{ control.problem }}</div> }
                      }
                      @default { <div class="fp__input"></div> }
                    }
                  </div>
                }
                <div class="fp__cta">{{ last ? 'Submit' : 'Continue' }}</div>
              </div>
            </div>
          }
        </div>

        <div class="fp__hint">
          {{ screens().length }} screen{{ screens().length === 1 ? '' : 's' }},
          {{ usable().length }} question{{ usable().length === 1 ? '' : 's' }}.
          @if (skipped().length) {
            {{ skipped().length }} field{{ skipped().length === 1 ? '' : 's' }} skipped
            ({{ skipped().join(', ') }}) — WhatsApp has no control for {{ skipped().length === 1 ? 'it' : 'them' }}.
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .fp { font-size: 0.78rem; }
    .fp__screens { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; }
    .fp__screen {
      flex: 0 0 220px; border: 1px solid var(--border-subtle, #dee2e6);
      border-radius: 12px; overflow: hidden; background: #fff;
    }
    .fp__bar {
      display: flex; align-items: center; gap: 0.5rem; padding: 0.45rem 0.6rem;
      background: #f0f2f5; font-weight: 600; font-size: 0.75rem;
    }
    .fp__form { padding: 0.55rem 0.6rem 0.7rem; }
    .fp__control { margin-bottom: 0.5rem; }
    .fp__label { display: block; font-size: 0.68rem; color: #54656f; margin-bottom: 2px; }
    .fp__req { color: #d93025; }
    .fp__input {
      height: 26px; border: 1px solid #d1d7db; border-radius: 6px;
      display: flex; align-items: center; justify-content: flex-end;
      padding: 0 0.4rem; color: #8696a0;
    }
    .fp__input--area { height: 46px; }
    .fp__optin { display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; }
    .fp__box { width: 13px; height: 13px; border: 1px solid #8696a0; border-radius: 3px; flex: none; }
    .fp__radio { display: flex; align-items: center; gap: 0.35rem; font-size: 0.7rem; margin-top: 2px; }
    .fp__dot { width: 12px; height: 12px; border: 1px solid #8696a0; border-radius: 50%; flex: none; }
    .fp__more { font-size: 0.66rem; color: #8696a0; margin-top: 2px; }
    .fp__bad { font-size: 0.66rem; color: #d93025; margin-top: 2px; }
    .fp__cta {
      margin-top: 0.6rem; background: #00a884; color: #fff; text-align: center;
      border-radius: 18px; padding: 0.35rem; font-weight: 600; font-size: 0.75rem;
    }
    .fp__hint { color: var(--text-muted, #6c757d); font-size: 0.72rem; margin-top: 0.4rem; }
    .fp__error {
      font-size: 0.72rem; color: var(--bs-danger-text-emphasis, #58151c);
      background: var(--bs-danger-bg-subtle, #f8d7da); border-radius: 6px;
      padding: 0.4rem 0.5rem; margin-bottom: 0.5rem;
    }
  `],
})
export class FlowPreviewComponent {
  readonly fields = input<FieldResponse[]>([]);
  readonly formName = input<string>('');

  readonly max = MAX_SCREENS;

  /** Same filter the builder applies before it generates anything. */
  readonly usable = computed(() => this.fields().filter((field) =>
    !!field.fieldKey?.trim()
    && !UNSUPPORTED.includes(String(field.fieldType || 'TEXT'))
    && field.hidden !== true));

  readonly skipped = computed(() => this.fields()
    .filter((field) => UNSUPPORTED.includes(String(field.fieldType || 'TEXT')) && field.hidden !== true)
    .map((field) => field.label || field.fieldKey));

  /** The builder only splits once a form is long enough to be worth splitting. */
  readonly screens = computed<PreviewControl[][]>(() => {
    const controls = this.usable().map((field) => this.controlFor(field));
    if (controls.length <= PER_SCREEN + 2) return controls.length ? [controls] : [];
    const pages: PreviewControl[][] = [];
    for (let from = 0; from < controls.length; from += PER_SCREEN) {
      pages.push(controls.slice(from, from + PER_SCREEN));
    }
    return pages;
  });

  readonly tooLong = computed(() => this.screens().length > MAX_SCREENS);

  readonly problems = computed(() => this.screens()
    .flat().map((control) => control.problem).filter((problem): problem is string => !!problem));

  screenTitle(index: number): string {
    const base = this.formName()?.trim() || 'Details';
    const total = this.screens().length;
    const title = total > 1 ? `${base} ${index + 1}/${total}` : base;
    return title.length > 30 ? title.slice(0, 30) : title;
  }

  private controlFor(field: FieldResponse): PreviewControl {
    const type = String(field.fieldType || 'TEXT');
    const label = (field.label || field.fieldKey || '').trim();
    const choice = type === 'SELECT' || type === 'RADIO';
    const options = choice ? this.optionsOf(field) : [];
    return {
      label: label.length > 20 ? label.slice(0, 20) : label,
      kind: type === 'TEXTAREA' ? 'textarea'
        : type === 'DATE' || type === 'DATETIME' ? 'date'
          : type === 'BOOLEAN' || type === 'CHECKBOX' ? 'optin'
            : choice ? 'choice' : 'text',
      required: field.required === true,
      options,
      problem: choice && !options.length
        ? `“${label}” is a choice field with no options — Meta will refuse the Flow.`
        : null,
    };
  }

  private optionsOf(field: FieldResponse): string[] {
    if (!field.optionsJson) return [];
    try {
      const parsed = JSON.parse(field.optionsJson);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((option) => typeof option === 'string' ? option : option?.label ?? option?.value ?? '')
        .filter((option: string) => !!option)
        .slice(0, 20);
    } catch {
      return field.optionsJson.split(',').map((value) => value.trim()).filter(Boolean);
    }
  }
}
