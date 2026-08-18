/* eslint-env jest */

/**
 * ETSC-CORE-002b — correction picks a replacement who is actually free.
 *
 * `getCorrectionEligibleStaff()` (backend/routes/transactions.js:16-45) decides who
 * replaces a masseuse when reception corrects a transaction. Its caller at :650-655
 * uses it twice: `eligibleStaff[0]` is the default suggestion, and `.some(...)` is
 * the FR-007 availability guard that rejects an ineligible override with a 409.
 *
 * Both of its filters read live rows only — the workload subquery at :21 and the
 * busy scan at :29 — so a masseuse mid-massage on a correction replacement reads as
 * free with zero workload. That is transaction-correction-operational-reversal.md
 * FR-004 and FR-007 failing inside the correction flow itself.
 *
 * TWO FILTERS, TWO INDEPENDENT PROOFS. Fixing only the busy scan removes the
 * mid-massage masseuse from the list, which satisfies every assertion about her and
 * leaves nothing to compare on workload. So the workload subquery gets its own
 * assertion, built on a masseuse the busy filter cannot reach: one whose correction
 * replacement has ALREADY FINISHED. A busy-only fix fails that one.
 *
 * WHY THE WORKLOAD PROOF IS NOT AN HTTP TEST. `validateInput` (backend/server.js:86,
 * backend/middleware/input-validation.js:105-108) rejects any POST /api/transactions
 * with no `masseuse_name`, correction or not. So the default-suggestion branch at
 * :652 never executes in the running system and the sort at :45 has no HTTP-visible
 * effect. The guard half IS live, and is proven end to end through the real handler
 * and database below. The ordering half is asserted directly against the function.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-correction-picker-'));
process.env.DB_PATH = path.join(testDirectory, 'correction-picker.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const transactionsRouter = require('../../backend/routes/transactions');
const { getBusinessDay } = require('../../backend/utils/business-day');

const { getCorrectionEligibleStaff } = transactionsRouter;
const MINUTE = 60 * 1000;

describe('ETSC-CORE-002b — the correction replacement picker sees a corrected row as live work', () => {
  const businessDay = getBusinessDay(new Date());
  const today = new Date().toISOString().slice(0, 10);

  /**
   * The correction path derives its clock from `new Date()` and honours no `?at=`
   * pin (backend/routes/transactions.js:645-651), so every window is anchored to
   * real current time rather than a fixed fixture date.
   */
  function windowAround(startOffsetMinutes, endOffsetMinutes) {
    return {
      startIso: new Date(Date.now() + startOffsetMinutes * MINUTE).toISOString(),
      endIso: new Date(Date.now() + endOffsetMinutes * MINUTE).toISOString()
    };
  }

  async function insertTransaction({
    transactionId,
    masseuseName,
    status = 'ACTIVE',
    startIso,
    endIso,
    correctedFromId = null,
    duration = 60
  }) {
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        corrected_from_id, start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, startIso, today, masseuseName, 'Thai Massage',
        'In-Shop', duration, 1000, 'Cash', 300,
        '10:00 AM', '11:00 AM', 'ETSC-CORE-002b fixture', status, businessDay,
        correctedFromId, startIso, endIso
      ]
    );
  }

  /**
   * Build the exact two-row shape an edit produces: the original relabelled
   * `EDITED (Corrected by <id>)`, the replacement carrying `CORRECTED`. The write
   * path is mandated by transaction-correction-operational-reversal.md FR-003 and
   * is not under test — these fixtures isolate the READER.
   */
  async function insertEditChain({ masseuseName, originalId, replacementId, startOffset, endOffset }) {
    const { startIso, endIso } = windowAround(startOffset, endOffset);
    await insertTransaction({ transactionId: originalId, masseuseName, startIso, endIso });
    await database.run(
      'UPDATE transactions SET status = ? WHERE transaction_id = ?',
      [`EDITED (Corrected by ${replacementId})`, originalId]
    );
    await insertTransaction({
      transactionId: replacementId,
      masseuseName,
      status: 'CORRECTED',
      startIso,
      endIso,
      correctedFromId: originalId
    });
  }

  /** Put exactly these masseuses on today's roster, in this order. */
  async function setRoster(names) {
    for (let index = 0; index < names.length; index += 1) {
      await database.run(
        `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
         VALUES (?, ?, ?, ?, NULL)`,
        [businessDay, index + 1, names[index], index + 1]
      );
    }
  }

  /** The transaction reception is correcting. Its own row is excluded by the picker. */
  async function insertCorrectionTarget({ transactionId, masseuseName }) {
    const { startIso, endIso } = windowAround(-120, -60);
    await insertTransaction({ transactionId, masseuseName, startIso, endIso });
  }

  /** Run the picker exactly as the correction handler does at :651. */
  function pick(excludedTransactionId) {
    return getCorrectionEligibleStaff(businessDay, excludedTransactionId, new Date());
  }

  beforeAll(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO services (
        service_name, duration_minutes, location, price, masseuse_fee, active
      ) VALUES ('Thai Massage', 60, 'In-Shop', 1000, 300, 1)`
    );
    const everyone = ['Busy', 'Worked', 'Free', 'Wrong', 'Loaded'];
    for (let index = 0; index < everyone.length; index += 1) {
      await database.run(
        `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
         VALUES (?, ?, 1, 0, 0)`,
        [index + 1, everyone[index]]
      );
    }
  });

  beforeEach(async () => {
    await database.run('DELETE FROM transactions');
    await database.run('DELETE FROM today_staff');
    await database.run('DELETE FROM bookings');
    await database.run('DELETE FROM booking_credits');
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Assertion 1 — the busy scan. A mid-massage masseuse is not the default.
  // ---------------------------------------------------------------------------
  test('a masseuse mid-massage on a correction replacement is not the default replacement', async () => {
    await setRoster(['Busy', 'Free', 'Wrong']);
    await insertEditChain({
      masseuseName: 'Busy',
      originalId: 'TX-BUSY-ORIGINAL',
      replacementId: 'TX-BUSY-REPLACEMENT',
      startOffset: -10,
      endOffset: 50
    });
    await insertCorrectionTarget({ transactionId: 'TX-TO-CORRECT-1', masseuseName: 'Wrong' });

    const eligible = await pick('TX-TO-CORRECT-1');
    const names = eligible.map((row) => row.masseuse_name);

    expect(names).not.toContain('Busy');
    expect(names[0]).toBe('Free');
  });

  // ---------------------------------------------------------------------------
  // Assertion 2 — the busy scan through the LIVE path: the FR-007 availability
  // guard, end to end through the real handler and database.
  // ---------------------------------------------------------------------------
  test('an override naming the mid-massage masseuse is refused with a 409 and changes nothing', async () => {
    await setRoster(['Busy', 'Free', 'Wrong']);
    await insertEditChain({
      masseuseName: 'Busy',
      originalId: 'TX-BUSY-ORIGINAL-2',
      replacementId: 'TX-BUSY-REPLACEMENT-2',
      startOffset: -10,
      endOffset: 50
    });
    await insertCorrectionTarget({ transactionId: 'TX-TO-CORRECT-2', masseuseName: 'Wrong' });

    const response = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        corrected_transaction_id: 'TX-TO-CORRECT-2',
        masseuse_name: 'Busy',
        service_type: 'Thai Massage',
        location: 'In-Shop',
        duration: 60,
        payment_method: 'Cash',
        start_time: '10:00 AM',
        end_time: '11:00 AM'
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toMatch(/not currently available/i);
    expect(await database.get(
      "SELECT status FROM transactions WHERE transaction_id = 'TX-TO-CORRECT-2'"
    )).toEqual({ status: 'ACTIVE' });
    expect(await database.get(
      "SELECT COUNT(*) AS count FROM transactions WHERE corrected_from_id = 'TX-TO-CORRECT-2'"
    )).toEqual({ count: 0 });
  });

  // ---------------------------------------------------------------------------
  // Assertion 3 — the workload subquery ALONE. The load-bearing one.
  //
  // 'Worked' finished her correction replacement an hour ago, so the busy scan
  // cannot reach her however it is written, and she holds the BETTER queue
  // position. The only thing that can move the default off her is her workload
  // count. A fix that changes only the busy scan fails this test.
  // ---------------------------------------------------------------------------
  test('a masseuse whose correction replacement has already finished loses the default slot on workload, not position', async () => {
    await setRoster(['Worked', 'Free', 'Wrong']);
    await insertEditChain({
      masseuseName: 'Worked',
      originalId: 'TX-WORKED-ORIGINAL',
      replacementId: 'TX-WORKED-REPLACEMENT',
      startOffset: -120,
      endOffset: -60
    });
    await insertCorrectionTarget({ transactionId: 'TX-TO-CORRECT-3', masseuseName: 'Wrong' });

    const eligible = await pick('TX-TO-CORRECT-3');
    const worked = eligible.find((row) => row.masseuse_name === 'Worked');

    // She is still eligible — not busy — but she has done a massage.
    expect(worked).toBeDefined();
    expect(worked.today_massages).toBe(1);
    expect(worked.position).toBeLessThan(
      eligible.find((row) => row.masseuse_name === 'Free').position
    );
    // ...so the default must move to the colleague with genuinely no work,
    // despite her worse queue position.
    expect(eligible[0].masseuse_name).toBe('Free');
  });

  // ---------------------------------------------------------------------------
  // Assertion 4 — the two readers agree on the same masseuse's workload.
  // The roster (backend/routes/staff.js:42) was fixed by ETSC-CORE-001; the
  // picker must reach the same number for the same masseuse on the same day.
  // ---------------------------------------------------------------------------
  test("the picker's workload count agrees with the roster's for the same masseuse", async () => {
    await setRoster(['Worked', 'Free', 'Wrong']);
    await insertEditChain({
      masseuseName: 'Worked',
      originalId: 'TX-AGREE-ORIGINAL',
      replacementId: 'TX-AGREE-REPLACEMENT',
      startOffset: -120,
      endOffset: -60
    });
    await insertCorrectionTarget({ transactionId: 'TX-TO-CORRECT-4', masseuseName: 'Wrong' });

    const roster = await request(app).get('/api/staff/roster').set('x-pwtest', '1');
    expect(roster.status).toBe(200);
    const rosterRows = Array.isArray(roster.body) ? roster.body : (roster.body.staff || roster.body.roster);
    const workedOnRoster = rosterRows.find((row) => row.masseuse_name === 'Worked');
    expect(workedOnRoster.today_massages).toBe(1);

    const eligible = await pick('TX-TO-CORRECT-4');
    const workedInPicker = eligible.find((row) => row.masseuse_name === 'Worked');
    expect(workedInPicker.today_massages).toBe(workedOnRoster.today_massages);
  });

  // ---------------------------------------------------------------------------
  // Assertion 5 — GUARD, expected green before and after. Not a symptom
  // reproduction. It exists to fail a denylist ("anything not cancelled"), which
  // would score an edit chain at 3 and push her behind a genuinely busier
  // colleague.
  // ---------------------------------------------------------------------------
  test('GUARD: two successive edits count once, so the chain masseuse still outranks a genuinely busier colleague', async () => {
    await setRoster(['Loaded', 'Worked', 'Wrong']);

    // 'Loaded' really did two separate massages, both finished.
    const first = windowAround(-240, -180);
    const second = windowAround(-170, -110);
    await insertTransaction({
      transactionId: 'TX-LOADED-1', masseuseName: 'Loaded', startIso: first.startIso, endIso: first.endIso
    });
    await insertTransaction({
      transactionId: 'TX-LOADED-2', masseuseName: 'Loaded', startIso: second.startIso, endIso: second.endIso
    });

    // 'Worked' did ONE massage that was edited twice: three rows, one live.
    const chain = windowAround(-120, -60);
    await insertTransaction({
      transactionId: 'TX-CHAIN-A', masseuseName: 'Worked', startIso: chain.startIso, endIso: chain.endIso
    });
    await database.run(
      'UPDATE transactions SET status = ? WHERE transaction_id = ?',
      ['EDITED (Corrected by TX-CHAIN-B)', 'TX-CHAIN-A']
    );
    await insertTransaction({
      transactionId: 'TX-CHAIN-B',
      masseuseName: 'Worked',
      status: 'CORRECTED',
      startIso: chain.startIso,
      endIso: chain.endIso,
      correctedFromId: 'TX-CHAIN-A'
    });
    await database.run(
      'UPDATE transactions SET status = ? WHERE transaction_id = ?',
      ['EDITED (Corrected by TX-CHAIN-C)', 'TX-CHAIN-B']
    );
    await insertTransaction({
      transactionId: 'TX-CHAIN-C',
      masseuseName: 'Worked',
      status: 'CORRECTED',
      startIso: chain.startIso,
      endIso: chain.endIso,
      correctedFromId: 'TX-CHAIN-B'
    });

    await insertCorrectionTarget({ transactionId: 'TX-TO-CORRECT-5', masseuseName: 'Wrong' });

    const eligible = await pick('TX-TO-CORRECT-5');
    const worked = eligible.find((row) => row.masseuse_name === 'Worked');
    const loaded = eligible.find((row) => row.masseuse_name === 'Loaded');

    expect(worked.today_massages).toBeLessThan(loaded.today_massages);
    expect(eligible.map((row) => row.masseuse_name).indexOf('Worked'))
      .toBeLessThan(eligible.map((row) => row.masseuse_name).indexOf('Loaded'));
  });

  // ---------------------------------------------------------------------------
  // Assertion 6 — GUARD, expected green before and after. A cancelled row is an
  // audit record: it must make nobody busy and count for nothing.
  // ---------------------------------------------------------------------------
  test('GUARD: a cancelled row makes its masseuse neither busy nor loaded', async () => {
    await setRoster(['Free', 'Worked', 'Wrong']);
    const live = windowAround(-10, 50);
    await insertTransaction({
      transactionId: 'TX-CANCELLED',
      masseuseName: 'Free',
      status: 'CANCELLED (Customer left before service)',
      startIso: live.startIso,
      endIso: live.endIso
    });
    await insertCorrectionTarget({ transactionId: 'TX-TO-CORRECT-6', masseuseName: 'Wrong' });

    const eligible = await pick('TX-TO-CORRECT-6');
    const free = eligible.find((row) => row.masseuse_name === 'Free');

    expect(free).toBeDefined();
    expect(free.today_massages).toBe(0);
    expect(eligible[0].masseuse_name).toBe('Free');
  });

  // ---------------------------------------------------------------------------
  // Assertion 7 — objective 2, which no behavioural assertion can reach.
  // ---------------------------------------------------------------------------
  test('the picker imports the shared predicate and keeps no inline live-row filter', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'backend', 'routes', 'transactions.js'),
      'utf8'
    );
    expect(source).toContain("require('../services/transaction-status-sql')");

    const start = source.indexOf('async function getCorrectionEligibleStaff(');
    expect(start).toBeGreaterThan(-1);
    const next = source.indexOf('\nasync function ', start + 1);
    const picker = source.slice(start, next === -1 ? source.length : next);

    expect(picker.match(/countsAsLiveWork\(/g)).toHaveLength(2);
    expect(picker).not.toMatch(/status = 'ACTIVE'/);
    expect(picker).not.toMatch(/status != 'CANCELLED'/);
    expect(picker).not.toMatch(/NOT LIKE/);
  });
});
