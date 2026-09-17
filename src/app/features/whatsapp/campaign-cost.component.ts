import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { CHARGE_LABELS, CampaignEstimate } from './whatsapp.service';

/** What a campaign can cost, shown before anyone presses Start. */
@Component({
  selector: 'app-campaign-cost',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (estimate(); as e) {
      <div class="cc">
        <i class="bi bi-currency-rupee cc__icon"></i>
        @if (e.amount != null && e.rate != null) {
          <div>
            <div>Estimated cost: <b>up to ₹{{ e.amount | number: '1.2-2' }}</b></div>
            <div class="cc__detail">
              {{ e.india | number }} {{ e.india === 1 ? 'recipient' : 'recipients' }}
              × ₹{{ e.rate | number: '1.2-4' }} ({{ label() }}), priced for {{ e.rateDate }}.
              Meta bills only delivered messages.
              @if (e.otherCountries) {
                {{ e.otherCountries | number }} outside India not included.
              }
            </div>
          </div>
        } @else {
          <div class="cc__detail">
            No cost estimate — this template's category is not known here. Sync your templates.
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .cc {
      display: flex; gap: 0.6rem; align-items: flex-start;
      border: 1px solid var(--border-subtle, #dee2e6); border-radius: 10px;
      padding: 0.6rem 0.8rem; margin-bottom: 1rem; font-size: 0.9rem;
    }
    .cc__icon { font-size: 1.1rem; line-height: 1.3; }
    .cc__detail { font-size: 0.75rem; color: var(--text-muted, #6c757d); }
  `],
})
export class CampaignCostComponent {
  readonly estimate = input<CampaignEstimate | null>(null);

  readonly label = computed(() => {
    const category = this.estimate()?.category;
    return category ? CHARGE_LABELS[category] : '';
  });
}
