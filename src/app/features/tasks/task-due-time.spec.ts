import { toInstant } from './task-panel.component';

/**
 * A reminder is due at an instant. The picker hands over a wall-clock time in
 * the reader's own zone, and sending that as typed stored it as though it were
 * UTC — a task set for 6 pm in Delhi was filed as 6 pm UTC, so the reminder
 * fired at 11:30 pm and the panel drew the due time 5.5 hours off.
 */
describe('the due time a task is saved with', () => {
  it('sends the instant the reader meant, not the digits they typed', () => {
    const typed = '2026-09-22T18:00';

    const sent = toInstant(typed)!;

    // Whatever zone this test runs in, the instant is the one the wall clock
    // showed — so the reminder fires when the reader expects it to.
    expect(new Date(sent).getTime()).toBe(new Date(typed).getTime());
    expect(sent.endsWith('Z')).withContext('the API is told which zone it is').toBeTrue();
  });

  it('is 12:30 UTC for a 6 pm task in India', () => {
    // Pinned to IST so the arithmetic is visible rather than implied.
    const istSixPm = new Date('2026-09-22T18:00:00+05:30');

    expect(istSixPm.toISOString()).toBe('2026-09-22T12:30:00.000Z');
  });

  it('leaves an empty picker empty — a task may have no due time', () => {
    expect(toInstant('')).toBeNull();
  });

  it('refuses a value that is not a time at all', () => {
    expect(toInstant('not a date')).toBeNull();
  });
});
