import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { CHARGE_LABELS, ChargeCategory, ChargeEstimate } from './whatsapp.service';

/**
 * This month's WhatsApp bill as XetaX works it out — laid out like WhatsApp
 * Manager's "Approximate total charges", so the two can be read side by side.
 */
@Component({
  selector: 'app-charge-estimate',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estimate(); as e) {
      <div class="ce">
        <div class="ce__head">
          <span class="ce__title">Estimated charges</span>
          <span class="ce__total">₹{{ e.total | number: '1.2-2' }}</span>
        </div>
        @for (line of e.lines; track line.category) {
          <div class="ce__row">
            <span>
              {{ label(line.category) }}
              <small class="ce__count">· {{ line.messages | number }} {{ line.messages === 1 ? 'message' : 'messages' }}</small>
            </span>
            <span class="ce__amount">₹{{ line.amount | number: '1.2-2' }}</span>
          </div>
        }
        <div class="ce__notes">
          <div>
            XetaX estimate: delivered messages × Meta's India rates, month counted in {{ e.zone }}.
            Taxes are not included.
          </div>
          @if (metaTotal() != null) {
            <div>Meta's own figure so far: <b>₹{{ metaTotal() | number: '1.2-2' }}</b></div>
          }
          @if (e.awaitingDelivery) {
            <div>{{ e.awaitingDelivery | number }} sent but not delivered yet — charged once delivered.</div>
          }
          @if (e.freeEntryPoint) {
            <div>{{ e.freeEntryPoint | number }} free — chats that started from an ad or Page button.</div>
          }
          @if (e.freeAllowance) {
            <div>{{ e.freeAllowance | number }} replies covered by Meta's free monthly allowance.</div>
          }
          @if (e.otherCountries) {
            <div>{{ e.otherCountries | number }} to numbers outside India — not included.</div>
          }
          @if (e.unknownCategory) {
            <div class="ce__warn">{{ e.unknownCategory | number }} template messages have an unknown category — sync your templates.</div>
          }
          @if (e.unpriced) {
            <div class="ce__warn">{{ e.unpriced | number }} messages have no rate set — not included.</div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .ce {
      border: 1px solid var(--border-subtle, #dee2e6);
      border-radius: 10px;
      padding: 0.75rem 0.9rem;
    }
    .ce__head {
      display: flex; justify-content: space-between; align-items: baseline;
      padding-bottom: 0.4rem; margin-bottom: 0.3rem;
      border-bottom: 1px solid var(--border-subtle, #dee2e6);
    }
    .ce__title { font-weight: 600; }
    .ce__total { font-weight: 700; font-size: 1.05rem; font-variant-numeric: tabular-nums; }
    .ce__row {
      display: flex; justify-content: space-between; gap: 1rem;
      padding: 0.2rem 0; font-size: 0.85rem;
    }
    .ce__count { color: var(--text-muted, #6c757d); }
    .ce__amount { font-variant-numeric: tabular-nums; }
    .ce__notes {
      margin-top: 0.5rem; font-size: 0.72rem; color: var(--text-muted, #6c757d);
      display: grid; gap: 0.15rem;
    }
    .ce__warn { color: var(--bs-warning-text-emphasis, #997404); }
  `],
})
export class ChargeEstimateComponent {
  readonly estimate = input<ChargeEstimate | null | undefined>(null);
  /** Meta's official spend so far, when Meta returned one. */
  readonly metaTotal = input<number | null | undefined>(null);

  label(category: ChargeCategory): string {
    return CHARGE_LABELS[category] ?? category;
  }
}
