/* eslint-env jest */

/**
 * ETSC-MONEY-001 — the money is right and counted once.
 *
 * This is the step that closes the theft window `ETSC-CORE-002` described: a day
 * containing an edit must never again report less than it took. It proves three
 * things the earlier money step did not.
 *
 *   1. Today's summary and the date-range financial report AGREE. Before the
 *      epic they could not: today's summary counted `ACTIVE` only
 *      (backend/routes/reports.js:205) while the date-range report has always
 *      counted `ACTIVE` and `CORRECTED` (:239), so every edited transaction was
 *      money the manager saw on one screen and not the other.
 *   2. An edited transaction is counted ONCE. The superseded row adds nothing,
 *      to either report.
 *   3. The masseuse's payday balance equals the edited fee, with the original
 *      reversed exactly once.
 *
 * WHY THIS SPEC DRIVES THE REAL EDIT ENDPOINT. The reader-isolating specs in
 * this lane hand-build the two-row shape an edit produces, which is right for
 * proving a reader. It is wrong here: `staff.total_fees_earned` is written by
 * the edit path itself (backend/routes/transactions.js:681-684 reverses the
 * original, :719-725 accrues the replacement), so a hand-built fixture would
 * assert the fixture's own arithmetic and nothing else. Every chain below is
 * created by real `POST /api/transactions` calls.
 *
 * THE FIXTURE CONTAINS NO PART-PAID ADD-ON, DELIBERATELY. Today's summary
 * applies the settled-money filter (`isSettled()` at reports.js:205) and the
 * date-range report does not (:239 has no such term), so the two endpoints
 * disagree by the value of any pending money for reasons that have nothing to do
 * with editing. That is a separate pre-existing defect, recorded in the steps
 * file's Discoveries and deliberately NOT fixed here. Assertion 1 below would be
 * measuring it rather than the edit if the fixture carried one, so a guard
 * asserts every row is settled.
 *
 * Every assertion is a declared GUARD on shipped behaviour, not a symptom
 * reproduction — `ETSC-CORE-002` already fixed the readers and the fee logic was
 * always correct. They were proven capable of failing by mutation; see the
 * step's Completion Notes.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-money-agrees-'));
process.env.DB_PATH = path.join(testDirectory, 'money-agrees.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDay } = require('../../backend/utils/business-day');

/** Every endpoint here derives its day from UTC and honours no `?at=` pin. */
const UTC_TODAY = new Date().toISOString().split('T')[0];
const BUSINESS_DAY = getBusinessDay(new Date());
const MINUTE = 60 * 1000;

/** The service catalogue this fixture books against. */
const SHORT = { duration: 60, price: 399, fee: 150 };
const LONG = { duration: 120, price: 798, fee: 300 };

