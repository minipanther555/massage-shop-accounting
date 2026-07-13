const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'today-staff-count-test-'));
process.env.DB_PATH = path.join(testDirectory, 'today-staff-count.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

describe('Today Staff current business-day massage count', () => {
  before(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid)
       VALUES ('May เมย์', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO business_days (business_day, status)
       VALUES ('2026-07-13', 'open')`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES ('2026-07-13', 1, 'May เมย์', 1, NULL)`
    );
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type, location,
        duration, payment_amount, payment_method, masseuse_fee, start_time,
        end_time, status, business_day
      ) VALUES
        ('count-active-1', '2026-07-13T10:00:00+07:00', '2026-07-13', 'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '10:00', '11:00', 'ACTIVE', '2026-07-13'),
        ('count-active-2', '2026-07-13T12:00:00+07:00', '2026-07-13', 'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '12:00', '13:00', 'ACTIVE', '2026-07-13'),
        ('count-edited', '2026-07-13T14:00:00+07:00', '2026-07-13', 'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '14:00', '15:00', 'EDITED', '2026-07-13'),
        ('count-previous-day', '2026-07-12T23:00:00+07:00', '2026-07-12', 'May เมย์', 'Thai Massage', 'In-Shop', 60, 1000, 'Cash', 300, '23:00', '00:00', 'ACTIVE', '2026-07-12')`
    );
  });

  after(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('GET /api/staff/roster returns ACTIVE transaction count for the current business day only', async () => {
    const response = await request(app)
      .get('/api/staff/roster?at=2026-07-13T08:00:00.000Z')
      .set('x-pwtest', '1');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.length, 1);
    assert.deepStrictEqual({
      masseuse_name: response.body[0].masseuse_name,
      business_day: response.body[0].business_day,
      today_massages: response.body[0].today_massages
    }, {
      masseuse_name: 'May เมย์',
      business_day: '2026-07-13',
      today_massages: 2
    });
  });
});
