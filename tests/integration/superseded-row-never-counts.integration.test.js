/* eslint-env jest */

/**
 * ETSC-QUEUE-001 — a superseded row never counts, however many edits.
 *
 * This step is the GUARD on the fix, not the fix. `ETSC-CORE-001` widened the
 * busy and workload readers to admit a correction replacement
 * (`countsAsLiveWork()` → `status IN ('ACTIVE', 'CORRECTED')`). That widening is
 * one careless edit away from also admitting the superseded `EDITED (…)` row it
 * replaced — a denylist such as "anything not cancelled" would do it — and the
 * result is WORSE than the bug being fixed: every edit would double the
 * masseuse's workload and push her further down the queue than before.
 *
 * So every assertion here is a declared GUARD on shipped behaviour, not a
 * symptom reproduction. They were proven capable of failing by mutating the
 * shared predicate into a denylist; see the step's Completion Notes.
 *
 * WHAT THIS ADDS OVER `edited-transaction-live-state.integration.test.js`, which
 * already covers the same readers. That spec's fixtures cannot see a superseded
 * row being wrongly admitted, in two ways this one closes:
 *
 *   1. Its edit LENGTHENS the massage — one hour to two. The busy window is the
 *      MAX end across live rows (backend/routes/staff.js:208-213), so admitting
 *      the shorter superseded row alongside its replacement changes nothing
 *      observable. Here the edit SHORTENS the massage, so a wrongly admitted
 *      superseded row moves `busy_until_iso` by a full hour.
 *   2. In that spec every superseded row sits beside a live replacement for the
 *      SAME masseuse, so excluding it is invisible in busy state. Here a
 *      masseuse holds a superseded row ALONE — reception corrected the wrong
 *      masseuse, so the replacement went to a colleague. If the superseded row
 *      were admitted she would read as busy mid-shift on a massage she is not
 *      giving.
 *
 * Fixtures are built per test rather than shared, because `walk_in_priority` is
 * a single roster-wide flag: one masseuse per roster carries it, so the
 * next-in-line assertions need rosters of their own.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-superseded-guard-'));
process.env.DB_PATH = path.join(testDirectory, 'superseded-guard.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDayParts } = require('../../backend/utils/business-day');

/** 11:30 Bangkok on a fixed day. `/staff/current-status` honours this pin. */
const AT = '2030-01-01T11:30:00+07:00';
const AT_QUERY = '2030-01-01T11:30:00%2B07:00';

/** A Bangkok wall-clock time on the fixture day, as the ISO string the rows carry. */
function clock(hhmm) {
  return `2030-01-01T${hhmm}:00+07:00`;
}

/** What the endpoint reports a busy window as: UTC. */
function asReported(hhmm) {
  return new Date(clock(hhmm)).toISOString();
}

