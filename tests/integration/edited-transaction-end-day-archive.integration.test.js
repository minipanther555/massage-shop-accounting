/* eslint-env jest */

/**
 * ETSC-CORE-002 — the permanent archive counts a corrected row.
 *
 * `POST /reports/end-day` (backend/routes/reports.js:445-491) is the most
 * serious site in this step, and the only irreversible one. It does two things
 * in sequence:
 *
 *   1. it sums the day into `daily_summaries` (:450-471), filtering live rows;
 *   2. it then DELETEs the day's transaction rows (:479-491).
 *
 * So on a closed day containing an edit, the archived total omitted the money
 * AND the source rows were destroyed. Nothing writes `archived_transactions`,
 * so there is no second copy: the loss is permanent and unrecoverable. That is
 * why this assertion is the one to be most confident in.
 *
 * This lives in its own spec file rather than beside the read-side assertions
 * because end-day empties the day. Each Jest spec file calls `mkdtempSync` and
 * sets `process.env.DB_PATH` at module scope before requiring the server, and
 * Jest runs spec files in separate workers — so a separate file is the only
 * thing that actually guarantees isolation. Ordering the test last inside one
 * shared file would work by declaration-order luck, not by construction.
 *
 * end-day fires ONCE in `beforeAll`; every test then reads `daily_summaries`,
 * so no test here depends on running before or after any other.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-edited-end-day-'));
process.env.DB_PATH = path.join(testDirectory, 'edited-end-day.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');

// end-day derives its day from `new Date().toISOString().split('T')[0]`
// (backend/routes/reports.js:447) and honours no clock pin, so the fixture is
// pinned to the real current UTC calendar date.
const UTC_TODAY = new Date().toISOString().split('T')[0];

describe('ETSC-CORE-002 — closing the day archives the edited amount, not zero', () => {
  let endDayResponse;

  async function insertTransaction({
    transactionId,
    masseuseName,
    status = 'ACTIVE',
    paymentAmount,
    masseuseFee,
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
        'In-Shop', 60, paymentAmount, 'Cash', masseuseFee,
        '11:00 AM', '12:00 PM', '', status, UTC_TODAY,
        correctedFromId, `${UTC_TODAY}T04:00:00.000Z`, `${UTC_TODAY}T05:00:00.000Z`
      ]
    );
  }

  beforeAll(async () => {
    await database.connect();

    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'สา', 1, 0, 0), (2, 'นา', 1, 0, 0)`
    );

    // สา — 399 edited to 798. The whole point: this money must reach the books.
    await insertTransaction({
      transactionId: 'TX-SA-ORIGINAL',
      masseuseName: 'สา',
      paymentAmount: 399,
      masseuseFee: 150
    });
    await database.run(
      "UPDATE transactions SET status = 'EDITED (Corrected by TX-SA-REPLACEMENT)' WHERE transaction_id = 'TX-SA-ORIGINAL'"
    );
    await insertTransaction({
      transactionId: 'TX-SA-REPLACEMENT',
      masseuseName: 'สา',
      status: 'CORRECTED',
      paymentAmount: 798,
      masseuseFee: 300,
      correctedFromId: 'TX-SA-ORIGINAL'
    });

    // นา — a cancelled walk-in worth 500. Must not reach the books either.
    await insertTransaction({
      transactionId: 'TX-NA-CANCELLED',
      masseuseName: 'นา',
      paymentAmount: 500,
      masseuseFee: 200
    });
    await database.run(
      "UPDATE transactions SET status = 'CANCELLED (Customer left before service)' WHERE transaction_id = 'TX-NA-CANCELLED'"
    );

    endDayResponse = await request(app)
      .post('/api/reports/end-day')
      .set('x-pwtest', '1')
      .send({});
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  test('end-day succeeds', () => {
    expect(endDayResponse.status).toBe(200);
  });

  test('the archived row carries the edited 798, not zero (reports.js:456)', async () => {
    const archived = await database.get(
      'SELECT total_revenue, total_fees, total_transactions FROM daily_summaries WHERE date = ?',
      [UTC_TODAY]
    );

    expect(archived).toBeDefined();
    expect(archived.total_revenue).toBe(798);
    expect(archived.total_fees).toBe(300);
    expect(archived.total_transactions).toBe(1);
  });

  test('the end-day response reports the same archived total it wrote', () => {
    expect(endDayResponse.body.daily_summary.total_revenue).toBe(798);
    expect(endDayResponse.body.daily_summary.total_fees).toBe(300);
    expect(endDayResponse.body.daily_summary.total_transactions).toBe(1);
  });

  test('the superseded 399 and the cancelled 500 are not archived', async () => {
    const archived = await database.get(
      'SELECT total_revenue FROM daily_summaries WHERE date = ?',
      [UTC_TODAY]
    );

    // Admitting the superseded row would archive 1197; admitting the cancelled
    // row would archive 1298; admitting both, 1697.
    expect(archived.total_revenue).not.toBe(1197);
    expect(archived.total_revenue).not.toBe(1298);
    expect(archived.total_revenue).not.toBe(1697);
  });

  test('the archive is the only surviving record, which is why it must be right', async () => {
    // end-day deletes the day's transaction rows at reports.js:479-491 and
    // nothing writes `archived_transactions`, so once the day is closed the
    // `daily_summaries` figure is unrecoverable from anywhere else.
    const survivingRows = await database.all(
      'SELECT transaction_id FROM transactions WHERE date = ?',
      [UTC_TODAY]
    );
    const archivedElsewhere = await database.get(
      'SELECT COUNT(*) AS count FROM archived_transactions'
    );

    expect(survivingRows).toHaveLength(0);
    expect(archivedElsewhere.count).toBe(0);
  });
});
