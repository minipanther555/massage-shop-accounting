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
    businessDay = getBusinessDayParts(new Date()).currentBusinessDay;
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

  test('advance-queue rotates the active Today Staff list when the current next staff is served', async () => {
    const response = await request(app)
      .post('/api/staff/advance-queue')
      .set('x-pwtest', '1')
      .send({ currentMasseuse: 'สา' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      message: 'Today Staff queue advanced',
      previousNext: 'สา',
      newNext: 'nine นาย'
    }));

    const rows = await database.all(
      `SELECT display_name, position
       FROM today_staff
       WHERE business_day = ? AND removed_at IS NULL
       ORDER BY position ASC`,
      [businessDay]
    );
    expect(rows.map((row) => row.display_name)).toEqual(['nine นาย', 'May เมย์', 'สา']);
  });

  test('advance-queue does not rotate Today Staff for a manual non-next selection', async () => {
    const before = await database.all(
      `SELECT display_name FROM today_staff
       WHERE business_day = ? AND removed_at IS NULL
       ORDER BY position ASC`,
      [businessDay]
    );

    const response = await request(app)
      .post('/api/staff/advance-queue')
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

  test('recent transactions endpoint returns newest first with deterministic tie-break', async () => {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, status, business_day
      ) VALUES
        ('TX-OLD', '2030-01-01T10:00:00.000Z', '2030-01-01', 'สา', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '5:00 PM', '6:00 PM', 'ACTIVE', ?),
        ('TX-NEW', '2030-01-01T10:00:00.000Z', '2030-01-01', 'nine นาย', 'Oil Massage', 'In-Shop', 60, 1600, 'Cash', 500, '6:00 PM', '7:00 PM', 'ACTIVE', ?)`,
      [businessDay, businessDay]
    );

    const response = await request(app)
      .get('/api/transactions/recent?limit=2&date=2030-01-01')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    expect(response.body.map((transaction) => transaction.transaction_id)).toEqual(['TX-NEW', 'TX-OLD']);
  });
});
