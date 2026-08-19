/* eslint-env jest */

/**
 * RIT-VERIFY-001 — the five journeys hold end to end. Journeys 2 and 4.
 *
 * `Validation:` line this file part-encodes, verbatim from
 * `00-project-docs/steps/reception-intake-truth-and-non-massage-income-steps.md`:
 *
 *   "all five journey tests green, and the Completion Notes carry the terminal
 *    output of the one observed failing beforehand." (AC-011 partially,
 *    §10 Regression Tests)
 *
 *   Journey 2 — "a transaction is edited and the masseuse stays busy, counted
 *   once, and off the front of the queue."
 *   Journey 4 — "a tip is recorded and the book shows both sides while the
 *   queue is untouched."
 *
 * These are JOURNEYS, not unit checks: every row is created by driving the real
 * HTTP route reception drives, and every verdict is read back off the real
 * endpoint the page reads. Nothing is stubbed, and no status literal is invented
 * here — the correction chain's literals are whatever production writes.
 *
 * Both journeys share one database, so every money and queue assertion is a
 * BEFORE/AFTER DELTA, never a whole-table count. That rule is
 * `RIT-MONEY-002`'s Discovery in the steps ledger: a whole-table count silently
 * encodes "nothing else in this file writes here", which stopped being true the
 * moment a tip started writing an expense row.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-rit-verify-journeys-'));
process.env.DB_PATH = path.join(testDirectory, 'rit-verify-journeys.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDay } = require('../../backend/utils/business-day');

const SUMMARY_URL = '/api/reports/summary/today';
const STATUS_URL = '/api/staff/current-status';

// Three masseuses: one takes the work, and two stay free so "she is off the
// front of the queue" has somewhere to point. An assertion that only checked
// "she is busy" would pass an implementation that marks everybody busy.
const WORKING = 'ขวัญ';
const FREE_FIRST = 'มิน';
const FREE_SECOND = 'นา';

const SERVICE = 'Thai Massage';
const PRICE = 700;
const FEE = 300;

const businessDay = getBusinessDay(new Date());
const nowMs = Date.now();
// A window that has already started and is still open, so the row is genuinely
// live work at the instant current-status is read.
const startDateTime = new Date(nowMs - 5 * 60000).toISOString();
const endDateTime = new Date(nowMs + 3 * 3600000).toISOString();

function api(method, url) {
  return request(app)[method](url).set('x-pwtest', '1');
}

async function seedStaff(name) {
  await api('post', '/api/admin/staff').send({ name });
  const added = await api('post', '/api/staff/today/add').send({ display_name: name });
  expect(added.status).toBe(201);
}

/** Create a walk-in exactly as the intake page does — through POST /api/transactions. */
async function createWalkIn(masseuseName) {
  const response = await api('post', '/api/transactions').send({
    masseuse_name: masseuseName,
    service_type: SERVICE,
    location: 'In-Shop',
    duration: 60,
    payment_method: 'Cash',
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    customer_contact: 'RIT-VERIFY-001 walk-in',
    start_datetime: startDateTime,
    end_datetime: endDateTime,
  });
  expect(response.status).toBe(201);
  return response.body.transaction_id;
}

/** Edit a transaction exactly as the correction control does. */
async function edit(originalTransactionId, masseuseName) {
  const response = await api('post', '/api/transactions').send({
    corrected_transaction_id: originalTransactionId,
    masseuse_name: masseuseName,
    service_type: SERVICE,
    location: 'In-Shop',
    duration: 60,
    payment_method: 'Cash',
    start_time: '10:00 AM',
    end_time: '11:00 AM',
    customer_contact: 'RIT-VERIFY-001 correction',
    start_datetime: startDateTime,
    end_datetime: endDateTime,
  });
  expect(response.status).toBe(201);
  expect(response.body.status).toBe('CORRECTED');
  return response.body.transaction_id;
}

async function readStatus() {
  const response = await api('get', STATUS_URL);
  expect(response.status).toBe(200);
  return {
    byName: new Map(response.body.staff.map((row) => [row.masseuse_name, row])),
    nextInQueue: (response.body.staff.find((row) => row.walk_in_priority) || {}).masseuse_name || '',
    businessDay: response.body.business_day,
  };
}

