/* eslint-env jest */

/**
 * RIT-MONEY-002 — a tip is income, expense, and attributed.
 *
 * The `Validation:` line this file encodes, verbatim from
 * `00-project-docs/steps/reception-intake-truth-and-non-massage-income-steps.md`:
 *
 *   "an integration test records a ฿100 tip on a ฿700 massage and asserts, in one
 *    pass, day income ฿800, one expense row of ฿100 carrying that masseuse and
 *    today's business day, and `staff.total_fees_earned` **unchanged**; a second
 *    test forces the expense write to fail and asserts **no** tip transaction row
 *    exists."
 *
 * Covers AC-006, AC-007, FR-005 and SC-4 of
 * `reception-intake-truth-and-non-massage-income.md`.
 *
 * The unchanged payday balance is the operator's explicit requirement — the tips
 * "get handed to the masseuses immediately they dont get added to their payday
 * balance" — and is asserted in the SAME test as the income and the expense, so a
 * change that books the tip as earnings fails here rather than silently paying a
 * masseuse twice.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-rit-money-002-'));
process.env.DB_PATH = path.join(testDirectory, 'rit-money-002.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

const ADD_ONS_URL = '/api/transactions/add-ons';
const TODAY_SUMMARY_URL = '/api/transactions/summary/today';

let businessDay;
let parentSeq = 0;

/** Insert an original paid sale directly, so the test controls exactly what was paid. */
async function seedParent({
  masseuse = 'Nok นก',
  paid = 700,
  fee = 300,
} = {}) {
  parentSeq += 1;
  const id = `RIT-MONEY-002-PARENT-${parentSeq}`;
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

beforeAll(async () => {
  await database.connect();
  businessDay = getBusinessDayParts(new Date()).currentBusinessDay;

  await database.run("INSERT INTO business_days (business_day, status) VALUES (?, 'open')", [businessDay]);
  await database.run(
    `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid)
     VALUES ('Nok นก', 1, 1200, 0)`
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

describe('RIT-MONEY-002 — a tip is income, expense, and attributed', () => {
  test('a ฿100 tip on a ฿700 massage yields ฿800 day income, one ฿100 expense row carrying the masseuse and the business day, and an unchanged payday balance', async () => {
    const parentId = await seedParent({ masseuse: 'Nok นก', paid: 700, fee: 300 });

    const feesBefore = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'Nok นก'"
    );
    const expensesBefore = await database.get('SELECT COUNT(*) AS n FROM expenses');

    const tip = await createAddOn({
      parent_transaction_id: parentId,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Cash',
    });
    expect(tip.status).toBe(201);

    // Income side — the day's money is the ledger's own figure, read through the
    // real endpoint the money panel reads. 700 + 100 = 800, the operator's own
    // worked example.
    const summary = await request(app).get(TODAY_SUMMARY_URL);
    expect(summary.status).toBe(200);
    expect(Number(summary.body.total_revenue)).toBe(800);
    expect(summary.body.business_day).toBe(businessDay);

    // Expense side — exactly one row, of the tip's amount, attributed.
    const expenseRows = await database.all('SELECT * FROM expenses');
    expect(expenseRows).toHaveLength(Number(expensesBefore.n) + 1);
    const expenseRow = expenseRows[expenseRows.length - 1];
    expect(Number(expenseRow.amount)).toBe(100);
    expect(expenseRow.masseuse_name).toBe('Nok นก');
    expect(expenseRow.business_day).toBe(businessDay);
    // `expenses.date` is NOT NULL and is a DIFFERENT fact from the business day —
    // every other expense insert fills it from the UTC calendar day, and the
    // day-scoped readers and the end-day handler all key on it.
    expect(expenseRow.date).toBe(new Date().toISOString().split('T')[0]);
    // The pairing is traceable: `expenses` has no foreign key to `transactions`,
    // so the tip's transaction id is carried in the description.
    expect(expenseRow.description).toContain(tip.body.add_on.transaction_id);

    // The tip transaction row itself: linked, attributed, no commission.
    const tipRow = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [tip.body.add_on.transaction_id]
    );
    expect(tipRow.parent_transaction_id).toBe(parentId);
    expect(tipRow.add_on_kind).toBe('TIP');
    expect(tipRow.masseuse_name).toBe('Nok นก');
    expect(tipRow.business_day).toBe(businessDay);
    expect(Number(tipRow.masseuse_fee)).toBe(0);

    // The operator's explicit requirement: a tip is handed over immediately and
    // never enters the payday balance.
    const feesAfter = await database.get(
      "SELECT total_fees_earned FROM staff WHERE name = 'Nok นก'"
    );
    expect(Number(feesAfter.total_fees_earned)).toBe(Number(feesBefore.total_fees_earned));
  });

  test('a failed expense write leaves NO tip transaction row', async () => {
    const parentId = await seedParent({ masseuse: 'Nok นก', paid: 700, fee: 300 });
    const expensesBefore = await database.get('SELECT COUNT(*) AS n FROM expenses');

    // Force the SECOND write to fail, leaving the first already inserted. Only a
    // real database transaction can undo it; asserting on the status code alone
    // would not prove the rollback happened, so the assertion below is that the
    // tip row does not exist.
    const realRun = database.run.bind(database);
    const spy = jest.spyOn(database, 'run').mockImplementation((sql, params) => {
      if (/INSERT\s+INTO\s+expenses/i.test(sql)) {
        return Promise.reject(new Error('forced expense write failure (RIT-MONEY-002 rollback test)'));
      }
      return realRun(sql, params);
    });

    let tip;
    try {
      tip = await createAddOn({
        parent_transaction_id: parentId,
        add_on_kind: 'TIP',
        amount: 100,
        payment_method: 'Cash',
      });
    } finally {
      spy.mockRestore();
    }

    expect(tip.status).toBe(500);

    const orphanTips = await database.all(
      "SELECT * FROM transactions WHERE add_on_kind = 'TIP' AND parent_transaction_id = ?",
      [parentId]
    );
    expect(orphanTips).toHaveLength(0);

    const expensesAfter = await database.get('SELECT COUNT(*) AS n FROM expenses');
    expect(Number(expensesAfter.n)).toBe(Number(expensesBefore.n));
  });

  test('a MISC_INCOME entry still writes no expense row', async () => {
    const expensesBefore = await database.get('SELECT COUNT(*) AS n FROM expenses');

    const misc = await createAddOn({
      add_on_kind: 'MISC_INCOME',
      amount: 50,
      description: 'ยาหม่อง',
      payment_method: 'Cash',
    });

    expect(misc.status).toBe(201);
    const expensesAfter = await database.get('SELECT COUNT(*) AS n FROM expenses');
    expect(Number(expensesAfter.n)).toBe(Number(expensesBefore.n));
  });
});
