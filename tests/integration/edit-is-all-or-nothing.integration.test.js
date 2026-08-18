/* eslint-env jest */

/**
 * ETSC-CORE-003 — an edit is all-or-nothing.
 *
 * An edit does not update a transaction in place. It reverses the original
 * masseuse's fee (backend/routes/transactions.js:681-684), relabels the original
 * `EDITED (Corrected by <id>)` (:692-695) and inserts a replacement carrying
 * `CORRECTED` (:714). Those three writes are one unit of work: a partial write
 * leaves either two live rows in one chain or none at all, and the money wrong
 * either way.
 *
 * The handler already wraps them in a single database transaction —
 * `BEGIN IMMEDIATE` at :659, `COMMIT` at :755, `ROLLBACK` at :772. **So every
 * assertion in this file is a GUARD on shipped behaviour, not a symptom
 * reproduction.** It is recorded that way in the ledger. The guards were proven
 * capable of failing by temporarily removing the transaction wrapper and
 * observing them fail; see the step's Completion Notes.
 *
 * HOW THE FAILURE IS FORCED, AND WHY IT IS FORCED THERE. A SQLite trigger,
 * created by this fixture and dropped afterwards, aborts any INSERT into
 * `transactions` carrying a marker `customer_contact`. That fires at STEP 7 of
 * the handler — AFTER the fee reversal and AFTER the relabel, both of which are
 * already written inside the open transaction. `RAISE(ABORT)` reverts only the
 * offending statement and leaves the enclosing transaction open, so what the
 * assertions below observe is the handler's own `ROLLBACK` undoing the two
 * earlier writes, not SQLite undoing the insert.
 *
 * WHY THE FEE ASSERTION IS THE LOAD-BEARING ONE. "The original is still `ACTIVE`
 * and no replacement exists" is also true of a handler that never ran at all, or
 * one reordered to insert before relabelling. The original masseuse's
 * `total_fees_earned` is written BEFORE both, so finding it restored is the one
 * observation that can only be produced by a rollback. The source-order test
 * closes the reordering hole from the other side.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-edit-atomicity-'));
process.env.DB_PATH = path.join(testDirectory, 'edit-atomicity.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDay } = require('../../backend/utils/business-day');
const { countsAsLiveWork } = require('../../backend/services/transaction-status-sql');

/** The correction path derives its clock from `new Date()` and honours no `?at=` pin. */
const BUSINESS_DAY = getBusinessDay(new Date());
const UTC_TODAY = new Date().toISOString().split('T')[0];
const MINUTE = 60 * 1000;

/** The marker the fixture's trigger aborts on. Reaches the INSERT as `customer_contact`. */
const FORCE_FAILURE = 'FORCE-FAIL-ETSC-CORE-003';

