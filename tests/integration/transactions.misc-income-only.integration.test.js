/* eslint-env jest */

/**
 * RIT-MONEY-003 — miscellaneous income is income only.  (promoted from the S5 harness at S12)
 *
 * `Validation:` line, verbatim from the governed steps file:
 *
 *   "an integration test records ฿50 of miscellaneous income and asserts day
 *    income rises by exactly ฿50, that the expenses table gained **no** row, that
 *    no masseuse fee was recorded, and that every masseuse's `today_massages` is
 *    unchanged from before the entry. (AC-008, AC-009, FR-006, FR-007, SC-5)"
 *
 * Every count in this file is a BEFORE/AFTER DELTA across the one request under
 * test, never a whole-table count — RIT-MONEY-002's Discovery: a suite that
 * shares one database cannot prove "no row was written" with an absolute count,
 * because anything else in the file (or in a later step) that writes a row makes
 * the count non-zero for a behaviour that never regressed.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-rit-money-003-'));
process.env.DB_PATH = path.join(testDirectory, 'rit-money-003.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

const ADD_ONS_URL = '/api/transactions/add-ons';
const TODAY_SUMMARY_URL = '/api/transactions/summary/today';
const CURRENT_STATUS_URL = '/api/staff/current-status';

const MASSEUSE = 'Nok นก';
const OTHER_MASSEUSE = 'Mali มะลิ';

let businessDay;
let parentSeq = 0;

async function seedParent({ masseuse = MASSEUSE, paid = 700, fee = 300 } = {}) {
  parentSeq += 1;
  const id = `RIT-MONEY-003-PARENT-${parentSeq}`;
  await database.run(
    `INSERT INTO transactions (
       transaction_id, timestamp, date, masseuse_name, service_type, location,
       duration, payment_amount, payment_method, masseuse_fee, start_time, end_time,
       status, business_day, start_datetime, end_datetime, payment_status
     ) VALUES (?, ?, ?, ?, 'Thai Massage', 'In-Shop', 90, ?, 'Cash', ?, '14:00', '15:30',
       'ACTIVE', ?, ?, ?, 'PAID')`,
    [
      id, `${businessDay}T14:00:00+07:00`, businessDay, masseuse, paid, fee, businessDay,
      `${businessDay}T14:00:00+07:00`, `${businessDay}T15:30:00+07:00`,
    ]
  );
  return id;
}

function createAddOn(body) {
  return request(app).post(ADD_ONS_URL).send(body);
}

/** The whole map, one entry per masseuse — never a single absolute number. */
async function readMassageCounts() {
  const response = await request(app).get(CURRENT_STATUS_URL);
  expect(response.status).toBe(200);
  const counts = {};
  response.body.staff.forEach((row) => {
    counts[row.masseuse_name] = Number(row.today_massages);
  });
  return counts;
}

async function readDayMoney() {
  const response = await request(app).get(TODAY_SUMMARY_URL);
  expect(response.status).toBe(200);
  return {
    revenue: Number(response.body.total_revenue),
    fees: Number(response.body.total_fees),
  };
}

