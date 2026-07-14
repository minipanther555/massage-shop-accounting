/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('New Customer booking workflow contracts', () => {
  const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

  test.each(templates)('%s contains booking and arrival controls', (template) => {
    const source = read(template);
    expect(source).toContain('id="booking-mode-button"');
    expect(source).toContain('id="bookingStart"');
    expect(source).toContain('id="upcoming-bookings"');
    expect(source).toContain("setTransactionMode('booking')");
    expect(source).toContain('loadBookingForArrival');
    expect(source).toContain('requested_masseuse_name: selectedMasseuse || null');
    expect(source).toContain('escapeBookingText');
    expect(source).not.toContain('id="booking-credit-card"');
    expect(source).not.toContain('+฿50');
    expect(source).not.toContain('ค่าจอง ฿50');
    expect(source).toContain('ลูกค้า:');
    expect(source).toContain('บริการ:');
    expect(source).toContain('พนักงาน:');
  });

  test('frontend API exposes reservation contracts', () => {
    const source = read('web-app/api.js');
    expect(source).toContain('async getUpcomingBookings()');
    expect(source).toContain('async createBooking(bookingData)');
    expect(source).toContain('async getBookingAvailability(masseuseName, massageEnd)');
  });

  test('Today Staff helper remains based on transaction base commission', () => {
    const source = read('backend/routes/staff.js');
    const helperRoute = source.slice(source.indexOf("router.get('/today/helper'"));
    expect(helperRoute).toContain('t.masseuse_fee');
    expect(helperRoute).not.toContain('booking_credits');
  });
});
