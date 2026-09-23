import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AiUsagePanelComponent } from './ai-usage-panel.component';
import { BillingService, BillingSummary } from './billing.service';

/**
 * The top-up history is what a customer opens right after paying, so it has to
 * answer the questions they actually have: what did I pay, for what, and did
 * it go through. It used to be one line of "1,000 msgs · 23 Sep" — no amount,
 * and failed payments were dropped entirely, which is exactly the case someone
 * comes looking for.
 */
describe('AiUsagePanelComponent — top-up history', () => {

  let fixture: ComponentFixture<AiUsagePanelComponent>;

  const summary = (history: BillingSummary['topupHistory']): BillingSummary =>
    ({
      planKey: 'STARTER',
      planLabel: 'Starter',
      trialEndsAt: null,
      trialExpired: false,
      subscription: null,
      assistantUsed: 5,
      assistantQuota: 25,
      agentUsed: 0,
      agentQuota: 0,
      topupBalance: 1000,
      isOwner: true,
      razorpayConfigured: true,
      agents: [],
      packs: [
        { key: 'PACK_1K', label: '1,000 AI messages', messages: 1000, amountPaise: 19900 },
        { key: 'PACK_5K', label: '5,000 AI messages', messages: 5000, amountPaise: 89900 },
      ],
      topupHistory: history,
    }) as unknown as BillingSummary;

  const render = async (history: BillingSummary['topupHistory']) => {
    await TestBed.configureTestingModule({
      imports: [AiUsagePanelComponent],
      providers: [{ provide: BillingService, useValue: { summary: () => of(summary(history)) } }],
    }).compileComponents();
    fixture = TestBed.createComponent(AiUsagePanelComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  afterEach(() => TestBed.resetTestingModule());

  it('shows what was paid, for what, and that it went through', async () => {
    const el = await render([
      { packKey: 'PACK_1K', messages: 1000, amountPaise: 19900, status: 'PAID', at: '2026-09-23T05:31:01Z' },
    ] as any);

    const row = el.querySelector('tbody tr')!.textContent!;
    expect(row).withContext('the pack name, not its key').toContain('1,000 AI messages');
    expect(row).withContext('the amount the bank charged').toContain('₹199');
    expect(row).toContain('1,000');
    expect(row).toContain('Paid');
  });

  it('shows a failed payment too, with the reassurance that goes with it', async () => {
    const el = await render([
      { packKey: 'PACK_5K', messages: 5000, amountPaise: 89900, status: 'FAILED', at: '2026-09-22T10:00:00Z' },
    ] as any);

    const row = el.querySelector('tbody tr')!.textContent!;
    expect(row).toContain('Failed');
    expect(row).toContain('₹899');
    expect(el.textContent).toContain('refunded automatically');
  });

  it('lists every top-up it was given, newest first as the API ordered them', async () => {
    const el = await render([
      { packKey: 'PACK_1K', messages: 1000, amountPaise: 19900, status: 'PAID', at: '2026-09-23T05:31:01Z' },
      { packKey: 'PACK_5K', messages: 5000, amountPaise: 89900, status: 'FAILED', at: '2026-09-22T10:00:00Z' },
      { packKey: 'PACK_1K', messages: 1000, amountPaise: 19900, status: 'PAID', at: '2026-09-20T09:00:00Z' },
    ] as any);

    const rows = el.querySelectorAll('tbody tr');
    expect(rows.length).toBe(3);
    expect(rows[0].textContent).toContain('Paid');
    expect(rows[1].textContent).toContain('Failed');
  });

  it('says nothing at all when nobody has ever topped up', async () => {
    const el = await render([]);

    expect(el.textContent).not.toContain('Top-up history');
  });

  it('keeps the two rows apart when both landed on the same date', async () => {
    // Tracking by date used to be the key here; two same-day rows are the
    // ordinary case for someone retrying a payment.
    const el = await render([
      { packKey: 'PACK_1K', messages: 1000, amountPaise: 19900, status: 'FAILED', at: '2026-09-23T05:31:01Z' },
      { packKey: 'PACK_1K', messages: 1000, amountPaise: 19900, status: 'PAID', at: '2026-09-23T05:33:00Z' },
    ] as any);

    expect(el.querySelectorAll('tbody tr').length).toBe(2);
  });
});
