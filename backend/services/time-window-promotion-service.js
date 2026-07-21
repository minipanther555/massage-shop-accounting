const BANGKOK_TIME_ZONE = 'Asia/Bangkok';

function getBangkokMinuteOfDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BANGKOK_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return (Number(values.hour) * 60) + Number(values.minute);
}

function calculateTimeWindowPromotion({ service, settings, now = new Date(), manualOverride = false }) {
  const basePrice = Number(service.price);
  const promotionPrice = Number(service.promotional_price);
  const hasPromotionPrice = service.promotional_price !== null
    && service.promotional_price !== undefined
    && Number.isFinite(promotionPrice);
  const disabled = !settings || !settings.enabled || !hasPromotionPrice;
  const minuteOfDay = getBangkokMinuteOfDay(now);

  if (disabled) {
    return {
      basePrice,
      finalPrice: basePrice,
      discountAmount: 0,
      promotionType: null,
      promotionLabel: null,
      automatic: false,
      manualOverrideEligible: false,
      manualOverrideApplied: false
    };
  }

  const automatic = minuteOfDay >= settings.start_minute && minuteOfDay < settings.end_minute;
  const manualOverrideEligible = minuteOfDay >= settings.end_minute
    && minuteOfDay < settings.end_minute + settings.manual_override_grace_minutes;
  const manualOverrideApplied = manualOverride && manualOverrideEligible;
  const applies = automatic || manualOverrideApplied;

  return {
    basePrice,
    finalPrice: applies ? promotionPrice : basePrice,
    discountAmount: applies ? basePrice - promotionPrice : 0,
    promotionType: applies ? 'TIME_WINDOW' : null,
    promotionLabel: applies ? (manualOverrideApplied ? 'Time-window promotion (reception override)' : 'Time-window promotion') : null,
    automatic,
    manualOverrideEligible,
    manualOverrideApplied
  };
}

async function getTimeWindowQuote(database, { serviceType, duration, location, manualOverride = false, now = new Date() }) {
  const service = await database.get(
    `SELECT s.price, s.masseuse_fee, p.promotional_price
     FROM services s
     LEFT JOIN time_window_promotion_prices p
       ON p.service_name = s.service_name
      AND p.duration_minutes = s.duration_minutes
      AND p.location = s.location
     WHERE s.service_name = ? AND s.duration_minutes = ? AND s.location = ? AND s.active = true`,
    [serviceType, Number(duration), location]
  );
  if (!service) return null;

  const settings = await database.get('SELECT * FROM time_window_promotion_settings WHERE id = 1');
  return {
    ...calculateTimeWindowPromotion({ service, settings, now, manualOverride }),
    masseuseFee: Number(service.masseuse_fee)
  };
}

module.exports = {
  BANGKOK_TIME_ZONE,
  calculateTimeWindowPromotion,
  getBangkokMinuteOfDay,
  getTimeWindowQuote
};
