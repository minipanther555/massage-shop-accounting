const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'daily-summary-status-test-'));
process.env.DB_PATH = path.join(testDirectory, 'daily-summary-status.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

describe('Daily Summary current shop status API', () => {
  before(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES
         (1, 'May เมย์', 1, 0, 0),
         (2, 'Nok นก', 1, 0, 0),
         (3, 'Pim พิม', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO business_days (business_day, status)
       VALUES ('2026-07-13', 'open')`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES
         ('2026-07-13', 1, 'May เมย์', 1, 'Next'),
         ('2026-07-13', 2, 'Nok นก', 2, NULL),
         ('2026-07-13', 3, 'Pim พิม', 3, NULL)`
    );
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type, location,
        duration, payment_amount, payment_method, masseuse_fee, start_time,
        end_time, status, business_day, start_datetime, end_datetime
      ) VALUES
        ('status-busy', '2026-07-13T14:00:00+07:00', '2026-07-13', 'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '14:10', '15:20', 'ACTIVE', '2026-07-13', '2026-07-13T14:10:00+07:00', '2026-07-13T15:20:00+07:00'),
        ('status-count', '2026-07-13T09:00:00+07:00', '2026-07-13', 'Nok นก', 'Foot Massage', 'In-Shop', 60, 800, 'Cash', 250, '09:00', '10:00', 'ACTIVE', '2026-07-13', NULL, NULL),
        ('status-edited', '2026-07-13T10:00:00+07:00', '2026-07-13', 'Nok นก', 'Foot Massage', 'In-Shop', 60, 800, 'Cash', 250, '10:00', '11:00', 'EDITED', '2026-07-13', NULL, NULL)`
    );
    await database.run(
      `INSERT INTO bookings (
        booking_id, scheduled_start, scheduled_end, service_type, location,
        duration, requested_masseuse_name, customer_contact, status
      ) VALUES (
        'BK-status-buffer', '2026-07-13T15:30:00+07:00', '2026-07-13T16:30:00+07:00',
        'Thai Massage', 'In-Shop', 60, 'Pim พิม', 'Status test', 'BOOKED'
      )`
    );
  });

  after(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('GET /api/staff/current-status combines busy, booking, free, count, and timing state', async () => {
    const response = await request(app)
      .get('/api/staff/current-status?at=2026-07-13T07:30:00.000Z')
      .set('x-pwtest', '1');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.business_day, '2026-07-13');
    assert.strictEqual(response.body.buffer_minutes, 15);
    assert.deepStrictEqual(
      response.body.staff.map((row) => row.masseuse_name),
      ['May เมย์', 'Pim พิม', 'Nok นก']
    );

    const may = response.body.staff.find((row) => row.masseuse_name === 'May เมย์');
    const nok = response.body.staff.find((row) => row.masseuse_name === 'Nok นก');
    const pim = response.body.staff.find((row) => row.masseuse_name === 'Pim พิม');

    assert.strictEqual(may.current_state, 'busy');
    assert.strictEqual(may.busy_started, '14:10');
    assert.strictEqual(may.busy_until, '15:20');
    assert.strictEqual(may.free_at, '15:35');
    assert.strictEqual(may.remaining_minutes, 50);
    assert.strictEqual(may.today_massages, 1);

    assert.strictEqual(nok.current_state, 'available');
    assert.strictEqual(nok.today_massages, 1);

    assert.strictEqual(pim.current_state, 'booking_buffer');
    assert.strictEqual(pim.next_booking.booking_id, 'BK-status-buffer');
    assert.strictEqual(pim.usable_minutes_before_booking, 45);
  });

  it('rejects an invalid diagnostic timestamp before status calculation', async () => {
    const response = await request(app)
      .get('/api/staff/current-status?at=not-a-date')
      .set('x-pwtest', '1');

    assert.strictEqual(response.status, 400);
    assert.match(response.body.error, /Invalid at timestamp/);
  });

  it('keeps a staff member booking-constrained while a requested booking is already in progress', async () => {
    const response = await request(app)
      .get('/api/staff/current-status?at=2026-07-13T08:00:00.000Z')
      .set('x-pwtest', '1');
    const pim = response.body.staff.find((row) => row.masseuse_name === 'Pim พิม');
    assert.strictEqual(pim.current_state, 'booking_buffer');
    assert.strictEqual(pim.next_booking.booking_id, 'BK-status-buffer');
  });

  it('uses indexed query plans for current status lookups', async () => {
    const transactionPlan = await database.all(
      `EXPLAIN QUERY PLAN
       SELECT transaction_id, masseuse_name, timestamp, start_datetime, end_datetime, duration, end_time, service_type
       FROM transactions
       WHERE business_day = ? AND status = 'ACTIVE'
       ORDER BY timestamp DESC`,
      ['2026-07-13']
    );
    const bookingPlan = await database.all(
      `EXPLAIN QUERY PLAN
       SELECT booking_id, scheduled_start, scheduled_end, requested_masseuse_name, service_type, duration
       FROM bookings
       WHERE status = 'BOOKED'
         AND requested_masseuse_name IS NOT NULL
         AND requested_masseuse_name != ''
         AND datetime(scheduled_end) > datetime(?)
       ORDER BY scheduled_start ASC`,
      ['2026-07-13T07:30:00.000Z']
    );

    const transactionDetails = transactionPlan.map((row) => row.detail).join('\n');
    const bookingDetails = bookingPlan.map((row) => row.detail).join('\n');

    assert.match(transactionDetails, /idx_transactions_business_day_staff/);
    assert.match(bookingDetails, /idx_bookings_status_start|idx_bookings_staff_status_start/);
    assert.doesNotMatch(transactionDetails, /SCAN transactions/i);
    assert.doesNotMatch(bookingDetails, /SCAN bookings/i);
  });
});
