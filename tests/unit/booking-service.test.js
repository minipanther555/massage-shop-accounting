/* eslint-env jest */

const {
  BOOKING_CREDIT_AMOUNT,
  calculateScheduledEnd,
  normalizeBookingStart,
  hasBookingConflict,
  canFinishBeforeBooking,
  isBookingCreditEligible
} = require('../../backend/services/booking-service');

describe('booking reservation business rules', () => {
  test('calculates the scheduled end from an offset-aware start', () => {
    expect(calculateScheduledEnd('2026-07-13T18:00:00+07:00', 90))
      .toBe('2026-07-13T19:30:00+07:00');
  });

  test('accepts the current minute and rejects a materially stale start', () => {
    const nowMs = Date.parse('2026-07-14T10:20:42.000Z');
    expect(normalizeBookingStart('2026-07-14T10:20:00+00:00', nowMs))
      .toBe('2026-07-14T10:20:42+00:00');
    expect(() => normalizeBookingStart('2026-07-14T10:17:59+00:00', nowMs))
      .toThrow('Booking time cannot be in the past');
  });

  test('enforces the 15-minute gap before a requested booking', () => {
    const bookingStart = '2026-07-13T18:00:00+07:00';
    expect(canFinishBeforeBooking('2026-07-13T17:45:00+07:00', bookingStart)).toBe(true);
    expect(canFinishBeforeBooking('2026-07-13T17:46:00+07:00', bookingStart)).toBe(false);
  });

  test('detects requested-staff conflicts including the buffer', () => {
    const existing = [{
      scheduled_start: '2026-07-13T18:00:00+07:00',
      scheduled_end: '2026-07-13T19:00:00+07:00'
    }];

    expect(hasBookingConflict(
      '2026-07-13T16:30:00+07:00',
      '2026-07-13T17:45:00+07:00',
      existing
    )).toBe(false);
    expect(hasBookingConflict(
      '2026-07-13T16:31:00+07:00',
      '2026-07-13T17:46:00+07:00',
      existing
    )).toBe(true);
  });

  test('awards the fixed credit for any paid booking-mode arrival with serving staff', () => {
    expect(BOOKING_CREDIT_AMOUNT).toBe(50);
    expect(isBookingCreditEligible(
      { status: 'BOOKED', requested_masseuse_name: 'May' },
      'May'
    )).toBe(true);
    expect(isBookingCreditEligible(
      { status: 'BOOKED', requested_masseuse_name: null },
      'May'
    )).toBe(true);
    expect(isBookingCreditEligible(
      { status: 'BOOKED', requested_masseuse_name: 'May' },
      ''
    )).toBe(false);
    expect(isBookingCreditEligible(
      { status: 'NO_SHOW', requested_masseuse_name: 'May' },
      'May'
    )).toBe(false);
  });
});
