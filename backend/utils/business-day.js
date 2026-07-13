const BANGKOK_TIME_ZONE = 'Asia/Bangkok';
const DEFAULT_OPEN_HOUR = 10;
const DEFAULT_RESET_HOUR = 2;

function getBangkokParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);

  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function formatDateUTC(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return formatDateUTC(date);
}

function getBusinessDay(date = new Date(), options = {}) {
  const resetHour = options.resetHour ?? DEFAULT_RESET_HOUR;
  const parts = getBangkokParts(date);
  const bangkokDate = `${parts.year}-${parts.month}-${parts.day}`;
  const hour = Number(parts.hour);

  if (hour < resetHour) {
    return addDays(bangkokDate, -1);
  }

  return bangkokDate;
}

function getBusinessDayParts(date = new Date(), options = {}) {
  const currentBusinessDay = getBusinessDay(date, options);
  return {
    currentBusinessDay,
    previousBusinessDay: addDays(currentBusinessDay, -1),
    resetHour: options.resetHour ?? DEFAULT_RESET_HOUR,
    openHour: options.openHour ?? DEFAULT_OPEN_HOUR,
    timeZone: BANGKOK_TIME_ZONE
  };
}

function getNextBusinessDay(currentBusinessDay) {
  return addDays(currentBusinessDay, 1);
}

module.exports = {
  BANGKOK_TIME_ZONE,
  DEFAULT_OPEN_HOUR,
  DEFAULT_RESET_HOUR,
  addDays,
  getBangkokParts,
  getBusinessDay,
  getBusinessDayParts,
  getNextBusinessDay
};
