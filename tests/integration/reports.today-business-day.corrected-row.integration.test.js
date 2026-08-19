/* eslint-env jest */

/**
 * RIT-LIVE-002 — today's money counts a corrected row, on the right day.
 *
 * Spec: reception-intake-truth-and-non-massage-income.md FR-001, FR-002,
 * AC-002, AC-003.
 *
 * The clock is pinned to 02:33 Bangkok on 2026-08-20, which is
 * 2026-08-19T19:33Z. That single instant exercises both halves of the step at
 * once:
 *
 *   - the Bangkok business day is `2026-08-20` (02:33 is past the 02:00 reset,
 *     so the day is the Bangkok calendar date itself);
 *   - the UTC calendar date is `2026-08-19`.
 *
 * They disagree, so a reader still keyed to `transactions.date` reports a
 * different day from the staff panel — the defect FR-002 names.
 *
 * The edit chain is built by driving the REAL correction route, so the status
 * literals under test are the ones production writes.
 *
 * The `TX-RIT-LIVE-002-NULLDAY` row is not decoration. It carries a NULL
 * `business_day` on the UTC calendar date, so it is exactly the row a reader
 * keyed to the wrong column picks up and a reader keyed to `business_day`
 * drops. FR-002's Failure Modes require it to be excluded from today's figures
 * and to surface in a data-integrity check rather than be coalesced away.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const MockDate = require('mockdate');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-today-business-day-test-'));
process.env.DB_PATH = path.join(testDirectory, 'today-business-day-test.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

// 02:33 Bangkok on 2026-08-20.
const FIXED_NOW = '2026-08-19T19:33:00.000Z';
const BUSINESS_DAY = '2026-08-20';
const UTC_CALENDAR_DATE = '2026-08-19';

describe('RIT-LIVE-002 — today\'s money counts a corrected row, on the right day', () => {
  const startDateTime = new Date(Date.parse(FIXED_NOW) - 5 * 60000).toISOString();
  const endDateTime = new Date(Date.parse(FIXED_NOW) + 55 * 60000).toISOString();

  beforeAll(async () => {
    MockDate.set(FIXED_NOW);
    await database.connect();

    await database.run(
      'INSERT INTO business_days (business_day, status) VALUES (?, \'open\')',
      [BUSINESS_DAY]
    );
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'ขวัญ', 1, 0, 0), (2, 'มิน', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'ขวัญ', 1, NULL), (?, 2, 'มิน', 2, NULL)`,
      [BUSINESS_DAY, BUSINESS_DAY]
    );
    await database.run(
      `INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
       VALUES ('Thai Massage', 60, 'In-Shop', 1000, 300, 1)`
    );

    // The one real massage of the business day.
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        start_datetime, end_datetime
      ) VALUES ('TX-RIT-LIVE-002-ORIGINAL', ?, ?, 'ขวัญ', 'Thai Massage', 'In-Shop', 60,
                1000, 'Cash', 300, '02:33 AM', '03:33 AM', 'RIT-LIVE-002 original',
                'ACTIVE', ?, ?, ?)`,
      [FIXED_NOW, UTC_CALENDAR_DATE, BUSINESS_DAY, startDateTime, endDateTime]
    );

    // A row with no business day at all, sitting on the UTC calendar date.
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day
      ) VALUES ('TX-RIT-LIVE-002-NULLDAY', ?, ?, 'มิน', 'Thai Massage', 'In-Shop', 60,
                5000, 'Cash', 1500, '01:00 AM', '02:00 AM', 'RIT-LIVE-002 null business day',
                'ACTIVE', NULL)`,
      [FIXED_NOW, UTC_CALENDAR_DATE]
    );
  });

  afterAll(async () => {
    MockDate.reset();
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('after an edit the day shows exactly one massage, on the Bangkok business day', async () => {
    const correction = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        corrected_transaction_id: 'TX-RIT-LIVE-002-ORIGINAL',
        masseuse_name: 'ขวัญ',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '02:33 AM',
        end_time: '03:33 AM',
        customer_contact: 'RIT-LIVE-002 correction',
        start_datetime: startDateTime,
        end_datetime: endDateTime
      });
    expect(correction.status).toBe(201);
    expect(correction.body.status).toBe('CORRECTED');

    // The chain the real route wrote: the original is superseded, the
    // replacement is the single live row.
    const chain = await database.all(
      `SELECT transaction_id, status, business_day, date FROM transactions
       WHERE masseuse_name = 'ขวัญ' ORDER BY id ASC`
    );
    expect(chain.map((row) => row.status)).toEqual([
      `EDITED (Corrected by ${correction.body.transaction_id})`,
      'CORRECTED'
    ]);
    // The replacement's own `date` column is the UTC calendar date, which is
    // NOT the business day. This is what makes the column choice observable.
    expect(chain[1].date).toBe(UTC_CALENDAR_DATE);
    expect(chain[1].business_day).toBe(BUSINESS_DAY);

    const summary = await request(app).get('/api/reports/summary/today').set('x-pwtest', '1');
    expect(summary.status).toBe(200);

    // Exactly one massage's money, and exactly one customer. The superseded
    // original must not double it; the NULL-business-day row must not be in it.
    expect(summary.body.total_revenue).toBe(1000);
    expect(summary.body.transaction_count).toBe(1);
    expect(summary.body.base_fee_total).toBe(300);
    expect(summary.body.payment_breakdown).toEqual([
      { payment_method: 'Cash', count: 1, revenue: 1000 }
    ]);

    const daily = await request(app).get('/api/reports/daily').set('x-pwtest', '1');
    expect(daily.status).toBe(200);
    expect(daily.body.transaction_summary.total_revenue).toBe(1000);
    expect(daily.body.transaction_summary.transaction_count).toBe(1);
    expect(daily.body.masseuse_performance).toEqual([
      expect.objectContaining({ masseuse_name: 'ขวัญ', massage_count: 1, total_revenue: 1000 })
    ]);
  });

  test('the day summary and the staff panel report the same business day at 02:33 Bangkok', async () => {
    const summary = await request(app).get('/api/reports/summary/today').set('x-pwtest', '1');
    expect(summary.status).toBe(200);

    const staffStatus = await request(app).get('/api/staff/current-status').set('x-pwtest', '1');
    expect(staffStatus.status).toBe(200);

    // 02:33 Bangkok is past the 02:00 reset, so the business day is the Bangkok
    // calendar date itself — and it is NOT the UTC calendar date.
    expect(staffStatus.body.business_day).toBe(BUSINESS_DAY);
    expect(summary.body.business_day).toBe(BUSINESS_DAY);
    expect(summary.body.business_day).not.toBe(UTC_CALENDAR_DATE);
    expect(summary.body.business_day).toBe(staffStatus.body.business_day);

    const daily = await request(app).get('/api/reports/daily').set('x-pwtest', '1');
    expect(daily.body.business_day).toBe(BUSINESS_DAY);
  });

  test('a NULL business_day row is excluded from today\'s figures and stays visible to a data-integrity check', async () => {
    const summary = await request(app).get('/api/reports/summary/today').set('x-pwtest', '1');
    // ฿5000 of it, so its presence in the total could not be missed.
    expect(summary.body.total_revenue).toBe(1000);

    // FR-002 Failure Modes: excluded, never coalesced. It is still in the
    // ledger and a data-integrity query still finds it.
    const orphans = await database.all(
      `SELECT transaction_id FROM transactions
       WHERE business_day IS NULL AND status IN ('ACTIVE', 'CORRECTED')`
    );
    expect(orphans.map((row) => row.transaction_id)).toEqual(['TX-RIT-LIVE-002-NULLDAY']);
  });
});
