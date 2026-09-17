import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CampaignCostComponent } from './campaign-cost.component';
import { CampaignEstimate } from './whatsapp.service';

describe('CampaignCostComponent', () => {

  let fixture: ComponentFixture<CampaignCostComponent>;

  const render = (value: CampaignEstimate | null) => {
    fixture.componentRef.setInput('estimate', value);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';
  };

  const estimate: CampaignEstimate = {
    recipients: 1000, india: 990, otherCountries: 10, category: 'MARKETING',
    templateCategory: 'MARKETING', rate: 0.8631, rateDate: '2026-10-02', amount: 854.47, currency: 'INR',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CampaignCostComponent] }).compileComponents();
    fixture = TestBed.createComponent(CampaignCostComponent);
  });

  it('shows the most the campaign can cost and how it was worked out', () => {
    const text = render(estimate);
    expect(text).toContain('Estimated cost: up to ₹854.47');
    expect(text).toContain('990 recipients × ₹0.8631 (Marketing), priced for 2026-10-02');
    expect(text).toContain('Meta bills only delivered messages');
    expect(text).toContain('10 outside India not included');
  });

  it('prices a text campaign as replies', () => {
    const text = render({ ...estimate, category: 'SERVICE', rate: 0.115, amount: 113.85, otherCountries: 0 });
    expect(text).toContain('× ₹0.115 (Replies (service))');
    expect(text).not.toContain('outside India');
  });

  it('says so instead of guessing when the category is unknown', () => {
    const text = render({ ...estimate, category: null, rate: null, amount: null });
    expect(text).toContain('No cost estimate');
    expect(text).not.toContain('₹');
  });

  it('shows nothing without an estimate', () => {
    expect(render(null).trim()).toBe('');
  });
});
