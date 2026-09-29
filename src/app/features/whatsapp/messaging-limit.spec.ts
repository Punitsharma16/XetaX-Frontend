import { dailyCustomerLimit, messagingLimitLabel } from './whatsapp.service';

/**
 * Meta's messaging tier decides how many unique customers a number may reach
 * in a day, and it caps a campaign harder than any setting in the panel: a
 * TIER_250 number cannot deliver a 5,000-row audience however big the CSV is.
 * The backend stored it from onboarding but never sent it to the panel, so a
 * campaign was built blind and the limit was met as failed recipients.
 */
describe('WhatsApp messaging tier', () => {
  it('reads the plain tiers', () => {
    expect(dailyCustomerLimit('TIER_50')).toBe(50);
    expect(dailyCustomerLimit('TIER_250')).toBe(250);
  });

  it('expands the K and M suffixes', () => {
    expect(dailyCustomerLimit('TIER_1K')).toBe(1000);
    expect(dailyCustomerLimit('TIER_100K')).toBe(100000);
    expect(dailyCustomerLimit('TIER_1M')).toBe(1000000);
  });

  it('treats an unlimited tier as no ceiling', () => {
    expect(dailyCustomerLimit('TIER_UNLIMITED')).toBe(Infinity);
  });

  it('does not care about case or a missing prefix', () => {
    expect(dailyCustomerLimit('tier_1k')).toBe(1000);
    expect(dailyCustomerLimit('250')).toBe(250);
  });

  it('returns null rather than guessing at something it does not know', () => {
    expect(dailyCustomerLimit(null)).toBeNull();
    expect(dailyCustomerLimit('')).toBeNull();
    expect(dailyCustomerLimit('TIER_SOMETHING_NEW')).toBeNull();
  });

  it('labels a tier the way a person reads it', () => {
    expect(messagingLimitLabel('TIER_1K')).toBe('1,000 customers/day');
    expect(messagingLimitLabel('TIER_UNLIMITED')).toBe('Unlimited');
  });

  it('shows nothing at all when the tier is unknown', () => {
    // The banner is hidden rather than claiming a limit that may be wrong.
    expect(messagingLimitLabel(null)).toBeNull();
    expect(messagingLimitLabel('TIER_SOMETHING_NEW')).toBeNull();
  });
});