describe('ETSC-CORE-003 — the relabel and the insert are one unit of work', () => {
  function iso(offsetMinutes) {
    return new Date(Date.now() + offsetMinutes * MINUTE).toISOString();
  }

  async function feesEarned(name) {
    const row = await database.get('SELECT total_fees_earned FROM staff WHERE name = ?', [name]);
    return row.total_fees_earned;
  }

  async function transactionCount() {
    const row = await database.get('SELECT COUNT(*) AS count FROM transactions');
    return row.count;
  }

  /** Record a customer through the real handler, exactly as reception does. */
  function record(body) {
    return request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        service_type: 'Thai Massage',
        location: 'In-Shop',
        payment_method: 'Cash',
        start_time: '11:00 AM',
        end_time: '12:00 PM',
        ...body
      });
  }

  beforeAll(async () => {
    await database.connect();

    await database.run(
      `INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
       VALUES ('Thai Massage', 60, 'In-Shop', 399, 150, 1),
              ('Thai Massage', 120, 'In-Shop', 798, 300, 1)`
    );
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'Alice', 1, 0, 0), (2, 'Bob', 1, 0, 0)`
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'Alice', 1, NULL), (?, 2, 'Bob', 2, NULL)`,
      [BUSINESS_DAY, BUSINESS_DAY]
    );

    // Test-side fault injection. Aborts the INSERT at STEP 7, after the fee
    // reversal and the relabel have already been written inside the open
    // transaction. Dropped in afterAll; no production code is involved.
    await database.run(
      `CREATE TRIGGER etsc_core_003_force_insert_failure
       BEFORE INSERT ON transactions
       WHEN NEW.customer_contact = '${FORCE_FAILURE}'
       BEGIN SELECT RAISE(ABORT, 'ETSC-CORE-003 forced failure'); END`
    );
  });

  afterAll(async () => {
    await database.run('DROP TRIGGER IF EXISTS etsc_core_003_force_insert_failure');
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Objective 1 — the relabel and the insert either both happen or neither does.
  // The ledger's first Validation clause.
  // ---------------------------------------------------------------------------
  test('GUARD: a forced failure part-way through an edit leaves the original live, no replacement row, and the fee reversal undone', async () => {
    const created = await record({
      masseuse_name: 'Alice',
      duration: 60,
      start_datetime: iso(-120),
      end_datetime: iso(-60)
    });
    expect(created.status).toBe(201);
    const originalId = created.body.transaction_id;

    // The fee accrued on the way in. This is the number the rollback must restore.
    expect(await feesEarned('Alice')).toBe(150);
    const rowsBefore = await transactionCount();

    const failed = await record({
      corrected_transaction_id: originalId,
      masseuse_name: 'Bob',
      duration: 120,
      customer_contact: FORCE_FAILURE,
      start_datetime: iso(-120),
      end_datetime: iso(-60)
    });

    expect(failed.status).toBe(500);

    // The original is untouched — still live, still the row every reader counts.
    expect(await database.get(
      'SELECT status, corrected_from_id FROM transactions WHERE transaction_id = ?',
      [originalId]
    )).toEqual({ status: 'ACTIVE', corrected_from_id: null });

    // No replacement was left behind, and no row of any kind was added.
    expect(await database.get(
      'SELECT COUNT(*) AS count FROM transactions WHERE corrected_from_id = ?',
      [originalId]
    )).toEqual({ count: 0 });
    expect(await transactionCount()).toBe(rowsBefore);

    // THE LOAD-BEARING ASSERTION. The fee reversal at :681-684 runs BEFORE the
    // relabel and BEFORE the insert. Alice keeping her 150 is the only
    // observation here that a handler which never started, or one that inserted
    // before relabelling, could not also produce.
    expect(await feesEarned('Alice')).toBe(150);

    // The replacement masseuse was never paid for a massage that did not happen.
    expect(await feesEarned('Bob')).toBe(0);
  });

  test('GUARD: the original stays countable by the live-work predicate after the failed edit', async () => {
    const rows = await database.all(
      `SELECT transaction_id FROM transactions
       WHERE masseuse_name = 'Alice' AND business_day = ? AND ${countsAsLiveWork('')}`,
      [BUSINESS_DAY]
    );
    expect(rows).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Objective 2 — after any number of successive edits, exactly one row counts
  // as live work and live money. Driven through the REAL edit endpoint twice,
  // producing the three-row shape the operator reported.
  // ---------------------------------------------------------------------------
  describe('two successive edits of one customer', () => {
    let first;
    let second;
    let third;

    beforeAll(async () => {
      // Clear the atomicity fixture so the money and workload readers below see
      // this chain and nothing else.
      await database.run('DELETE FROM transactions');
      await database.run('UPDATE staff SET total_fees_earned = 0');

      const created = await record({
        masseuse_name: 'Alice',
        duration: 60,
        start_datetime: iso(-180),
        end_datetime: iso(-120)
      });
      expect(created.status).toBe(201);
      first = created.body.transaction_id;

      const editOne = await record({
        corrected_transaction_id: first,
        masseuse_name: 'Alice',
        duration: 120,
        start_datetime: iso(-180),
        end_datetime: iso(-60)
      });
      expect(editOne.status).toBe(201);
      second = editOne.body.transaction_id;

      const editTwo = await record({
        corrected_transaction_id: second,
        masseuse_name: 'Alice',
        duration: 60,
        start_datetime: iso(-180),
        end_datetime: iso(-120)
      });
      expect(editTwo.status).toBe(201);
      third = editTwo.body.transaction_id;
    });

    test('GUARD: three rows exist for the one customer and every superseded row is linked to its successor', async () => {
      const rows = await database.all(
        "SELECT transaction_id, status, corrected_from_id FROM transactions ORDER BY id ASC"
      );

      expect(rows).toHaveLength(3);
      expect(rows[0]).toEqual({
        transaction_id: first, status: `EDITED (Corrected by ${second})`, corrected_from_id: null
      });
      expect(rows[1]).toEqual({
        transaction_id: second, status: `EDITED (Corrected by ${third})`, corrected_from_id: first
      });
      // The governed contract: the live replacement carries CORRECTED plus the
      // link — transaction-correction-operational-reversal.md FR-003 and §6.
      expect(rows[2]).toEqual({
        transaction_id: third, status: 'CORRECTED', corrected_from_id: second
      });
    });

    test('GUARD: exactly one row in the chain counts as live work', async () => {
      const live = await database.all(
        `SELECT transaction_id FROM transactions WHERE ${countsAsLiveWork('')}`
      );
      expect(live).toEqual([{ transaction_id: third }]);
    });

    // A raw row count proves nothing about the readers. These two put the
    // objective's own words — "counts as live work and live money" — through the
    // endpoints that decide the masseuse's queue position and the day's takings.
    test('GUARD: her workload after two edits is one massage, not three', async () => {
      const response = await request(app).get('/api/staff/roster').set('x-pwtest', '1');

      expect(response.status).toBe(200);
      const rows = Array.isArray(response.body)
        ? response.body
        : (response.body.staff || response.body.roster);
      const alice = rows.find((row) => row.masseuse_name === 'Alice');
      expect(alice.today_massages).toBe(1);
    });

    test('GUARD: the day counts the money once, at the last edited amount', async () => {
      const response = await request(app)
        .get('/api/reports/summary/today')
        .set('x-pwtest', '1');

      expect(response.status).toBe(200);
      // The chain is 399 superseded, 798 superseded, 399 live. Counting any
      // superseded row would give 1197 or 1596 and a count above one.
      expect(response.body.total_revenue).toBe(399);
      expect(response.body.transaction_count).toBe(1);
      expect(response.body.base_fee_total).toBe(150);
    });

    test('GUARD: the transactions today-summary endpoint agrees, so neither money reader counts a superseded row', async () => {
      const response = await request(app)
        .get('/api/transactions/summary/today')
        .set('x-pwtest', '1');

      expect(response.status).toBe(200);
      expect(response.body.total_revenue).toBe(399);
      expect(response.body.transaction_count).toBe(1);
    });

    test('GUARD: the audit trail survives — both superseded rows are still listed', async () => {
      const response = await request(app)
        .get(`/api/transactions/recent?date=${UTC_TODAY}`)
        .set('x-pwtest', '1');

      expect(response.status).toBe(200);
      const rows = Array.isArray(response.body) ? response.body : response.body.transactions;
      const ids = rows.map((row) => row.transaction_id);
      expect(ids).toEqual(expect.arrayContaining([first, second, third]));
    });
  });

  // ---------------------------------------------------------------------------
  // The reordering hole the behavioural tests cannot reach on their own: a
  // handler that inserted BEFORE relabelling would leave the original `ACTIVE`
  // and no replacement after a failed insert, passing the first test above
  // without being atomic at all. This pins the order in the source.
  // ---------------------------------------------------------------------------
  test('GUARD: the relabel and the insert both sit between BEGIN IMMEDIATE and COMMIT, in that order', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'backend', 'routes', 'transactions.js'),
      'utf8'
    );

    const start = source.indexOf("router.post('/',");
    expect(start).toBeGreaterThan(-1);
    const handler = source.slice(start, source.indexOf("router.post('/fix-edited-status'", start));

    const begin = handler.indexOf("database.run('BEGIN IMMEDIATE TRANSACTION')");
    const feeReversal = handler.indexOf('total_fees_earned = total_fees_earned - ?');
    const relabel = handler.indexOf('EDITED (Corrected by ${transactionId})');
    const insert = handler.indexOf('INSERT INTO transactions');
    const commit = handler.indexOf("database.run('COMMIT')");
    const rollback = handler.indexOf("database.run('ROLLBACK')");

    for (const marker of [begin, feeReversal, relabel, insert, commit, rollback]) {
      expect(marker).toBeGreaterThan(-1);
    }

    expect(begin).toBeLessThan(feeReversal);
    expect(feeReversal).toBeLessThan(relabel);
    expect(relabel).toBeLessThan(insert);
    expect(insert).toBeLessThan(commit);
    expect(commit).toBeLessThan(rollback);
  });
});
