/* eslint-env jest */

/**
 * ETSC-CORE-002 — the day's money counts a corrected row.
 *
 * An edit does not update a transaction in place. It relabels the original
 * `EDITED (Corrected by <id>)` (backend/routes/transactions.js:693-696) and
 * inserts a replacement with status `CORRECTED` (:713). Every money reader that
 * filtered on `ACTIVE` alone therefore reported ZERO for that customer — the
 * cash the manager expects simply vanished from the day's takings while the
 * audit trail still showed the edit. That is the open theft window this step
 * closes.
 *
 * Six of the eight money readers live here; the seventh and eighth — the
 * permanent archive at reports.js:456 — are in
 * `edited-transaction-end-day-archive.integration.test.js` because
 * `POST /reports/end-day` DELETEs the day's transaction rows
 * (backend/routes/reports.js:479-491) and would empty this file's fixture.
 *
 * These fixtures build the exact row shape the edit path produces rather than
 * driving the edit endpoint, so the assertions isolate the READERS. The write
 * path's status values are mandated by
 * transaction-correction-operational-reversal.md FR-003 and are not under test.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-edited-day-money-'));
process.env.DB_PATH = path.join(testDirectory, 'edited-day-money.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

/**
 * Every endpoint under test derives its day from
 * `new Date().toISOString().split('T')[0]` and honours no `?at=` pin —
 * backend/routes/reports.js:191 and backend/routes/transactions.js:927. The
 * fixture is therefore pinned to the real current UTC calendar date, the same
 * accommodation ETSC-CORE-001's spec makes for `/staff/performance/today`.
 */
const UTC_TODAY = new Date().toISOString().split('T')[0];

