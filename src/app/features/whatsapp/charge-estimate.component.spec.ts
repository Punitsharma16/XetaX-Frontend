import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChargeEstimateComponent } from './charge-estimate.component';
import { ChargeEstimate } from './whatsapp.service';

describe('ChargeEstimateComponent', () => {

  let fixture: ComponentFixture<ChargeEstimateComponent>;

  const estimate = (overrides: Partial<ChargeEstimate> = {}): ChargeEstimate => ({
    month: '2026-10', zone: 'Asia/Kolkata', currency: 'INR', total: 1.09,
    lines: [
      { category: 'MARKETING', messages: 1, amount: 0.86 },
      { category: 'UTILITY', messages: 2, amount: 0.23 },
      { category: 'AUTHENTICATION', messages: 0, amount: 0 },
      { category: 'SERVICE', messages: 0, amount: 0 },
    ],
    chargedMessages: 3, freeEntryPoint: 0, freeAllowance: 0, awaitingDelivery: 0,
    freeAllowanceLimit: 1000, serviceChargingFrom: '2026-10-01', serviceCharging: true,
    metaBillable: 0, metaFree: 0, metaKnown: 0, metaOutbound: 0,
    otherCountries: 0, unknownCategory: 0, unpriced: 0,
    ...overrides,
  });

  const render = (value: ChargeEstimate | null, metaTotal: number | null = null) => {
    fixture.componentRef.setInput('estimate', value);
    fixture.componentRef.setInput('metaTotal', metaTotal);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ChargeEstimateComponent] }).compileComponents();
    fixture = TestBed.createComponent(ChargeEstimateComponent);
  });

  /** Each row as [label, amount], read from its own cells. */
  const rows = () => Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.ce__row')).map((row) => {
    const cells = row.querySelectorAll(':scope > span');
    return [cells[0].textContent!.replace(/\s+/g, ' ').trim(), cells[1].textContent!.trim()];
  });

  it('shows the total and every line, like WhatsApp Manager', () => {
    render(estimate());
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.ce__title')!.textContent!.trim()).toBe('Estimated charges');
    expect(el.querySelector('.ce__total')!.textContent!.trim()).toBe('₹1.09');
    expect(rows()).toEqual([
      ['Marketing · 1 message', '₹0.86'],
      ['Utility · 2 messages', '₹0.23'],
      ['Authentication · 0 messages', '₹0.00'],
      ['Replies (service) · 0 messages', '₹0.00'],
    ]);
  });

  it('says how the figure is made and in which zone', () => {
    const text = render(estimate());
    expect(text).toContain('delivered messages × Meta\'s India rates');
    expect(text).toContain('Asia/Kolkata');
    expect(text).toContain('Taxes are not included');
  });

  it('puts Meta\'s own figure beside ours when there is one', () => {
    expect(render(estimate(), 0.23)).toContain('Meta\'s own figure so far: ₹0.23');
    expect(render(estimate(), null)).not.toContain('Meta\'s own figure');
  });

  it('explains what was left out, only when something was', () => {
    expect(render(estimate())).not.toContain('not delivered yet');
    const text = render(estimate({
      awaitingDelivery: 4, freeEntryPoint: 2, freeAllowance: 1, otherCountries: 3, unknownCategory: 5, unpriced: 6,
    }));
    expect(text).toContain('4 sent but not delivered yet');
    expect(text).toContain('2 free — chats that started from an ad');
    // Wording moved with the 1 October 2026 cutover; the cases either side of
    // it are covered on their own further down.
    expect(text).toContain('1 of 1,000 free replies used this month');
    expect(text).toContain('3 to numbers outside India');
    expect(text).toContain('5 template messages have an unknown category');
    expect(text).toContain('6 messages have no rate set');
  });

  it('shows nothing without an estimate', () => {
    expect(render(null).trim()).toBe('');
  });

  /**
   * The same count means two different things on each side of 1 October 2026,
   * and telling a customer "covered by your free allowance" in September —
   * when Meta is charging for none of them — reads as if the allowance were
   * being spent.
   */
  describe('free service replies, around the 1 October 2026 cutover', () => {

    it('before the change, says they are free and when that ends', () => {
      const text = render(estimate({
        month: '2026-09', serviceCharging: false, freeAllowance: 9,
      }));

      expect(text).toContain('9 replies free');
      expect(text).toContain('1 Oct 2026');
      expect(text).toContain('1,000');
      expect(text).not.toContain('used this month');
    });

    it('after the change, counts them against the allowance', () => {
      const text = render(estimate({ serviceCharging: true, freeAllowance: 142 }));

      expect(text).toContain('142 of 1,000');
      expect(text).toContain('used this month');
    });

    it('warns once the allowance is gone, because replies start costing money', () => {
      const text = render(estimate({ serviceCharging: true, freeAllowance: 1000 }));

      expect(text).toContain('allowance is used up');
    });

    it('stays quiet when no reply has been sent at all', () => {
      const text = render(estimate({ serviceCharging: false, freeAllowance: 0 }));

      expect(text).not.toContain('replies free');
    });
  });

  /**
   * Meta's own answer, beside ours. From 1 October 2026 a service message goes
   * on arriving as category "service" while it starts being charged, so a bill
   * can grow with nothing on screen to account for it — unless both numbers
   * are shown together.
   */
  describe("Meta's own count", () => {

    it('shows what Meta priced and what it charged for', () => {
      const text = render(estimate({
        metaOutbound: 45, metaKnown: 40, metaBillable: 12, metaFree: 28, chargedMessages: 12,
      }));

      expect(text).toContain('Meta priced 40 of this month\'s 45 messages');
      expect(text).toContain('12 billable');
      expect(text).toContain('28 free');
    });

    it('says plainly when Meta has priced nothing yet', () => {
      const text = render(estimate({ metaOutbound: 45, metaKnown: 0 }));

      expect(text).toContain('Meta has not priced this month');
    });

    it('warns when Meta charges for more than we counted', () => {
      const text = render(estimate({
        metaOutbound: 45, metaKnown: 40, metaBillable: 30, metaFree: 10, chargedMessages: 12,
      }));

      expect(text).toContain('Meta is charging for more than we counted');
    });

    it('stays quiet early in the month, when Meta is simply behind', () => {
      // Three receipts in, thirty-nine to come: a gap here means nothing yet.
      const text = render(estimate({
        metaOutbound: 42, metaKnown: 3, metaBillable: 3, chargedMessages: 0,
      }));

      expect(text).not.toContain('more than we counted');
    });

    it('stays quiet when the two agree', () => {
      const text = render(estimate({
        metaOutbound: 40, metaKnown: 40, metaBillable: 12, chargedMessages: 12,
      }));

      expect(text).not.toContain('more than we counted');
    });

    it('says nothing at all before a single message is sent', () => {
      expect(render(estimate())).not.toContain('Meta priced');
      expect(render(estimate())).not.toContain('has not priced');
    });
  });
});
