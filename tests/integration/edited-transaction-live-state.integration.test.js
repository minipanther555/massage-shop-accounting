/* eslint-env jest */

/**
 * ETSC-CORE-001 — availability and workload recognise a corrected row as live.
 *
 * An edit does not update a transaction in place. It relabels the original
 * `EDITED (Corrected by <id>)` (backend/routes/transactions.js:693-696) and
 * inserts a replacement with status `CORRECTED` (:713). Every reader that
 * filtered on `ACTIVE` alone therefore saw the massage as if it had never
 * happened — the masseuse read as free mid-massage and sorted to the front of
 * the walk-in queue, which is the operator's reported symptom.
 *
 * These fixtures build the exact two-row shape the edit path produces, rather
 * than driving the edit endpoint, so the assertions isolate the READERS. The
 * write path is mandated by transaction-correction-operational-reversal.md
 * FR-003 and is not under test here.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-edited-live-state-'));
process.env.DB_PATH = path.join(testDirectory, 'edited-live-state.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

const AT = '2030-01-01T11:30:00+07:00';
const AT_QUERY = '2030-01-01T11:30:00%2B07:00';

describe('ETSC-CORE-001 — a correction replacement counts as live work', () => {
  let businessDay;
  let previousBusinessDay;

  async function insertTransaction({
    transactionId,
    masseuseName,
    status = 'ACTIVE',
    businessDayValue = businessDay,
    dateValue = null,
    startIso = '2030-01-01T11:00:00+07:00',
    endIso = '2030-01-01T12:00:00+07:00',
    duration = 60,
    correctedFromId = null,
    masseuseFee = 300,
    paymentAmount = 399
  }) {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        corrected_from_id, start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, startIso, dateValue || businessDayValue, masseuseName, 'Thai Massage',
        'In-Shop', duration, paymentAmount, 'Cash', masseuseFee,
        '11:00 AM', '12:00 PM', '', status, businessDayValue,
        correctedFromId, startIso, endIso
      ]
    );
  }

  /** Build the exact row pair an edit produces: original relabelled, replacement CORRECTED. */
  async function insertEditChain({ masseuseName, originalId, replacementId, replacementEndIso, replacementDuration, replacementFee = 300 }) {
    await insertTransaction({ transactionId: originalId, masseuseName });
    await database.run(
      'UPDATE transactions SET status = ? WHERE transaction_id = ?',
      [`EDITED (Corrected by ${replacementId})`, originalId]
    );
    await insertTransaction({
      transactionId: replacementId,
      masseuseName,
      status: 'CORRECTED',
      endIso: replacementEndIso,
      duration: replacementDuration,
      correctedFromId: originalId,
      masseuseFee: replacementFee,
      paymentAmount: 798
    });
  }

  beforeAll(async () => {
    await database.connect();
    const parts = getBusinessDayParts(new Date(AT));
    businessDay = parts.currentBusinessDay;
    previousBusinessDay = parts.previousBusinessDay;

    await database.run(
      `INSERT INTO business_days (business_day, status) VALUES (?, 'open'), (?, 'open')`,
      [businessDay, previousBusinessDay]
    );
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'สา', 1, 0, 0), (2, 'มิน', 1, 0, 0), (3, 'นา', 1, 0, 0), (4, 'ฝน', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'สา', 1, NULL), (?, 2, 'มิน', 2, NULL), (?, 3, 'นา', 3, NULL)`,
      [businessDay, businessDay, businessDay]
    );

    // สา — a one-hour massage edited to two hours. The Validation-line fixture.
    await insertEditChain({
      masseuseName: 'สา',
      originalId: 'TX-SA-ORIGINAL',
      replacementId: 'TX-SA-REPLACEMENT',
      replacementEndIso: '2030-01-01T13:00:00+07:00',
      replacementDuration: 120
    });

    // มิน — two successive edits of one customer: three rows, one live.
    await insertTransaction({ transactionId: 'TX-MIN-1', masseuseName: 'มิน' });
    await database.run(
      "UPDATE transactions SET status = 'EDITED (Corrected by TX-MIN-2)' WHERE transaction_id = 'TX-MIN-1'"
    );
    await insertTransaction({ transactionId: 'TX-MIN-2', masseuseName: 'มิน', status: 'CORRECTED', correctedFromId: 'TX-MIN-1' });
    await database.run(
      "UPDATE transactions SET status = 'EDITED (Corrected by TX-MIN-3)' WHERE transaction_id = 'TX-MIN-2'"
    );
    await insertTransaction({ transactionId: 'TX-MIN-3', masseuseName: 'มิน', status: 'CORRECTED', correctedFromId: 'TX-MIN-2' });

    // นา — a cancelled row. Must count for nothing.
    await insertTransaction({ transactionId: 'TX-NA-CANCELLED', masseuseName: 'นา' });
    await database.run(
      "UPDATE transactions SET status = 'CANCELLED (Customer left before service)' WHERE transaction_id = 'TX-NA-CANCELLED'"
    );

    // Yesterday's commission — one corrected row worth 300, one superseded row worth 250.
    await insertTransaction({
      transactionId: 'TX-SA-YESTERDAY-SUPERSEDED',
      masseuseName: 'สา',
      businessDayValue: previousBusinessDay,
      masseuseFee: 250
    });
    await database.run(
      "UPDATE transactions SET status = 'EDITED (Corrected by TX-SA-YESTERDAY-LIVE)' WHERE transaction_id = 'TX-SA-YESTERDAY-SUPERSEDED'"
    );
    await insertTransaction({
      transactionId: 'TX-SA-YESTERDAY-LIVE',
      masseuseName: 'สา',
      status: 'CORRECTED',
      businessDayValue: previousBusinessDay,
      correctedFromId: 'TX-SA-YESTERDAY-SUPERSEDED',
      masseuseFee: 300
    });

    // ฝน — performance/today reads the real UTC calendar date and ignores `?at=`
    // (backend/routes/staff.js:702). That UTC-vs-business-day mismatch is a
    // pre-existing defect owned by the daily-state-freshness lane, so this row
    // is pinned to the real current UTC date instead.
    const utcToday = new Date().toISOString().split('T')[0];
    await insertTransaction({
      transactionId: 'TX-FON-SUPERSEDED',
      masseuseName: 'ฝน',
      businessDayValue: 'PERFORMANCE-FIXTURE',
      dateValue: utcToday,
      masseuseFee: 250
    });
    await database.run(
      "UPDATE transactions SET status = 'EDITED (Corrected by TX-FON-LIVE)' WHERE transaction_id = 'TX-FON-SUPERSEDED'"
    );
    await insertTransaction({
      transactionId: 'TX-FON-LIVE',
      masseuseName: 'ฝน',
      status: 'CORRECTED',
      businessDayValue: 'PERFORMANCE-FIXTURE',
      dateValue: utcToday,
      correctedFromId: 'TX-FON-SUPERSEDED',
      masseuseFee: 300
    });
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  // --- The ledger's Validation line: busy, not next in line, workload unchanged. ---

  test('the busy window follows the edited duration, not the superseded one', async () => {
    const response = await request(app)
      .get(`/api/staff/current-status?at=${AT_QUERY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const sa = response.body.staff.find((row) => row.masseuse_name === 'สา');
    expect(sa.current_state).toBe('busy');
    expect(sa.busy_until_iso).toBe(new Date('2030-01-01T13:00:00+07:00').toISOString());
  });

  test('a masseuse mid-corrected-massage is not offered as next in line', async () => {
    const response = await request(app)
      .get(`/api/staff/current-status?at=${AT_QUERY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const sa = response.body.staff.find((row) => row.masseuse_name === 'สา');
    expect(sa.walk_in_priority).toBe(false);
  });

  test('her workload count includes the correction replacement', async () => {
    const response = await request(app)
      .get(`/api/staff/current-status?at=${AT_QUERY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const sa = response.body.staff.find((row) => row.masseuse_name === 'สา');
    expect(sa.today_massages).toBe(1);
  });

  // --- The double-count guard: the predicate is an allowlist, not a denylist. ---

  test('two successive edits leave a workload of one, not three', async () => {
    const response = await request(app)
      .get(`/api/staff/current-status?at=${AT_QUERY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const min = response.body.staff.find((row) => row.masseuse_name === 'มิน');
    expect(min.today_massages).toBe(1);
  });

  test('a cancelled row counts for neither busy state nor workload', async () => {
    const response = await request(app)
      .get(`/api/staff/current-status?at=${AT_QUERY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const na = response.body.staff.find((row) => row.masseuse_name === 'นา');
    expect(na.today_massages).toBe(0);
    expect(na.current_state).toBe('available');
  });

  // --- The two further workload-fairness readers named in the step's objectives. ---

  test("yesterday's commission counts a corrected row once, so an edit today does not reorder tomorrow's roster", async () => {
    const response = await request(app)
      .get(`/api/staff/today/helper?at=${AT_QUERY}`)
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const sa = response.body.rows.find((row) => row.display_name === 'สา');
    expect(sa.previous_day_commission).toBe(300);
    expect(sa.was_day_off_yesterday).toBe(false);
  });

  test("today's per-masseuse performance counts a corrected row once", async () => {
    const response = await request(app)
      .get('/api/staff/performance/today')
      .set('x-pwtest', '1');

    expect(response.status).toBe(200);
    const fon = response.body.find((row) => row.masseuse_name === 'ฝน');
    expect(fon).toBeDefined();
    expect(fon.massage_count).toBe(1);
    expect(fon.total_fees).toBe(300);
  });

  // --- Objective 5: one shared helper, not four inline copies. ---

  test('the live-work predicate lives in one shared module and is an allowlist', () => {
    const { countsAsLiveWork } = require('../../backend/services/transaction-status-sql');

    expect(countsAsLiveWork('t')).toBe("t.status IN ('ACTIVE', 'CORRECTED')");
    expect(countsAsLiveWork('')).toBe("status IN ('ACTIVE', 'CORRECTED')");
    expect(countsAsLiveWork()).toBe("status IN ('ACTIVE', 'CORRECTED')");
    expect(countsAsLiveWork('t')).not.toMatch(/NOT LIKE|!=/);
  });

  test('staff.js imports the shared predicate and keeps no inline live-row filter', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../backend/routes/staff.js'),
      'utf8'
    );

    expect(source).toContain("require('../services/transaction-status-sql')");
    expect(source).not.toMatch(/status = 'ACTIVE'/);
    expect(source).toContain("countsAsMassage('t')");
  });
});