describe('ETSC-CORE-002 — a correction replacement counts as live money', () => {
  async function insertTransaction({
    transactionId,
    masseuseName,
    status = 'ACTIVE',
    paymentAmount,
    masseuseFee,
    paymentMethod = 'Cash',
    correctedFromId = null
  }) {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        corrected_from_id, start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, `${UTC_TODAY}T04:00:00.000Z`, UTC_TODAY, masseuseName, 'Thai Massage',
        'In-Shop', 60, paymentAmount, paymentMethod, masseuseFee,
        '11:00 AM', '12:00 PM', '', status, UTC_TODAY,
        correctedFromId, `${UTC_TODAY}T04:00:00.000Z`, `${UTC_TODAY}T05:00:00.000Z`
      ]
    );
  }

  async function relabelSuperseded(transactionId, replacementId) {
    await database.run(
      'UPDATE transactions SET status = ? WHERE transaction_id = ?',
      [`EDITED (Corrected by ${replacementId})`, transactionId]
    );
  }

  beforeAll(async () => {
    await database.connect();

    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'สา', 1, 0, 0), (2, 'มิน', 1, 0, 0), (3, 'นา', 1, 0, 0)`
    );

    // สา — the ledger's Validation fixture: 399 edited to 798, paid in Cash.
    await insertTransaction({
      transactionId: 'TX-SA-ORIGINAL',
      masseuseName: 'สา',
      paymentAmount: 399,
      masseuseFee: 150
    });
    await relabelSuperseded('TX-SA-ORIGINAL', 'TX-SA-REPLACEMENT');
    await insertTransaction({
      transactionId: 'TX-SA-REPLACEMENT',
      masseuseName: 'สา',
      status: 'CORRECTED',
      paymentAmount: 798,
      masseuseFee: 300,
      correctedFromId: 'TX-SA-ORIGINAL'
    });

    // มิน — two successive edits of one customer, paid by Transfer. Three rows,
    // one live. The double-count guard: a denylist predicate would count all
    // three and report 1697 in the Transfer column instead of 798.
    await insertTransaction({
      transactionId: 'TX-MIN-1',
      masseuseName: 'มิน',
      paymentAmount: 399,
      masseuseFee: 150,
      paymentMethod: 'Transfer'
    });
    await relabelSuperseded('TX-MIN-1', 'TX-MIN-2');
    await insertTransaction({
      transactionId: 'TX-MIN-2',
      masseuseName: 'มิน',
      status: 'CORRECTED',
      paymentAmount: 500,
      masseuseFee: 200,
      paymentMethod: 'Transfer',
      correctedFromId: 'TX-MIN-1'
    });
    await relabelSuperseded('TX-MIN-2', 'TX-MIN-3');
    await insertTransaction({
      transactionId: 'TX-MIN-3',
      masseuseName: 'มิน',
      status: 'CORRECTED',
      paymentAmount: 798,
      masseuseFee: 300,
      paymentMethod: 'Transfer',
      correctedFromId: 'TX-MIN-2'
    });

    // นา — a cancelled walk-in worth 500 in Cash. Must count for nothing, so the
    // Cash column stays 798 rather than becoming 1298.
    await insertTransaction({
      transactionId: 'TX-NA-CANCELLED',
      masseuseName: 'นา',
      paymentAmount: 500,
      masseuseFee: 200
    });
    await database.run(
      "UPDATE transactions SET status = 'CANCELLED (Customer left before service)' WHERE transaction_id = 'TX-NA-CANCELLED'"
    );
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  // Two live rows survive the fixture: TX-SA-REPLACEMENT (798 Cash, fee 300)
  // and TX-MIN-3 (798 Transfer, fee 300).
  const LIVE_REVENUE = 1596;
  const LIVE_FEES = 600;
  const LIVE_COUNT = 2;

  // --- GET /api/reports/summary/today — reports.js:204 and :215 ---

  test('today\'s summary reports the edited 798 and excludes the superseded 399 (reports.js:204)', async () => {
    const response = await request(app)
      .get('/api/reports/summary/today')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    expect(response.body.total_revenue).toBe(LIVE_REVENUE);
    expect(response.body.transaction_count).toBe(LIVE_COUNT);
    expect(response.body.base_fee_total).toBe(LIVE_FEES);
    expect(response.body.total_fees).toBe(LIVE_FEES);
  });

  test('today\'s payment-method totals count the correction replacement (reports.js:215)', async () => {
    const response = await request(app)
      .get('/api/reports/summary/today')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const cash = response.body.payment_breakdown.find((row) => row.payment_method === 'Cash');
    const transfer = response.body.payment_breakdown.find((row) => row.payment_method === 'Transfer');

    expect(cash).toBeDefined();
    expect(cash.revenue).toBe(798);
    expect(cash.count).toBe(1);
    expect(transfer).toBeDefined();
    expect(transfer.revenue).toBe(798);
    expect(transfer.count).toBe(1);
  });

  // --- GET /api/transactions/summary/today — transactions.js:935 and :946 ---

  test('the transactions today-summary endpoint counts the correction replacement (transactions.js:935)', async () => {
    const response = await request(app)
      .get('/api/transactions/summary/today')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    expect(response.body.total_revenue).toBe(LIVE_REVENUE);
    expect(response.body.total_fees).toBe(LIVE_FEES);
    expect(response.body.transaction_count).toBe(LIVE_COUNT);
  });

  test('the transactions today-summary payment breakdown counts it too (transactions.js:946)', async () => {
    const response = await request(app)
      .get('/api/transactions/summary/today')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const cash = response.body.payment_breakdown.find((row) => row.payment_method === 'Cash');
    const transfer = response.body.payment_breakdown.find((row) => row.payment_method === 'Transfer');

    expect(cash).toBeDefined();
    expect(cash.revenue).toBe(798);
    expect(transfer).toBeDefined();
    expect(transfer.revenue).toBe(798);
  });

  // --- GET /api/reports/daily/:date — reports.js:24, :45 and :63 ---

  test('the daily report\'s revenue total counts the correction replacement (reports.js:24)', async () => {
    const response = await request(app)
      .get(`/api/reports/daily/${UTC_TODAY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    expect(response.body.transaction_summary.total_revenue).toBe(LIVE_REVENUE);
    expect(response.body.transaction_summary.transaction_count).toBe(LIVE_COUNT);
    expect(response.body.transaction_summary.base_fee_total).toBe(LIVE_FEES);
  });

  test('the daily report\'s payment breakdown counts the correction replacement (reports.js:45)', async () => {
    const response = await request(app)
      .get(`/api/reports/daily/${UTC_TODAY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const cash = response.body.payment_breakdown.find((row) => row.payment_method === 'Cash');
    const transfer = response.body.payment_breakdown.find((row) => row.payment_method === 'Transfer');

    expect(cash).toBeDefined();
    expect(cash.revenue).toBe(798);
    expect(transfer).toBeDefined();
    expect(transfer.revenue).toBe(798);
  });

  test('the daily per-masseuse report credits her with the edited 798 (reports.js:63)', async () => {
    const response = await request(app)
      .get(`/api/reports/daily/${UTC_TODAY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const sa = response.body.masseuse_performance.find((row) => row.masseuse_name === 'สา');

    expect(sa).toBeDefined();
    expect(sa.total_revenue).toBe(798);
    expect(sa.baseFees).toBe(300);
    expect(sa.massage_count).toBe(1);
  });

  // --- Objective 2: superseded and cancelled rows stay excluded. ---

  test('a cancelled row contributes nothing to any of the day\'s money readers', async () => {
    const todaySummary = await request(app)
      .get('/api/reports/summary/today')
      .set('x-pwtest', '1');
    const transactionsSummary = await request(app)
      .get('/api/transactions/summary/today')
      .set('x-pwtest', '1');
    const dailyReport = await request(app)
      .get(`/api/reports/daily/${UTC_TODAY}`)
      .set('x-pwtest', '1');

    // The cancelled row is worth 500 in Cash. If it were admitted anywhere the
    // Cash column would read 1298 and the totals would read 2096.
    expect(todaySummary.body.total_revenue).toBe(LIVE_REVENUE);
    expect(transactionsSummary.body.total_revenue).toBe(LIVE_REVENUE);
    expect(dailyReport.body.transaction_summary.total_revenue).toBe(LIVE_REVENUE);
    expect(dailyReport.body.masseuse_performance.find((row) => row.masseuse_name === 'นา'))
      .toBeUndefined();
  });

  test('two successive edits count the money once, not three times', async () => {
    const response = await request(app)
      .get('/api/reports/summary/today')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const transfer = response.body.payment_breakdown.find((row) => row.payment_method === 'Transfer');

    // มิน's chain is 399 superseded, 500 superseded, 798 live. A denylist
    // predicate would report 1697 here and a count of 3.
    expect(transfer.revenue).toBe(798);
    expect(transfer.count).toBe(1);
  });

  // --- Objective 1: one shared predicate, no inline copy left behind. ---

  test('both route files import the shared predicate and keep no inline money filter', () => {
    const reportsSource = fs.readFileSync(
      path.join(__dirname, '../../backend/routes/reports.js'),
      'utf8'
    );
    const transactionsSource = fs.readFileSync(
      path.join(__dirname, '../../backend/routes/transactions.js'),
      'utf8'
    );

    expect(reportsSource).toContain("require('../services/transaction-status-sql')");
    expect(transactionsSource).toContain("require('../services/transaction-status-sql')");

    // These two patterns cover all eight converted money sites while leaving the
    // legitimate `bc.status = 'ACTIVE'` booking-credit joins, the staff_roster
    // reset and the pending-add-on preservation subquery untouched.
    expect(reportsSource).not.toMatch(/WHERE t\.date = \? AND t\.status = 'ACTIVE'/);
    expect(reportsSource).not.toMatch(/WHERE date = \? AND status = 'ACTIVE'/);
    expect(transactionsSource).not.toMatch(/WHERE date = \? AND status = 'ACTIVE'/);

    // The date-range reports stay exactly as they are — they are the reference
    // implementation this step was matched to, not a site to convert.
    expect(reportsSource).toContain("let whereClause = \"WHERE t.status IN ('ACTIVE', 'CORRECTED')\"");

    // The settled-money filter is orthogonal and must survive at all four sites.
    expect(reportsSource.match(/isSettled\(/g)).toHaveLength(4);
  });

  test('the shared predicate is an allowlist of exactly ACTIVE and CORRECTED', () => {
    const { countsAsLiveWork } = require('../../backend/services/transaction-status-sql');

    expect(countsAsLiveWork('t')).toBe("t.status IN ('ACTIVE', 'CORRECTED')");
    expect(countsAsLiveWork('')).toBe("status IN ('ACTIVE', 'CORRECTED')");
    expect(countsAsLiveWork('t')).not.toMatch(/NOT LIKE|!=/);
  });
});
