/* eslint-env jest */

const {
  calculateTimeWindowPromotion,
  getBangkokMinuteOfDay
} = require('../../backend/services/time-window-promotion-service');

const service = { price: 450, promotional_price: 399 };
const settings = {
  enabled: 1,
  start_minute: 10 * 60,
  end_minute: 18 * 60,
  manual_override_grace_minutes: 15
};

describe('time-window promotion business rules', () => {
  test('uses Bangkok time rather than the server timezone', () => {
    expect(getBangkokMinuteOfDay(new Date('2026-07-21T03:00:00.000Z'))).toBe(600);
  });

  test('automatically applies the price from 10:00 through 17:59 Bangkok time', () => {
    const quote = calculateTimeWindowPromotion({
      service,
      settings,
      now: new Date('2026-07-21T10:59:00.000Z')
    });

    expect(quote).toMatchObject({
      basePrice: 450,
      finalPrice: 399,
      discountAmount: 51,
      promotionType: 'TIME_WINDOW',
      automatic: true,
      manualOverrideEligible: false
    });
  });

  test('requires reception override from 18:00 through 18:14 Bangkok time', () => {
    const withoutOverride = calculateTimeWindowPromotion({
      service,
      settings,
      now: new Date('2026-07-21T11:00:00.000Z')
    });
    const withOverride = calculateTimeWindowPromotion({
      service,
      settings,
      now: new Date('2026-07-21T11:14:00.000Z'),
      manualOverride: true
    });

    expect(withoutOverride).toMatchObject({
      finalPrice: 450,
      promotionType: null,
      manualOverrideEligible: true
    });
    expect(withOverride).toMatchObject({
      finalPrice: 399,
      discountAmount: 51,
      promotionType: 'TIME_WINDOW',
      automatic: false,
      manualOverrideApplied: true
    });
  });

  test('does not apply the promotion from 18:15 Bangkok time onward', () => {
    const quote = calculateTimeWindowPromotion({
      service,
      settings,
      now: new Date('2026-07-21T11:15:00.000Z'),
      manualOverride: true
    });

    expect(quote).toMatchObject({
      finalPrice: 450,
      discountAmount: 0,
      promotionType: null,
      manualOverrideEligible: false,
      manualOverrideApplied: false
    });
  });

  test('leaves the base price in place when the service has no configured promotion row', () => {
    const quote = calculateTimeWindowPromotion({
      service: { price: 500, promotional_price: null },
      settings,
      now: new Date('2026-07-21T03:00:00.000Z')
    });

    expect(quote).toMatchObject({
      basePrice: 500,
      finalPrice: 500,
      discountAmount: 0,
      promotionType: null
    });
  });
});