describe('ETSC-QUEUE-001 — superseded and cancelled rows count for nothing', () => {
  let businessDay;

  const EVERYONE = ['Shorter', 'Handed', 'Taker', 'Twice', 'Loaded', 'Voided'];

  async function insertTransaction({
    transactionId,
    masseuseName,
    status = 'ACTIVE',
    startHHMM,
    endHHMM,
    duration,
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
        transactionId, clock(startHHMM), businessDay, masseuseName, 'Thai Massage',
        'In-Shop', duration, paymentAmount, 'Cash', masseuseFee,
        startHHMM, endHHMM, 'ETSC-QUEUE-001 fixture', status, businessDay,
        correctedFromId, clock(startHHMM), clock(endHHMM)
      ]
    );
  }

  async function relabelSuperseded(transactionId, replacementId) {
    await database.run(
      'UPDATE transactions SET status = ? WHERE transaction_id = ?',
      [`EDITED (Corrected by ${replacementId})`, transactionId]
    );
  }

  /** Put exactly these masseuses on the roster, in this order. */
  async function setRoster(names) {
    for (let index = 0; index < names.length; index += 1) {
      await database.run(
        `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
         VALUES (?, ?, ?, ?, NULL)`,
        [businessDay, EVERYONE.indexOf(names[index]) + 1, names[index], index + 1]
      );
    }
  }

  async function currentStatus() {
    const response = await request(app)
      .get(`/api/staff/current-status?at=${AT_QUERY}`)
      .set('x-pwtest', '1');
    expect(response.status).toBe(200);
    return response.body.staff;
  }

  beforeAll(async () => {
    await database.connect();
    const parts = getBusinessDayParts(new Date(AT));
    businessDay = parts.currentBusinessDay;

    await database.run(
      "INSERT OR IGNORE INTO business_days (business_day, status) VALUES (?, 'open')",
      [businessDay]
    );
    for (let index = 0; index < EVERYONE.length; index += 1) {
      await database.run(
        `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
         VALUES (?, ?, 1, 0, 0)`,
        [index + 1, EVERYONE[index]]
      );
    }
  });

  beforeEach(async () => {
    await database.run('DELETE FROM transactions');
    await database.run('DELETE FROM today_staff');
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  // ---------------------------------------------------------------------------
  // Objective 3 — a masseuse with one live correction replacement reads as busy
  // for ITS duration, not the superseded row's.
  //
  // The discriminating fixture: a SHORTENING edit. 10:00-13:00 corrected to
  // 10:00-12:00. Because the busy window is the MAX end across live rows
  // (backend/routes/staff.js:208-213), a wrongly admitted superseded row moves
  // the answer by an hour and nothing else in this lane would notice.
  // ---------------------------------------------------------------------------
  test('GUARD: a shortening edit moves the busy window in, so the superseded row cannot be supplying it', async () => {
    await setRoster(['Shorter']);
    await insertTransaction({
      transactionId: 'TX-SHORTER-ORIGINAL',
      masseuseName: 'Shorter',
      startHHMM: '10:00',
      endHHMM: '13:00',
      duration: 180
    });
    await relabelSuperseded('TX-SHORTER-ORIGINAL', 'TX-SHORTER-REPLACEMENT');
    await insertTransaction({
      transactionId: 'TX-SHORTER-REPLACEMENT',
      masseuseName: 'Shorter',
      status: 'CORRECTED',
      startHHMM: '10:00',
      endHHMM: '12:00',
      duration: 120,
      correctedFromId: 'TX-SHORTER-ORIGINAL'
    });

    const shorter = (await currentStatus()).find((row) => row.masseuse_name === 'Shorter');

    expect(shorter.current_state).toBe('busy');
    expect(shorter.busy_until_iso).toBe(asReported('12:00'));
    // The superseded row's own end. Reading it here is the double-count failure
    // mode showing up as a masseuse held off the queue for an extra hour.
    expect(shorter.busy_until_iso).not.toBe(asReported('13:00'));
    expect(shorter.today_massages).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Objective 1, busy state — a superseded row ALONE. Reception corrected the
  // wrong masseuse, so the replacement went to a colleague and 'Handed' keeps
  // nothing but the superseded row, whose window covers the current time.
  // ---------------------------------------------------------------------------
  test('GUARD: a masseuse holding only a superseded row is available, while the colleague who took the work is busy', async () => {
    await setRoster(['Taker', 'Handed']);
    await insertTransaction({
      transactionId: 'TX-HANDED-ORIGINAL',
      masseuseName: 'Handed',
      startHHMM: '11:00',
      endHHMM: '12:30',
      duration: 90
    });
    await relabelSuperseded('TX-HANDED-ORIGINAL', 'TX-HANDED-REPLACEMENT');
    await insertTransaction({
      transactionId: 'TX-HANDED-REPLACEMENT',
      masseuseName: 'Taker',
      status: 'CORRECTED',
      startHHMM: '11:00',
      endHHMM: '12:30',
      duration: 90,
      correctedFromId: 'TX-HANDED-ORIGINAL'
    });

    const staff = await currentStatus();
    const handed = staff.find((row) => row.masseuse_name === 'Handed');
    const taker = staff.find((row) => row.masseuse_name === 'Taker');

    // She is not giving this massage. If the superseded row were admitted she
    // would read as busy until 12:30 on work she is not doing.
    expect(handed.current_state).toBe('available');
    expect(handed.busy_until_iso).toBeNull();
    expect(handed.today_massages).toBe(0);

    // ...and the exclusion is not blanket: the colleague who took it is busy.
    expect(taker.current_state).toBe('busy');
    expect(taker.busy_until_iso).toBe(asReported('12:30'));
    expect(taker.today_massages).toBe(1);

    // The free masseuse is the one holding only the superseded row.
    expect(handed.walk_in_priority).toBe(true);
    expect(taker.walk_in_priority).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Objective 1, cancelled rows.
  // ---------------------------------------------------------------------------
  test('GUARD: a cancelled row makes nobody busy and counts for nothing', async () => {
    await setRoster(['Voided']);
    await insertTransaction({
      transactionId: 'TX-VOIDED',
      masseuseName: 'Voided',
      startHHMM: '11:00',
      endHHMM: '12:30',
      duration: 90,
      status: 'CANCELLED (Customer left before service)'
    });

    const voided = (await currentStatus()).find((row) => row.masseuse_name === 'Voided');

    expect(voided.current_state).toBe('available');
    expect(voided.busy_until_iso).toBeNull();
    expect(voided.today_massages).toBe(0);
  });

  test('GUARD: a cancelled correction replacement counts for nothing either, so voiding an edit really releases her', async () => {
    await setRoster(['Voided']);
    await insertTransaction({
      transactionId: 'TX-VOIDED-ORIGINAL',
      masseuseName: 'Voided',
      startHHMM: '11:00',
      endHHMM: '12:30',
      duration: 90
    });
    await relabelSuperseded('TX-VOIDED-ORIGINAL', 'TX-VOIDED-REPLACEMENT');
    await insertTransaction({
      transactionId: 'TX-VOIDED-REPLACEMENT',
      masseuseName: 'Voided',
      status: 'CANCELLED (Customer left before service)',
      startHHMM: '11:00',
      endHHMM: '12:30',
      duration: 90,
      correctedFromId: 'TX-VOIDED-ORIGINAL'
    });

    const voided = (await currentStatus()).find((row) => row.masseuse_name === 'Voided');

    // Neither row of the chain is live, so she is free — the superseded row must
    // not resurrect the massage the void removed.
    expect(voided.current_state).toBe('available');
    expect(voided.today_massages).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Objective 2 — two successive edits of one customer. Three rows, workload
  // one. This is the shape the operator reported.
  // ---------------------------------------------------------------------------
  describe('two successive edits of the same customer', () => {
    /** 08:00-09:00, edited twice, all three rows in the past. */
    async function insertFinishedChain(masseuseName) {
      await insertTransaction({
        transactionId: 'TX-CHAIN-A', masseuseName, startHHMM: '08:00', endHHMM: '09:00', duration: 60
      });
      await relabelSuperseded('TX-CHAIN-A', 'TX-CHAIN-B');
      await insertTransaction({
        transactionId: 'TX-CHAIN-B',
        masseuseName,
        status: 'CORRECTED',
        startHHMM: '08:00',
        endHHMM: '09:00',
        duration: 60,
        correctedFromId: 'TX-CHAIN-A'
      });
      await relabelSuperseded('TX-CHAIN-B', 'TX-CHAIN-C');
      await insertTransaction({
        transactionId: 'TX-CHAIN-C',
        masseuseName,
        status: 'CORRECTED',
        startHHMM: '08:00',
        endHHMM: '09:00',
        duration: 60,
        correctedFromId: 'TX-CHAIN-B'
      });
    }

    test('GUARD: her workload count is one, not three', async () => {
      await setRoster(['Twice']);
      await insertFinishedChain('Twice');

      const twice = (await currentStatus()).find((row) => row.masseuse_name === 'Twice');

      expect(twice.today_massages).toBe(1);
      // The chain is over, so it must not hold her busy either.
      expect(twice.current_state).toBe('available');
    });

    test('GUARD: she still outranks a colleague who really did two massages, which is what the double-count would take from her', async () => {
      // 'Loaded' holds the BETTER queue position, so only workload can move the
      // next-in-line slot. If the two superseded rows counted, 'Twice' would
      // score 3 against 'Loaded''s 2 and lose the customer she is owed.
      await setRoster(['Loaded', 'Twice']);
      await insertFinishedChain('Twice');
      await insertTransaction({
        transactionId: 'TX-LOADED-1', masseuseName: 'Loaded', startHHMM: '07:00', endHHMM: '08:00', duration: 60
      });
      await insertTransaction({
        transactionId: 'TX-LOADED-2', masseuseName: 'Loaded', startHHMM: '08:00', endHHMM: '09:00', duration: 60
      });

      const staff = await currentStatus();
      const twice = staff.find((row) => row.masseuse_name === 'Twice');
      const loaded = staff.find((row) => row.masseuse_name === 'Loaded');

      expect(twice.today_massages).toBe(1);
      expect(loaded.today_massages).toBe(2);
      expect(twice.position).toBeGreaterThan(loaded.position);
      expect(twice.walk_in_priority).toBe(true);
      expect(loaded.walk_in_priority).toBe(false);
    });

    test('GUARD: mid-chain, she is busy for the last replacement window only', async () => {
      // Same three-row shape, still running, and each edit SHORTENS the massage.
      // Admitting either superseded row would push `busy_until_iso` out.
      await setRoster(['Twice']);
      await insertTransaction({
        transactionId: 'TX-LIVE-A', masseuseName: 'Twice', startHHMM: '10:00', endHHMM: '14:00', duration: 240
      });
      await relabelSuperseded('TX-LIVE-A', 'TX-LIVE-B');
      await insertTransaction({
        transactionId: 'TX-LIVE-B',
        masseuseName: 'Twice',
        status: 'CORRECTED',
        startHHMM: '10:00',
        endHHMM: '13:00',
        duration: 180,
        correctedFromId: 'TX-LIVE-A'
      });
      await relabelSuperseded('TX-LIVE-B', 'TX-LIVE-C');
      await insertTransaction({
        transactionId: 'TX-LIVE-C',
        masseuseName: 'Twice',
        status: 'CORRECTED',
        startHHMM: '10:00',
        endHHMM: '12:00',
        duration: 120,
        correctedFromId: 'TX-LIVE-B'
      });

      const twice = (await currentStatus()).find((row) => row.masseuse_name === 'Twice');

      expect(twice.current_state).toBe('busy');
      expect(twice.busy_until_iso).toBe(asReported('12:00'));
      expect(twice.busy_until_iso).not.toBe(asReported('13:00'));
      expect(twice.busy_until_iso).not.toBe(asReported('14:00'));
      expect(twice.today_massages).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // The shape of the predicate itself. A behavioural assertion can only reject
  // the denylists someone happens to write; this rejects the class.
  // ---------------------------------------------------------------------------
  test('GUARD: the shared predicate names what it admits and never what it excludes', () => {
    const { countsAsLiveWork } = require('../../backend/services/transaction-status-sql');

    expect(countsAsLiveWork('t')).toBe("t.status IN ('ACTIVE', 'CORRECTED')");
    expect(countsAsLiveWork('t')).not.toMatch(/NOT LIKE|NOT IN|!=|<>/);
    // `EDITED (Corrected by …)` and `CANCELLED (…)` are outside the allowlist by
    // construction, and so is any status value added to the vocabulary later.
    expect(countsAsLiveWork('t')).not.toMatch(/EDITED|CANCELLED/);
  });
});
