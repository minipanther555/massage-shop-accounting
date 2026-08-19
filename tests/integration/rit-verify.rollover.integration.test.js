/* eslint-env jest */

/**
 * RIT-VERIFY-001 — the five journeys hold end to end. Journey 3.
 *
 *   Journey 3 — "the clock crosses 02:00 and the money panel and the staff panel
 *   report the same business day."
 *
 * The clock is pinned with `mockdate` to 02:33 Bangkok on 2026-08-20, which is
 * 2026-08-19T19:33Z. At that instant the Bangkok business day (`2026-08-20`,
 * past the 02:00 reset) and the UTC calendar date (`2026-08-19`) disagree, so a
 * reader still keyed to `transactions.date` reports a different day from the
 * staff panel — the exact defect FR-002 names, and the operator's overnight
 * symptom.
 *
 * This is the JOURNEY, not the unit check `RIT-LIVE-002` already ships: the
 * massage is created by driving the real intake route AT that instant, then
 * edited through the real correction route, and both panels are read back off
 * their real endpoints. It proves the two panels agree about a row that was born
 * inside the disputed window, rather than about a row seeded on the right day.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');
const MockDate = require('mockdate');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-rit-verify-rollover-'));
process.env.DB_PATH = path.join(testDirectory, 'rit-verify-rollover.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

// 02:33 Bangkok on 2026-08-20.
const FIXED_NOW = '2026-08-19T19:33:00.000Z';
const BUSINESS_DAY = '2026-08-20';
const UTC_CALENDAR_DATE = '2026-08-19';

const WORKING = 'ขวัญ';
const FREE = 'มิน';
const SERVICE = 'Thai Massage';
const PRICE = 700;
const FEE = 300;

const startDateTime = new Date(Date.parse(FIXED_NOW) - 5 * 60000).toISOString();
const endDateTime = new Date(Date.parse(FIXED_NOW) + 55 * 60000).toISOString();

function api(method, url) {
  return request(app)[method](url).set('x-pwtest', '1');
}

beforeAll(async () => {
  MockDate.set(FIXED_NOW);
  await database.connect();

  await database.run(
    "INSERT OR IGNORE INTO business_days (business_day, status) VALUES (?, 'open')",
    [BUSINESS_DAY]
  );
  await database.run(
    `INSERT OR REPLACE INTO services
       (service_name, duration_minutes, location, price, masseuse_fee, active)
     VALUES (?, 60, 'In-Shop', ?, ?, 1)`,
    [SERVICE, PRICE, FEE]
  );
  for (const name of [WORKING, FREE]) {
    await api('post', '/api/admin/staff').send({ name });
    const added = await api('post', '/api/staff/today/add').send({ display_name: name });
    expect(added.status).toBe(201);
  }
});

afterAll(async () => {
  MockDate.reset();
  await database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

describe('RIT-VERIFY-001 Journey 3 — the clock crosses 02:00 and both panels report the same business day', () => {
  test('a massage taken at 02:33 Bangkok, then edited, lands on the Bangkok business day in both the money panel and the staff panel', async () => {
    const created = await api('post', '/api/transactions').send({
      masseuse_name: WORKING,
      service_type: SERVICE,
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      start_time: '02:33 AM',
      end_time: '03:33 AM',
      customer_contact: 'RIT-VERIFY-001 overnight walk-in',
      start_datetime: startDateTime,
      end_datetime: endDateTime,
    });
    expect(created.status).toBe(201);

    // The row the real route wrote carries BOTH facts, and they disagree. This
    // is what makes the column choice observable rather than a matter of taste.
    const row = await database.get(
      'SELECT date, business_day FROM transactions WHERE transaction_id = ?',
      [created.body.transaction_id]
    );
    expect(row.date).toBe(UTC_CALENDAR_DATE);
    expect(row.business_day).toBe(BUSINESS_DAY);

    // The operator's overnight shift includes an edit.
    const corrected = await api('post', '/api/transactions').send({
      corrected_transaction_id: created.body.transaction_id,
      masseuse_name: WORKING,
      service_type: SERVICE,
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      start_time: '02:33 AM',
      end_time: '03:33 AM',
      customer_contact: 'RIT-VERIFY-001 overnight correction',
      start_datetime: startDateTime,
      end_datetime: endDateTime,
    });
    expect(corrected.status).toBe(201);
    expect(corrected.body.status).toBe('CORRECTED');

    // ---- THE TWO PANELS ----------------------------------------------------
    const money = await api('get', '/api/reports/summary/today');
    expect(money.status).toBe(200);
    const staff = await api('get', '/api/staff/current-status');
    expect(staff.status).toBe(200);

    // AC-003: the same business day, and it is NOT the UTC calendar date. The
    // second assertion is what stops "both read the same wrong column" passing.
    expect(money.body.business_day).toBe(BUSINESS_DAY);
    expect(staff.body.business_day).toBe(BUSINESS_DAY);
    expect(money.body.business_day).toBe(staff.body.business_day);
    expect(money.body.business_day).not.toBe(UTC_CALENDAR_DATE);

    // And they agree about the WORK, not merely about the label: one massage,
    // counted once on each side despite the edit.
    expect(Number(money.body.total_revenue)).toBe(PRICE);
    expect(Number(money.body.transaction_count)).toBe(1);
    const byName = new Map(staff.body.staff.map((entry) => [entry.masseuse_name, entry]));
    expect(byName.get(WORKING).today_massages).toBe(1);
    expect(byName.get(FREE).today_massages).toBe(0);

    // The daily report reads the same day too — it is a third consumer of the
    // same rule and the one the summary page shows.
    const daily = await api('get', '/api/reports/daily');
    expect(daily.status).toBe(200);
    expect(daily.body.business_day).toBe(BUSINESS_DAY);
    expect(Number(daily.body.transaction_summary.total_revenue)).toBe(PRICE);
  });
});