async function countRows(table) {
  const row = await database.get(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(row.n);
}

beforeAll(async () => {
  await database.connect();
  businessDay = getBusinessDayParts(new Date()).currentBusinessDay;

  await database.run("INSERT INTO business_days (business_day, status) VALUES (?, 'open')", [businessDay]);
  await database.run(
    `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
     VALUES (1, ?, 1, 1200, 0), (2, ?, 1, 900, 0)`,
    [MASSEUSE, OTHER_MASSEUSE]
  );
  await database.run(
    `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
     VALUES (?, 1, ?, 1, NULL), (?, 2, ?, 2, NULL)`,
    [businessDay, MASSEUSE, businessDay, OTHER_MASSEUSE]
  );
  await database.run(
    `INSERT OR REPLACE INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
     VALUES ('Thai Massage', 90, 'In-Shop', 700, 300, 1)`
  );
});

afterAll(async () => {
  await database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

describe('RIT-MONEY-003 — miscellaneous income is income only', () => {
  test('฿50 of miscellaneous income raises day income by exactly ฿50, writes no expense row, records no masseuse fee, and moves nobody\'s massage count', async () => {
    // The operator's own example: a normal massage, then tiger balm at ฿50.
    const parentId = await seedParent();

    const moneyBefore = await readDayMoney();
    const expensesBefore = await countRows('expenses');
    const countsBefore = await readMassageCounts();
    const feesEarnedBefore = await database.get(
      'SELECT total_fees_earned FROM staff WHERE name = ?',
      [MASSEUSE]
    );

    const misc = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      description: 'ยาหม่อง',
      payment_method: 'Cash',
    });
    expect(misc.status).toBe(201);

    // 1. Day income rises by EXACTLY 50 — a delta, read through the real endpoint
    //    the money panel reads.
    const moneyAfter = await readDayMoney();
    expect(moneyAfter.revenue - moneyBefore.revenue).toBe(50);

    // 2. The expenses table gained NO row — a delta across this one request.
    expect(await countRows('expenses')).toBe(expensesBefore);

    // 3. No masseuse fee was recorded: not on the row, not in the day's fee
    //    total, and not on the payday balance.
    const miscRow = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [misc.body.add_on.transaction_id]
    );
    expect(miscRow.add_on_kind).toBe('MISC_INCOME');
    expect(Number(miscRow.payment_amount)).toBe(50);
    expect(miscRow.service_type).toBe('ยาหม่อง');
    expect(Number(miscRow.masseuse_fee)).toBe(0);
    expect(moneyAfter.fees - moneyBefore.fees).toBe(0);
    const feesEarnedAfter = await database.get(
      'SELECT total_fees_earned FROM staff WHERE name = ?',
      [MASSEUSE]
    );
    expect(Number(feesEarnedAfter.total_fees_earned))
      .toBe(Number(feesEarnedBefore.total_fees_earned));

    // 4. EVERY masseuse's today_massages is unchanged — the whole map compared,
    //    not one absolute number.
    expect(await readMassageCounts()).toEqual(countsBefore);
  });

  test('a MISC_INCOME entry with no amount, or no description, is rejected before any write', async () => {
    const transactionsBefore = await countRows('transactions');
    const expensesBefore = await countRows('expenses');

    const noAmount = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      description: 'ยาหม่อง',
      payment_method: 'Cash',
    });
    const noDescription = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      payment_method: 'Cash',
    });
    const blankDescription = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      description: '   ',
      payment_method: 'Cash',
    });

    expect({
      noAmount: noAmount.status,
      noDescription: noDescription.status,
      blankDescription: blankDescription.status,
    }).toEqual({ noAmount: 400, noDescription: 400, blankDescription: 400 });

    // "before any write" — nothing landed in either table.
    expect(await countRows('transactions')).toBe(transactionsBefore);
    expect(await countRows('expenses')).toBe(expensesBefore);
  });

  test('a TIP still needs no description, and is accepted without one', async () => {
    // The description rule is FR-006's, under miscellaneous income. A tip is
    // FR-005 and has no such failure mode; RIT-MONEY-002 already ships a
    // fallback description for the tip's expense row. This assertion is what
    // stops the new check being widened onto the tip path later.
    const parentId = await seedParent();
    const tip = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });
    expect(tip.status).toBe(201);
  });

  test('a PARENTLESS miscellaneous income row attributed to a masseuse still moves no massage count', async () => {
    const countsBefore = await readMassageCounts();
    const expensesBefore = await countRows('expenses');

    const misc = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      description: 'ยาหม่อง',
      masseuse_name: MASSEUSE,
      payment_method: 'Cash',
    });
    expect(misc.status).toBe(201);

    const miscRow = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [misc.body.add_on.transaction_id]
    );
    expect(miscRow.parent_transaction_id).toBeNull();
    expect(miscRow.masseuse_name).toBe(MASSEUSE);

    expect(await readMassageCounts()).toEqual(countsBefore);
    expect(await countRows('expenses')).toBe(expensesBefore);
  });
});