describe('ETSC-MONEY-001 — an edited day is counted once, and both reports agree', () => {
  function iso(offsetMinutes) {
    return new Date(Date.now() + offsetMinutes * MINUTE).toISOString();
  }

  /** Record or correct a customer through the real handler, as reception does. */
  async function post(body) {
    const response = await request(app)
      .post('/api/transactions')
      .set('x-pwtest', '1')
      .send({
        service_type: 'Thai Massage',
        location: 'In-Shop',
        payment_method: 'Cash',
        start_time: '11:00 AM',
        end_time: '12:00 PM',
        start_datetime: iso(-180),
        end_datetime: iso(-120),
        ...body
      });
    expect(response.status).toBe(201);
    return response.body.transaction_id;
  }

  /** GET /api/reports/summary/today — the screen reception and the manager watch. */
  async function todaySummary() {
    const response = await request(app)
      .get('/api/reports/summary/today')
      .set('x-pwtest', '1');
    expect(response.status).toBe(200);
    return response.body;
  }

  /** GET /api/reports/financial — the date-range report, narrowed to today. */
  async function dateRangeReport() {
    const response = await request(app)
      .get(`/api/reports/financial?from_date=${UTC_TODAY}&to_date=${UTC_TODAY}`)
      .set('x-pwtest', '1');
    expect(response.status).toBe(200);
    return response.body.summary;
  }

  async function feesEarned(name) {
    const row = await database.get('SELECT total_fees_earned FROM staff WHERE name = ?', [name]);
    return row.total_fees_earned;
  }

  beforeAll(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee, active)
       VALUES ('Thai Massage', ?, 'In-Shop', ?, ?, 1),
              ('Thai Massage', ?, 'In-Shop', ?, ?, 1)`,
      [SHORT.duration, SHORT.price, SHORT.fee, LONG.duration, LONG.price, LONG.fee]
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
  });

  beforeEach(async () => {
    await database.run('DELETE FROM transactions');
    await database.run('UPDATE staff SET total_fees_earned = 0');
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Objective 1 — the two reports agree on a day containing an edit. AC-005.
  //
  // "They agree" is on its own satisfied by two reports that are equally wrong,
  // and by an empty day. So the expected value is named, the superseded value is
  // named as forbidden, and the chain is proved to exist.
  // ---------------------------------------------------------------------------
  test('GUARD: today\'s summary and the date-range report both report the edited 798 on a day containing an edit', async () => {
    const original = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    await post({
      corrected_transaction_id: original,
      masseuse_name: 'Alice',
      duration: LONG.duration
    });

    // The day really does contain an edit: a superseded row and its replacement.
    const chain = await database.all(
      'SELECT status, payment_amount FROM transactions ORDER BY id ASC'
    );
    expect(chain).toHaveLength(2);
    expect(chain[0].status).toMatch(/^EDITED \(Corrected by /);
    expect(chain[0].payment_amount).toBe(SHORT.price);
    expect(chain[1].status).toBe('CORRECTED');
    expect(chain[1].payment_amount).toBe(LONG.price);

    const today = await todaySummary();
    const range = await dateRangeReport();

    // They agree...
    expect(today.total_revenue).toBe(range.total_revenue);
    expect(today.transaction_count).toBe(range.total_transactions);
    expect(today.base_fee_total).toBe(range.base_masseuse_fees);

    // ...and they agree on the RIGHT number. 0 was the shipped defect, 399 is
    // the superseded row winning, 1197 is both rows counted.
    expect(today.total_revenue).toBe(LONG.price);
    expect(today.transaction_count).toBe(1);
    expect(today.base_fee_total).toBe(LONG.fee);
    expect(today.total_revenue).not.toBe(0);
    expect(today.total_revenue).not.toBe(SHORT.price);
    expect(today.total_revenue).not.toBe(SHORT.price + LONG.price);
  });

  test('GUARD: the fixture carries no part-paid add-on, so assertion 1 measures editing and not the settled-money divergence', async () => {
    await post({ masseuse_name: 'Alice', duration: SHORT.duration });

    // Today's summary applies isSettled() (reports.js:205) and the date-range
    // report does not (:239). With every row settled the two filters cannot
    // disagree, so any difference the assertion above finds is about editing.
    // The divergence itself is a recorded pre-existing defect, not fixed here.
    const unsettled = await database.all(
      "SELECT transaction_id FROM transactions WHERE payment_status != 'PAID'"
    );
    expect(unsettled).toEqual([]);
    const addOns = await database.all(
      'SELECT transaction_id FROM transactions WHERE add_on_kind IS NOT NULL'
    );
    expect(addOns).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Objective 2 — counted once, not twice. The money-side twin of the
  // double-count guard in ETSC-QUEUE-001.
  // ---------------------------------------------------------------------------
  test('GUARD: after two successive edits both reports count the money once, at the last amount', async () => {
    const first = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    const second = await post({
      corrected_transaction_id: first, masseuse_name: 'Alice', duration: LONG.duration
    });
    await post({
      corrected_transaction_id: second, masseuse_name: 'Alice', duration: SHORT.duration
    });

    expect(await database.get('SELECT COUNT(*) AS count FROM transactions')).toEqual({ count: 3 });

    const today = await todaySummary();
    const range = await dateRangeReport();

    // Three rows, one live, worth 399. Counting the chain would give 1596.
    expect(today.total_revenue).toBe(SHORT.price);
    expect(range.total_revenue).toBe(SHORT.price);
    expect(today.transaction_count).toBe(1);
    expect(range.total_transactions).toBe(1);
    expect(today.total_revenue).not.toBe(SHORT.price + LONG.price + SHORT.price);
  });

  test('GUARD: the payment-method breakdown counts the edited transaction once too', async () => {
    const original = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    await post({
      corrected_transaction_id: original, masseuse_name: 'Alice', duration: LONG.duration
    });

    const today = await todaySummary();
    const cash = today.payment_breakdown.find((row) => row.payment_method === 'Cash');

    expect(cash).toBeDefined();
    expect(cash.revenue).toBe(LONG.price);
    expect(cash.count).toBe(1);
    expect(today.payment_breakdown).toHaveLength(1);
  });

  // ---------------------------------------------------------------------------
  // Objective 3 — the payday balance. AC-007.
  //
  // `staff.total_fees_earned` is what the masseuse is paid. The edit path
  // reverses the original fee (transactions.js:681-684) and accrues the
  // replacement's (:719-725); this proves the reversal happens exactly once.
  // ---------------------------------------------------------------------------
  test('GUARD: after an edit her payday balance is the edited fee, not the sum of both and not zero', async () => {
    const original = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    expect(await feesEarned('Alice')).toBe(SHORT.fee);

    await post({
      corrected_transaction_id: original, masseuse_name: 'Alice', duration: LONG.duration
    });

    expect(await feesEarned('Alice')).toBe(LONG.fee);
    // Not reversed at all would be 450; reversed twice would be 150.
    expect(await feesEarned('Alice')).not.toBe(SHORT.fee + LONG.fee);
    expect(await feesEarned('Alice')).not.toBe(LONG.fee - SHORT.fee);
    expect(await feesEarned('Alice')).not.toBe(0);
  });

  test('GUARD: after two successive edits the balance is the last fee only, so each edit reverses exactly one predecessor', async () => {
    const first = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    const second = await post({
      corrected_transaction_id: first, masseuse_name: 'Alice', duration: LONG.duration
    });
    await post({
      corrected_transaction_id: second, masseuse_name: 'Alice', duration: SHORT.duration
    });

    expect(await feesEarned('Alice')).toBe(SHORT.fee);
  });

  test('GUARD: correcting the masseuse moves the whole fee, leaving the wrongly-credited one at zero', async () => {
    // The sharpest form of "reversed exactly once": reception recorded the wrong
    // masseuse. Alice must end the day owed nothing and Bob owed the full fee.
    const original = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    await post({
      corrected_transaction_id: original, masseuse_name: 'Bob', duration: LONG.duration
    });

    expect(await feesEarned('Alice')).toBe(0);
    expect(await feesEarned('Bob')).toBe(LONG.fee);
  });

  test('GUARD: the payday balances add up to the fees on the day\'s live rows, so the accrual and the ledger agree', async () => {
    const original = await post({ masseuse_name: 'Alice', duration: SHORT.duration });
    await post({
      corrected_transaction_id: original, masseuse_name: 'Bob', duration: LONG.duration
    });
    await post({ masseuse_name: 'Alice', duration: SHORT.duration });

    const accrued = await database.get(
      'SELECT COALESCE(SUM(total_fees_earned), 0) AS total FROM staff'
    );
    const onLiveRows = await database.get(
      `SELECT COALESCE(SUM(masseuse_fee), 0) AS total
       FROM transactions WHERE status IN ('ACTIVE', 'CORRECTED')`
    );

    expect(accrued.total).toBe(onLiveRows.total);
    expect(accrued.total).toBe(LONG.fee + SHORT.fee);

    // ...and the day's reported fee total is the same figure again.
    const today = await todaySummary();
    expect(today.base_fee_total).toBe(accrued.total);
  });
});
