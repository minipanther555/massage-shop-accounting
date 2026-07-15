/* eslint-env jest */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-walkin-queue-test-'));
process.env.DB_PATH = path.join(testDirectory, 'walkin-queue-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

describe('walk-in transaction queue and recent list contracts', () => {
  let businessDay;

  beforeAll(async () => {
    await database.connect();
    businessDay = getBusinessDayParts(new Date('2030-01-01T11:30:00+07:00')).currentBusinessDay;
    await database.run(
      `INSERT INTO business_days (business_day, status)
       VALUES (?, 'open')`,
      [businessDay]
    );
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'สา', 1, 0, 0), (2, 'nine นาย', 1, 0, 0), (3, 'May เมย์', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'สา', 1, NULL), (?, 2, 'nine นาย', 2, NULL), (?, 3, 'May เมย์', 3, NULL)`,
      [businessDay, businessDay, businessDay]
    );
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('advance-queue retains the original Today Staff order when the current first staff is served', async () => {
    const response = await request(app)
      .post('/api/staff/advance-queue?at=2030-01-01T11:30:00%2B07:00')
      .set('x-pwtest', '1')
      .send({ currentMasseuse: 'สา' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      message: 'Today Staff order retained; workload determines the next walk-in',
      previousNext: 'สา',
      newNext: 'สา'
    }));

    const rows = await database.all(
      `SELECT display_name, position
       FROM today_staff
       WHERE business_day = ? AND removed_at IS NULL
       ORDER BY position ASC`,
      [businessDay]
    );
    expect(rows.map((row) => row.display_name)).toEqual(['สา', 'nine นาย', 'May เมย์']);
  });

  test('current status uses displayed Today Staff position for equal workloads, not database row id', async () => {
    const response = await request(app)
      .get('/api/staff/current-status?at=2030-01-01T11:30:00%2B07:00')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const priority = response.body.staff.find((row) => row.walk_in_priority);
    expect(priority.masseuse_name).toBe('สา');
    expect(priority.position).toBe(1);
  });

  test('current status ignores an unreleased booking from a previous business day', async () => {
    await database.run(
      `INSERT INTO bookings (
        booking_id, scheduled_start, scheduled_end, service_type, location,
        duration, requested_masseuse_name, customer_contact, status
      ) VALUES ('BK-YESTERDAY', '2029-12-31T22:16:00+07:00', '2029-12-31T23:16:00+07:00', 'Thai Massage', 'In-Shop', 60, 'สา', '', 'BOOKED')`
    );

    const response = await request(app)
      .get('/api/staff/current-status?at=2030-01-01T11:30:00%2B07:00')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const staleBookingStaff = response.body.staff.find((row) => row.masseuse_name === 'สา');
    expect(staleBookingStaff.next_booking).toBeNull();
    expect(staleBookingStaff.current_state).toBe('available');
  });

  test('advance-queue does not rotate Today Staff for a manual non-next selection', async () => {
    const before = await database.all(
      `SELECT display_name FROM today_staff
       WHERE business_day = ? AND removed_at IS NULL
       ORDER BY position ASC`,
      [businessDay]
    );

    const response = await request(app)
      .post('/api/staff/advance-queue?at=2030-01-01T11:30:00%2B07:00')
      .set('x-pwtest', '1')
      .send({ currentMasseuse: 'May เมย์' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Manual selection - Today Staff queue not advanced');

    const after = await database.all(
      `SELECT display_name FROM today_staff
       WHERE business_day = ? AND removed_at IS NULL
       ORDER BY position ASC`,
      [businessDay]
    );
    expect(after).toEqual(before);
  });

  test('current status marks the lowest-workload eligible staff as next for a walk-in', async () => {
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (4, 'Kie กี้', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 4, 'Kie กี้', 4, 'Next')`,
      [businessDay]
    );
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, status, business_day, start_datetime, end_datetime
      ) VALUES
        ('TX-PHYO', '2030-01-01T10:00:00+07:00', '2030-01-01', 'สา', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '10:00 AM', '11:00 AM', 'ACTIVE', ?, '2030-01-01T10:00:00+07:00', '2030-01-01T11:00:00+07:00'),
        ('TX-NINE', '2030-01-01T10:01:00+07:00', '2030-01-01', 'nine นาย', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '10:01 AM', '11:01 AM', 'ACTIVE', ?, '2030-01-01T10:01:00+07:00', '2030-01-01T11:01:00+07:00'),
        ('TX-MAY', '2030-01-01T10:02:00+07:00', '2030-01-01', 'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '10:02 AM', '11:02 AM', 'ACTIVE', ?, '2030-01-01T10:02:00+07:00', '2030-01-01T11:02:00+07:00')`,
      [businessDay, businessDay, businessDay]
    );
    await database.run(
      `INSERT INTO bookings (
        booking_id, scheduled_start, scheduled_end, service_type, location,
        duration, requested_masseuse_name, customer_contact, status
      ) VALUES ('BK-KIE', '2030-01-01T10:00:00+07:00', '2030-01-01T11:00:00+07:00', 'Thai Massage', 'In-Shop', 60, 'Kie กี้', '', 'BOOKED')`
    );

    const response = await request(app)
      .get('/api/staff/current-status?at=2030-01-01T11:30:00%2B07:00')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const byName = Object.fromEntries(response.body.staff.map((row) => [row.masseuse_name, row]));
    expect(byName['Kie กี้'].current_state).toBe('booking_buffer');
    expect(byName['สา'].current_state).toBe('available');
    expect(byName['สา'].walk_in_priority).toBe(true);
    expect(byName['nine นาย'].walk_in_priority).toBe(false);
    expect(byName['May เมย์'].walk_in_priority).toBe(false);
    expect(byName['Kie กี้'].walk_in_priority).toBe(false);
    expect(response.body.staff.find((row) => row.walk_in_priority)?.masseuse_name).toBe('สา');
  });

  test('recent transactions endpoint normalizes mixed offsets and returns newest first', async () => {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, status, business_day
      ) VALUES
        ('TX-OLD', '2030-01-01T21:21:00+07:00', '2030-01-01', 'สา', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '9:21 PM', '10:21 PM', 'ACTIVE', ?),
        ('TX-NEW', '2030-01-01T14:55:00.000Z', '2030-01-01', 'nine นาย', 'Oil Massage', 'In-Shop', 60, 1600, 'Cash', 500, '9:55 PM', '10:55 PM', 'ACTIVE', ?)`,
      [businessDay, businessDay]
    );

    const response = await request(app)
      .get('/api/transactions/recent?limit=2&date=2030-01-01')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    expect(response.body.map((transaction) => transaction.transaction_id)).toEqual(['TX-NEW', 'TX-OLD']);
  });
});
