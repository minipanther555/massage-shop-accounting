/* eslint-env jest */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-booking-test-'));
process.env.DB_PATH = path.join(testDirectory, 'booking-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

describe('booking reservation to financial transaction boundary', () => {
  beforeAll(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid)
       VALUES ('May เมย์', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO staff_roster (position, masseuse_name, status, busy_until)
       VALUES (1, 'May เมย์', 'Next', NULL)`
    );
    await database.run(
      `INSERT INTO services (
        service_name, duration_minutes, location, price, masseuse_fee, active
       ) VALUES ('Thai Massage', 60, 'In-Shop', 1000, 300, 1)`
    );
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('requested booking is non-financial until one idempotent arrival conversion', async () => {
    const activeBookingIndex = await database.get(
      "SELECT sql FROM sqlite_master WHERE type = 'index' AND name = 'idx_transactions_one_active_booking'"
    );
    expect(activeBookingIndex.sql).toContain("status IN ('ACTIVE', 'CORRECTED')");

    const createResponse = await request(app)
      .post('/api/bookings')
      .set('x-pwtest', '1')
      .send({
        scheduled_start: '2030-07-13T18:00:00+07:00',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        requested_masseuse_name: 'May เมย์',
        customer_contact: 'Booking test'
      });

    expect(createResponse.status).toBe(201);
    const bookingId = createResponse.body.booking_id;
    expect(await database.get('SELECT COUNT(*) AS count FROM transactions')).toEqual({ count: 0 });
    expect(await database.get('SELECT COUNT(*) AS count FROM booking_credits')).toEqual({ count: 0 });
    const staffBeforeArrival = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'May เมย์'"
    );
    const rosterBeforeArrival = await database.get(
      "SELECT busy_until FROM staff_roster WHERE masseuse_name = 'May เมย์'"
    );
    expect(staffBeforeArrival.total_fees_earned).toBe(0);
    expect(rosterBeforeArrival.busy_until).toBeNull();

    const conversionPayload = {
      booking_id: bookingId,
      masseuse_name: 'May เมย์',
      service_type: 'Thai Massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      start_time: '6:00 PM',
      end_time: '7:00 PM',
      start_datetime: '2030-07-13T18:00:00+07:00',
      end_datetime: '2030-07-13T19:00:00+07:00'
    };
    const conversionResponse = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send(conversionPayload);

    expect(conversionResponse.status).toBe(201);
    const completedBooking = await database.get(
      'SELECT status FROM bookings WHERE booking_id = ?',
      [bookingId]
    );
    const activeCredits = await database.get(
      "SELECT COUNT(*) AS count FROM booking_credits WHERE status = 'ACTIVE'"
    );
    const staffAfterArrival = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'May เมย์'"
    );
    expect(completedBooking.status).toBe('COMPLETED');
    expect(await database.get('SELECT COUNT(*) AS count FROM transactions')).toEqual({ count: 1 });
    expect(activeCredits).toEqual({ count: 1 });
    expect(staffAfterArrival.total_fees_earned).toBe(350);

    const duplicateResponse = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send(conversionPayload);
    expect(duplicateResponse.status).toBe(409);
    expect(await database.get('SELECT COUNT(*) AS count FROM transactions')).toEqual({ count: 1 });
    expect(await database.get('SELECT COUNT(*) AS count FROM booking_credits')).toEqual({ count: 1 });
  });

  test('queue-assigned booking pays the serving masseuse the booking credit', async () => {
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('x-pwtest', '1')
      .send({
        scheduled_start: '2030-07-14T18:00:00+07:00',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        requested_masseuse_name: null,
        customer_contact: 'Queue booking test'
      });

    const conversionResponse = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        booking_id: createResponse.body.booking_id,
        masseuse_name: 'May เมย์',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '6:00 PM',
        end_time: '7:00 PM',
        start_datetime: '2030-07-14T18:00:00+07:00',
        end_datetime: '2030-07-14T19:00:00+07:00'
      });

    expect(conversionResponse.status).toBe(201);
    expect(await database.get('SELECT COUNT(*) AS count FROM booking_credits')).toEqual({ count: 2 });
    const staffAfterQueueBooking = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'May เมย์'"
    );
    expect(staffAfterQueueBooking.total_fees_earned).toBe(700);
  });

  test('current-minute reservation is accepted without a forced delay', async () => {
    const currentMinute = new Date(Date.now() - 30000).toISOString();
    const response = await request(app)
      .post('/api/bookings')
      .set('x-pwtest', '1')
      .send({
        scheduled_start: currentMinute,
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        requested_masseuse_name: null,
        customer_contact: 'Immediate reservation test'
      });

    expect(response.status).toBe(201);
    expect(Date.parse(response.body.scheduled_start)).toBeGreaterThanOrEqual(Date.now() - 5000);
  });

  test('reception can mark an unreleased booking as no-show without creating a transaction', async () => {
    const createResponse = await request(app)
      .post('/api/bookings')
      .set('x-pwtest', '1')
      .send({
        scheduled_start: '2030-07-15T18:00:00+07:00',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        requested_masseuse_name: 'May เมย์',
        customer_contact: 'No-show test'
      });

    expect(createResponse.status).toBe(201);
    const bookingId = createResponse.body.booking_id;
    const response = await request(app)
      .post(`/api/bookings/${bookingId}/status`)
      .set('x-pwtest', '1')
      .send({ status: 'NO_SHOW' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('NO_SHOW');
    expect(await database.get('SELECT COUNT(*) AS count FROM transactions')).toEqual({ count: 2 });
  });

  test('present requested staff creates one completed booking, transaction, and visible credit', async () => {
    const today = new Date().toISOString().split('T')[0];
    const oneMinuteAgoBangkok = new Date(Date.now() - 60000 + (7 * 60 * 60 * 1000))
      .toISOString()
      .replace('Z', '+07:00');
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
      [
        'TX-LEGACY-ISO-ORDER', oneMinuteAgoBangkok, today,
        'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300,
        '12:00 PM', '1:00 PM', 'Legacy ordering fixture', today
      ]
    );

    const before = {
      bookings: await database.get('SELECT COUNT(*) AS count FROM bookings'),
      completedBookings: await database.get("SELECT COUNT(*) AS count FROM bookings WHERE status = 'COMPLETED'"),
      transactions: await database.get('SELECT COUNT(*) AS count FROM transactions'),
      credits: await database.get('SELECT COUNT(*) AS count FROM booking_credits')
    };

    const response = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        requested_staff_booking: true,
        masseuse_name: 'May เมย์',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '5:00 PM',
        end_time: '6:00 PM',
        customer_contact: 'Present requested customer'
      });

    expect(response.status).toBe(201);
    expect(response.body.booking_credit_amount).toBe(50);
    expect(typeof response.body.timestamp).toBe('string');
    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(await database.get('SELECT COUNT(*) AS count FROM bookings'))
      .toEqual({ count: before.bookings.count + 1 });
    expect(await database.get("SELECT COUNT(*) AS count FROM bookings WHERE status = 'COMPLETED'"))
      .toEqual({ count: before.completedBookings.count + 1 });
    expect(await database.get('SELECT COUNT(*) AS count FROM transactions'))
      .toEqual({ count: before.transactions.count + 1 });
    expect(await database.get('SELECT COUNT(*) AS count FROM booking_credits'))
      .toEqual({ count: before.credits.count + 1 });

    const recent = await request(app)
      .get('/api/transactions/recent?limit=1')
      .set('x-pwtest', '1');
    expect(recent.status).toBe(200);
    expect(recent.body[0].transaction_id).toBe(response.body.transaction_id);
    expect(recent.body[0].booking_credit_amount).toBe(50);

    const all = await request(app)
      .get('/api/transactions?limit=10')
      .set('x-pwtest', '1');
    expect(all.status).toBe(200);
    expect(all.body.transactions[0].booking_credit_amount).toBe(50);

    const filtered = await request(app)
      .get(`/api/transactions?limit=10&date=${response.body.date}&status=ACTIVE`)
      .set('x-pwtest', '1');
    expect(filtered.status).toBe(200);
    expect(filtered.body.transactions.some(
      transaction => transaction.transaction_id === response.body.transaction_id
    )).toBe(true);

    const financial = await request(app)
      .get(`/api/reports/financial?from_date=${response.body.date}&to_date=${response.body.date}`)
      .set('x-pwtest', '1');
    expect(financial.status).toBe(200);
    expect(financial.body.summary.booking_credits).toBeGreaterThanOrEqual(50);
    expect(financial.body.summary.total_staff_pay).toBe(
      financial.body.summary.base_masseuse_fees + financial.body.summary.booking_credits
    );

    const requestedStaff = financial.body.staffBreakdown.find(
      staff => staff.staffName === 'May เมย์'
    );
    expect(requestedStaff.bookingCredits).toBeGreaterThanOrEqual(50);
    expect(requestedStaff.totalStaffPay).toBe(
      requestedStaff.baseFees + requestedStaff.bookingCredits
    );
  });
});
