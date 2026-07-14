const BOOKING_CREDIT_AMOUNT = 50;
const BOOKING_BUFFER_MINUTES = 15;

function parseTimestamp(value, fieldName = 'timestamp') {
  const timestamp = Date.parse(value);
  if (!value || Number.isNaN(timestamp)) {
    throw new Error(`${fieldName} must be a valid ISO-8601 timestamp with an offset`);
  }
  return timestamp;
}

function getOffsetMinutes(value) {
  const match = String(value).match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) {
    throw new Error('timestamp must include an explicit UTC offset');
  }
  const sign = match[1] === '+' ? 1 : -1;
  return sign * ((Number(match[2]) * 60) + Number(match[3]));
}

function formatWithOffset(timestamp, offsetMinutes) {
  const local = new Date(timestamp + (offsetMinutes * 60000));
  const pad = (value) => String(value).padStart(2, '0');
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absoluteOffset / 60));
  const offsetRemainder = pad(absoluteOffset % 60);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`
    + `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${sign}${offsetHours}:${offsetRemainder}`;
}

function calculateScheduledEnd(scheduledStart, durationMinutes) {
  const start = parseTimestamp(scheduledStart, 'scheduled_start');
  const duration = Number(durationMinutes);
  if (!Number.isInteger(duration) || duration <= 0) {
    throw new Error('duration must be a positive integer');
  }
  return formatWithOffset(start + (duration * 60000), getOffsetMinutes(scheduledStart));
}

function canFinishBeforeBooking(massageEnd, bookingStart) {
  const end = parseTimestamp(massageEnd, 'massage_end');
  const start = parseTimestamp(bookingStart, 'booking_start');
  return end <= start - (BOOKING_BUFFER_MINUTES * 60000);
}

function hasBookingConflict(candidateStart, candidateEnd, existingBookings) {
  const start = parseTimestamp(candidateStart, 'candidate_start');
  const end = parseTimestamp(candidateEnd, 'candidate_end');
  if (end <= start) {
    throw new Error('candidate_end must be after candidate_start');
  }

  const bufferMs = BOOKING_BUFFER_MINUTES * 60000;
  return existingBookings.some((booking) => {
    const existingStart = parseTimestamp(booking.scheduled_start, 'existing scheduled_start');
    const existingEnd = parseTimestamp(booking.scheduled_end, 'existing scheduled_end');
    return start < existingEnd + bufferMs && end > existingStart - bufferMs;
  });
}

function isBookingCreditEligible(booking, servingMasseuseName) {
  return booking
    && booking.status === 'BOOKED'
    && Boolean(booking.requested_masseuse_name)
    && booking.requested_masseuse_name === servingMasseuseName;
}

module.exports = {
  BOOKING_BUFFER_MINUTES,
  BOOKING_CREDIT_AMOUNT,
  calculateScheduledEnd,
  canFinishBeforeBooking,
  hasBookingConflict,
  isBookingCreditEligible,
  parseTimestamp
};
