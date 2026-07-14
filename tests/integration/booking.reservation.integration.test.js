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

  test('queue-assigned booking creates no booking credit', async () => {
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
    expect(await database.get('SELECT COUNT(*) AS count FROM booking_credits')).toEqual({ count: 1 });
    const staffAfterQueueBooking = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'May เมย์'"
    );
    expect(staffAfterQueueBooking.total_fees_earned).toBe(650);
  });
});