async function readMoney() {
  const response = await api('get', SUMMARY_URL);
  expect(response.status).toBe(200);
  return {
    revenue: Number(response.body.total_revenue),
    customers: Number(response.body.transaction_count),
    businessDay: response.body.business_day,
  };
}

beforeAll(async () => {
  await database.connect();
  await database.run(
    "INSERT OR IGNORE INTO business_days (business_day, status) VALUES (?, 'open')",
    [businessDay]
  );
  await database.run(
    `INSERT OR REPLACE INTO services
       (service_name, duration_minutes, location, price, masseuse_fee, active)
     VALUES (?, 60, 'In-Shop', ?, ?, 1)`,
    [SERVICE, PRICE, FEE]
  );
  for (const name of [WORKING, FREE_FIRST, FREE_SECOND]) {
    await seedStaff(name);
  }
});

afterAll(async () => {
  await database.close();
  fs.rmSync(testDirectory, { recursive: true, force: true });
});

describe('RIT-VERIFY-001 Journey 2 — a transaction is edited and the masseuse stays busy, counted once, and off the front of the queue', () => {
  test('two consecutive edits leave her busy, at exactly one massage, out of the queue, and the day counted once', async () => {
    const original = await createWalkIn(WORKING);

    // The state the edit must PRESERVE. Captured before any correction so the
    // "counted once" claim is a delta across the edits, not a whole-table count.
    const moneyBeforeEdits = await readMoney();
    const statusBeforeEdits = await readStatus();
    expect(statusBeforeEdits.byName.get(WORKING).current_state).toBe('busy');
    expect(statusBeforeEdits.byName.get(WORKING).today_massages).toBe(1);

    // AC-002 asks for the verdict after ONE edit and again after TWO.
    const firstReplacement = await edit(original, WORKING);
    const afterOneEdit = await readStatus();
    expect(afterOneEdit.byName.get(WORKING).current_state).toBe('busy');
    expect(afterOneEdit.byName.get(WORKING).today_massages).toBe(1);

    const secondReplacement = await edit(firstReplacement, WORKING);

    // The chain production actually wrote. The literals are read back, never
    // asserted from a string this test invented.
    const chain = await database.all(
      `SELECT transaction_id, status FROM transactions
        WHERE business_day = ? AND masseuse_name = ? ORDER BY id ASC`,
      [businessDay, WORKING]
    );
    expect(chain.map((row) => row.status)).toEqual([
      `EDITED (Corrected by ${firstReplacement})`,
      `EDITED (Corrected by ${secondReplacement})`,
      'CORRECTED',
    ]);

    const afterTwoEdits = await readStatus();

    // 1. She stays busy — the replacement is live work, not a superseded row.
    expect(afterTwoEdits.byName.get(WORKING).current_state).toBe('busy');

    // 2. Counted ONCE — not zero (the edit erased her), not three (each
    //    generation counted).
    expect(afterTwoEdits.byName.get(WORKING).today_massages).toBe(1);

    // 3. Off the front of the queue, and somebody who is genuinely free is on
    //    it. Without the second half, "everybody is busy" would pass.
    expect(afterTwoEdits.byName.get(WORKING).walk_in_priority).toBe(false);
    expect(afterTwoEdits.nextInQueue).not.toBe('');
    expect(afterTwoEdits.nextInQueue).not.toBe(WORKING);
    expect(afterTwoEdits.byName.get(afterTwoEdits.nextInQueue).current_state).toBe('available');

    // 4. Today Staff order is untouched by the edit — the correction spec's
    //    line-32 prohibition, and this epic's own line-21 invariant.
    const order = await database.all(
      `SELECT display_name FROM today_staff
        WHERE business_day = ? AND removed_at IS NULL ORDER BY position ASC`,
      [businessDay]
    );
    expect(order.map((row) => row.display_name)).toEqual([WORKING, FREE_FIRST, FREE_SECOND]);

    // 5. The day's money counted the massage ONCE. A delta of zero across two
    //    edits is what "counted once" means for the money panel.
    const moneyAfterEdits = await readMoney();
    expect(moneyAfterEdits.revenue).toBe(moneyBeforeEdits.revenue);
    expect(moneyAfterEdits.customers).toBe(moneyBeforeEdits.customers);
    expect(moneyAfterEdits.revenue).toBe(PRICE);
    expect(moneyAfterEdits.customers).toBe(1);
  });
});

