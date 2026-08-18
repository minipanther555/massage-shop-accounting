/* eslint-env jest */

/**
 * ETSC-CORE-002a — the audit-repair tool keys on the link.
 *
 * `POST /api/transactions/fix-edited-status` (backend/routes/transactions.js:783-828)
 * is a fraud control. It finds rows that were superseded by an edit but were left
 * counting as live, and relabels them `EDITED (Corrected by <id>)`. The audit trail
 * exists because a receptionist stole money, so a repair tool that silently matches
 * nothing is worse than no tool at all.
 *
 * It keyed on STATUS in two places, and both were too narrow:
 *
 *   - the inner lookup at :800 found the superseding row only when that row's own
 *     status was exactly `CORRECTED`, so a chain edited twice was unrepairable;
 *   - the outer scan at :791 selected repair targets by `corrected_from_id IS NOT
 *     NULL AND status = 'ACTIVE'`, which misses BOTH a superseded row left
 *     `CORRECTED` and the original of a first edit, whose `corrected_from_id` is
 *     null by definition.
 *
 * The second one became dangerous because of THIS EPIC. Before ETSC-CORE-001 and
 * ETSC-CORE-002, a stray `CORRECTED` row counted for nothing anywhere and was inert.
 * `countsAsLiveWork()` now admits `CORRECTED` at fourteen sites, so a superseded row
 * left `CORRECTED` double-counts the masseuse's workload AND the day's money — the
 * exact double-count this epic guards against, in the one tool meant to catch it.
 *
 * The rule is the link, not the status: a row is superseded if and only if another
 * row points at it through `corrected_from_id`.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const request = require('supertest');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-audit-repair-'));
process.env.DB_PATH = path.join(testDirectory, 'audit-repair.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');
const { app } = require('../../backend/server');
const { getBusinessDay } = require('../../backend/utils/business-day');

const MINUTE = 60 * 1000;

describe('ETSC-CORE-002a — the audit-repair tool finds superseded rows by the link, not the status', () => {
  const businessDay = getBusinessDay(new Date());
  const today = new Date().toISOString().slice(0, 10);

  async function insertTransaction({
    transactionId,
    masseuseName = 'Nim',
    status = 'ACTIVE',
    correctedFromId = null,
    startOffset = -120,
    endOffset = -60
  }) {
    const startIso = new Date(Date.now() + startOffset * MINUTE).toISOString();
    const endIso = new Date(Date.now() + endOffset * MINUTE).toISOString();
    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        corrected_from_id, start_datetime, end_datetime
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, startIso, today, masseuseName, 'Thai Massage',
        'In-Shop', 60, 1000, 'Cash', 300,
        '10:00 AM', '11:00 AM', 'ETSC-CORE-002a fixture', status, businessDay,
        correctedFromId, startIso, endIso
      ]
    );
  }

  const repair = () => request(app)
    .post('/api/transactions/fix-edited-status')
    .set('x-pwtest', '1');

  const statusOf = async (transactionId) => (await database.get(
    'SELECT status FROM transactions WHERE transaction_id = ?',
    [transactionId]
  )).status;

  beforeAll(async () => {
    await database.connect();
    await database.run(
      `INSERT INTO staff (id, name, active, total_fees_earned, total_fees_paid)
       VALUES (1, 'Nim', 1, 0, 0)`
    );
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
  // Assertion 1 — the INNER lookup at :800. The superseding row's own status is
  // not `CORRECTED`, because it was itself edited afterwards.
  // ---------------------------------------------------------------------------
  test('repairs a chain whose superseding row is no longer CORRECTED itself', async () => {
    // B should read EDITED but was wrongly left ACTIVE. C superseded B, and C was
    // then superseded by D, so C now reads EDITED — a status the old query could
    // not match.
    await insertTransaction({ transactionId: 'TX-A', status: 'EDITED (Corrected by TX-B)' });
    await insertTransaction({ transactionId: 'TX-B', status: 'ACTIVE', correctedFromId: 'TX-A' });
    await insertTransaction({ transactionId: 'TX-C', status: 'EDITED (Corrected by TX-D)', correctedFromId: 'TX-B' });
    await insertTransaction({ transactionId: 'TX-D', status: 'CORRECTED', correctedFromId: 'TX-C' });

    const response = await repair();

    expect(response.status).toBe(200);
    expect(await statusOf('TX-B')).toBe('EDITED (Corrected by TX-C)');
    expect(await statusOf('TX-D')).toBe('CORRECTED');
  });

  // ---------------------------------------------------------------------------
  // Assertion 2 — the OUTER scan at :791, part A: a superseded row left
  // `CORRECTED`. Invisible to the old tool, and now double-counting everywhere.
  // ---------------------------------------------------------------------------
  test('repairs a superseded row left CORRECTED, which this epic made double-count', async () => {
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, 1, 'Nim', 1, NULL)`,
      [businessDay]
    );
    await insertTransaction({ transactionId: 'TX-ORIG', status: 'EDITED (Corrected by TX-STRAY)' });
    await insertTransaction({ transactionId: 'TX-STRAY', status: 'CORRECTED', correctedFromId: 'TX-ORIG' });
    await insertTransaction({ transactionId: 'TX-LIVE', status: 'CORRECTED', correctedFromId: 'TX-STRAY' });

    // Both CORRECTED rows count as live work, so one massage reads as two.
    const before = await request(app).get('/api/staff/roster').set('x-pwtest', '1');
    const rowsBefore = Array.isArray(before.body) ? before.body : (before.body.staff || before.body.roster);
    expect(rowsBefore.find((row) => row.masseuse_name === 'Nim').today_massages).toBe(2);

    const response = await repair();
    expect(response.status).toBe(200);

    expect(await statusOf('TX-STRAY')).toBe('EDITED (Corrected by TX-LIVE)');
    expect(await statusOf('TX-LIVE')).toBe('CORRECTED');

    const after = await request(app).get('/api/staff/roster').set('x-pwtest', '1');
    const rowsAfter = Array.isArray(after.body) ? after.body : (after.body.staff || after.body.roster);
    expect(rowsAfter.find((row) => row.masseuse_name === 'Nim').today_massages).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // Assertion 3 — the OUTER scan at :791, part B: the original of a FIRST edit.
  // Its `corrected_from_id` is null by definition, so the old scan could never
  // reach it — the most basic case the tool exists for.
  // ---------------------------------------------------------------------------
  test('repairs the original of a first edit, whose corrected_from_id is null', async () => {
    await insertTransaction({ transactionId: 'TX-FIRST', status: 'ACTIVE' });
    await insertTransaction({ transactionId: 'TX-SECOND', status: 'CORRECTED', correctedFromId: 'TX-FIRST' });

    const response = await repair();

    expect(response.status).toBe(200);
    expect(await statusOf('TX-FIRST')).toBe('EDITED (Corrected by TX-SECOND)');
    expect(await statusOf('TX-SECOND')).toBe('CORRECTED');
  });

  // ---------------------------------------------------------------------------
  // Assertion 4 — GUARD, expected green before and after. A correctly-formed
  // chain is left exactly as it is, and the tool reports repairing nothing.
  // ---------------------------------------------------------------------------
  test('GUARD: a correctly-formed chain is untouched and reports zero repairs', async () => {
    await insertTransaction({ transactionId: 'TX-OK-ORIG', status: 'EDITED (Corrected by TX-OK-REPL)' });
    await insertTransaction({ transactionId: 'TX-OK-REPL', status: 'CORRECTED', correctedFromId: 'TX-OK-ORIG' });
    await insertTransaction({ transactionId: 'TX-PLAIN', status: 'ACTIVE' });

    const response = await repair();

    expect(response.status).toBe(200);
    expect(response.body.fixedCount).toBe(0);
    expect(await statusOf('TX-OK-ORIG')).toBe('EDITED (Corrected by TX-OK-REPL)');
    expect(await statusOf('TX-OK-REPL')).toBe('CORRECTED');
    expect(await statusOf('TX-PLAIN')).toBe('ACTIVE');
  });

  // ---------------------------------------------------------------------------
  // Assertion 5 — GUARD. A cancelled row is an audit record with its own reason
  // string. Nothing supersedes it, and the tool must never overwrite it.
  // ---------------------------------------------------------------------------
  test('GUARD: a cancelled row keeps its cancellation reason', async () => {
    await insertTransaction({
      transactionId: 'TX-CANCELLED',
      status: 'CANCELLED (Customer left before service)'
    });

    const response = await repair();

    expect(response.status).toBe(200);
    expect(await statusOf('TX-CANCELLED')).toBe('CANCELLED (Customer left before service)');
  });

  // ---------------------------------------------------------------------------
  // Assertion 6 — GUARD. The live tail of a chain has no successor and must
  // survive every repair run, however long the chain is.
  // ---------------------------------------------------------------------------
  test('GUARD: the live tail of a long chain is never relabelled', async () => {
    await insertTransaction({ transactionId: 'TX-L1', status: 'EDITED (Corrected by TX-L2)' });
    await insertTransaction({ transactionId: 'TX-L2', status: 'EDITED (Corrected by TX-L3)', correctedFromId: 'TX-L1' });
    await insertTransaction({ transactionId: 'TX-L3', status: 'CORRECTED', correctedFromId: 'TX-L2' });

    await repair();
    await repair();

    expect(await statusOf('TX-L3')).toBe('CORRECTED');
    expect(await statusOf('TX-L2')).toBe('EDITED (Corrected by TX-L3)');
    expect(await statusOf('TX-L1')).toBe('EDITED (Corrected by TX-L2)');
  });

  // ---------------------------------------------------------------------------
  // Assertion 7 — neither status-keyed match survives in the handler.
  // ---------------------------------------------------------------------------
  test('the repair handler keys on the link and keeps no status-keyed match', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', '..', 'backend', 'routes', 'transactions.js'),
      'utf8'
    );
    const start = source.indexOf("router.post('/fix-edited-status'");
    expect(start).toBeGreaterThan(-1);
    const next = source.indexOf('\nrouter.', start + 1);
    const handler = source.slice(start, next === -1 ? source.length : next);

    expect(handler).not.toMatch(/status = "CORRECTED"/);
    expect(handler).not.toMatch(/status = 'CORRECTED'/);
    expect(handler).not.toMatch(/status = 'ACTIVE'/);
    expect(handler).toContain('corrected_from_id');
    expect(handler).toContain('countsAsLiveWork(');
  });
});
