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
    expect(source).toContain('markBookingNoShow');
    expect(source).toContain("api.updateBookingStatus(bookingId, 'NO_SHOW')");
    expect(source).toContain('ไม่มา (No-show)');
    expect(source).toContain('requested_masseuse_name: selectedMasseuse || null');
    expect(source).toContain('escapeBookingText');
    expect(source).not.toContain('id="booking-credit-card"');
    expect(source).not.toContain('ค่าจอง ฿50');
    expect(source).toContain('transaction-booking-credit-badge');
    expect(source).toContain('จองพนักงาน +฿50');
    expect(source).toContain('requestedStaffBooking: false');
    expect(source).toContain('currentBaseMasseuseFee');
    expect(source).toContain('bookingFee');
    expect(source).toContain("`฿${currentBaseMasseuseFee.toFixed(2)} + ฿${bookingFee.toFixed(2)}`");
    expect(source).not.toContain('เลือกพนักงานนอกคิว จึงเปลี่ยนเป็นรายการจอง');
    expect(source).not.toContain("setTransactionMode('booking', { preserveMasseuse: true })");
    expect(source).not.toContain("selectedMasseuse !== autoSelectedMasseuse\n                    && !arrivingBooking");
    expect(source).toContain('ลูกค้า:');
    expect(source).toContain('บริการ:');
    expect(source).toContain('พนักงาน:');
  });

  test.each(templates)('%s keeps manually selected non-next staff as walk-in unless Booking is explicitly selected', (template) => {
    const source = read(template);
    const submitBlock = source.slice(source.indexOf('async function handleSubmit'), source.indexOf('const success = await submitTransaction'));
    expect(submitBlock).toContain("if (transactionMode === 'booking')");
    expect(submitBlock).toContain('await api.createBooking');
    expect(submitBlock).toContain('requestedStaffBooking: false');
    expect(submitBlock).not.toContain('selectedMasseuse !== autoSelectedMasseuse');
  });

  test('frontend API exposes reservation contracts', () => {
    const source = read('web-app/api.js');
    expect(source).toContain('async getUpcomingBookings()');
    expect(source).toContain('async createBooking(bookingData)');
    expect(source).toContain('async getBookingAvailability(masseuseName, massageEnd)');
  });

  test.each(templates)('%s exposes low-clutter Thai-first cancellation only after a correction target is loaded', (template) => {
    const source = read(template);
    expect(source).toContain('id="cancel-correction-button"');
    expect(source).toContain('ยกเลิกรายการนี้');
    expect(source).toContain('cancelLoadedCorrection');
    expect(source).toContain('cancelCorrectionTransaction(appData.originalTransactionId');
    expect(source).toContain('appData.correctionMode = false');
    expect(source).toContain('appData.originalTransactionId = null');
    expect(source).not.toContain('deleteTransaction');
  });

  test('frontend API exposes transaction cancellation contract', () => {
    const source = read('web-app/api.js');
    expect(source).toContain('async cancelTransaction(transactionId, reason');
    expect(source).toContain('/transactions/${encodeURIComponent(transactionId)}/cancel');
  });

  test('Today Staff helper remains based on transaction base commission', () => {
    const source = read('backend/routes/staff.js');
    const helperRoute = source.slice(source.indexOf("router.get('/today/helper'"));
    expect(helperRoute).toContain('t.masseuse_fee');
    expect(helperRoute).not.toContain('booking_credits');
  });

  test('transaction reads expose active booking credit without changing base fee', () => {
    const route = read('backend/routes/transactions.js');
    const shared = read('web-app/shared.js');
    expect(route).toContain('booking_credit_amount');
    expect(route).toContain("bc.status = 'ACTIVE'");
    expect(shared).toContain('bookingCredit: Number(t.booking_credit_amount || 0)');
  });

  test.each(templates)('%s selects the next queue member from live current status and excludes booking-constrained staff', (template) => {
    const source = read(template);
    expect(source).toContain('appData.currentShopStatus && Array.isArray(appData.currentShopStatus.staff)');
    expect(source).toContain("current_state === 'available'");
    expect(source).toContain('staff.walk_in_priority');
    expect(source).not.toContain("String(staff.queue_status || '').toLowerCase() === 'next'");
    expect(source).toContain('getNextInLineFromStaff');
    expect(source).toContain('masseuse-availability-message');
    expect(source).toContain('ตอนนี้พนักงานทุกคนไม่ว่าง');
  });

  test.each(templates)('%s disables unavailable staff for Walk-in mode', (template) => {
    const source = read(template);
    expect(source).toContain('isMasseuseUnavailableForWalkIn');
    expect(source).toContain('option.disabled = transactionMode !== \'booking\'');
    expect(source).toContain('refreshMasseuseAvailabilityOptions');
  });

  test.each(templates)('%s renders payment methods as buttons while preserving the payment select contract', (template) => {
    const source = read(template);
    expect(source).toContain('id="payment-button-panel"');
    expect(source).toContain('transaction-payment-grid');
    expect(source).toContain('id="payment" name="payment" required class="transaction-native-select-hidden"');
    expect(source).toContain('function renderPaymentButtons()');
    expect(source).toContain('function selectPaymentValue(paymentMethod)');
    expect(source).toContain("paymentSelect.dispatchEvent(new Event('change', { bubbles: true }))");
    expect(source).toContain('updatePaymentButtonState();');
    expect(source).toContain('renderPaymentButtons();');
  });
});