describe('RIT-VERIFY-001 Journey 4 — a tip is recorded and the book shows both sides while the queue is untouched', () => {
  test('a ฿100 tip adds ฿100 of income and one attributed expense row, and moves nobody in the queue', async () => {
    // The tip needs a live parent. FREE_FIRST takes a massage of her own, which
    // also leaves FREE_SECOND as the one genuinely free masseuse.
    const parentId = await createWalkIn(FREE_FIRST);

    const moneyBefore = await readMoney();
    const statusBefore = await readStatus();
    const expensesBefore = await database.get('SELECT COUNT(*) AS n FROM expenses');
    const feesBefore = await database.get(
      'SELECT total_fees_earned FROM staff WHERE name = ?', [FREE_FIRST]
    );

    // The comparison below is worthless unless somebody really is labelled next
    // before the entry — otherwise it compares two empty strings.
    // (`RIT-UI-003`'s Discovery in the steps ledger.)
    expect(statusBefore.nextInQueue).not.toBe('');
    const massagesBefore = statusBefore.byName.get(FREE_FIRST).today_massages;

    const tip = await api('post', '/api/transactions/add-ons').send({
      parent_transaction_id: parentId,
      add_on_kind: 'TIP',
      amount: 100,
      payment_method: 'Credit Card',
    });
    expect(tip.status).toBe(201);
    const tipTransactionId = tip.body.add_on.transaction_id;

    // ---- THE BOOK SHOWS BOTH SIDES ----------------------------------------
    // Income side: +฿100 on the day, read through the endpoint the money panel
    // reads. A delta, so the massages already in the book do not matter.
    const moneyAfter = await readMoney();
    expect(moneyAfter.revenue - moneyBefore.revenue).toBe(100);
    expect(moneyAfter.businessDay).toBe(businessDay);

    // Expense side: exactly one new row, of the tip's amount, carrying the
    // masseuse and the business day. Again a delta, never a whole-table count.
    const expensesAfter = await database.all('SELECT * FROM expenses ORDER BY id ASC');
    expect(expensesAfter).toHaveLength(Number(expensesBefore.n) + 1);
    const expenseRow = expensesAfter[expensesAfter.length - 1];
    expect(Number(expenseRow.amount)).toBe(100);
    expect(expenseRow.masseuse_name).toBe(FREE_FIRST);
    expect(expenseRow.business_day).toBe(businessDay);
    expect(expenseRow.description).toContain(tipTransactionId);

    // Net neutral, and never in her payday balance — the operator's own model.
    const feesAfter = await database.get(
      'SELECT total_fees_earned FROM staff WHERE name = ?', [FREE_FIRST]
    );
    expect(Number(feesAfter.total_fees_earned)).toBe(Number(feesBefore.total_fees_earned));

    // ---- THE QUEUE IS UNTOUCHED -------------------------------------------
    // Re-read the REAL endpoint. Nothing here is a fixture: a mocked status
    // response would make this assertion true by construction and prove nothing
    // about the server's queue (`RIT-UI-003`'s Discovery).
    const statusAfter = await readStatus();
    expect(statusAfter.nextInQueue).toBe(statusBefore.nextInQueue);
    expect(statusAfter.byName.get(FREE_FIRST).today_massages).toBe(massagesBefore);
    expect(statusAfter.byName.get(WORKING).today_massages)
      .toBe(statusBefore.byName.get(WORKING).today_massages);

    // Today Staff order untouched too.
    const order = await database.all(
      `SELECT display_name FROM today_staff
        WHERE business_day = ? AND removed_at IS NULL ORDER BY position ASC`,
      [businessDay]
    );
    expect(order.map((row) => row.display_name)).toEqual([WORKING, FREE_FIRST, FREE_SECOND]);
  });
});
