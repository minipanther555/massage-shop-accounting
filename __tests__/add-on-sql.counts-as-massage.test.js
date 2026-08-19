/**
 * RIT-CONTRACT-002 — the counting rule stops counting non-massage money.
 *
 * `countsAsMassage(alias)` answers "does this row count as a massage performed?"
 * The spec's "Contract: countable massage (AMENDED)" block makes it kind-driven
 * rather than parent-driven, so a tip or a miscellaneous-income row never counts
 * whether or not it has a parent, while the three existing verdicts are
 * preserved exactly.
 *
 * The five verdicts the step's `Validation:` line names live in ONE test, so an
 * implementation that only satisfies the two new cases fails. The predicate is
 * evaluated by SQLite against real seeded rows, never asserted on as a string: a
 * string assertion cannot tell a correct predicate from a plausible wrong one.
 *
 * Expected verdicts are read from the spec's contract prose (lines 262-272 of
 * 00-project-docs/feature-specifications/reception-intake-truth-and-non-massage-income.md)
 * and FR-007, not recomputed the way the production code computes them.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { countsAsMassage } = require('../backend/services/add-on-sql');

/**
 * `counts` is taken from the spec, not from the code:
 *  - "an ordinary massage has no kind and still counts"
 *  - "an ADDITIONAL_SERVICE still does"
 *  - "a DURATION_UPGRADE still does not"
 *  - FR-007: neither a tip nor a miscellaneous income row raises any masseuse's
 *    massage count — "whether or not it has a parent".
 */
const SEED_ROWS = [
  { id: 'TX-MASSAGE', parent: null, kind: null, counts: true },
  { id: 'TX-ADDITIONAL', parent: 'TX-MASSAGE', kind: 'ADDITIONAL_SERVICE', counts: true },
  { id: 'TX-UPGRADE', parent: 'TX-MASSAGE', kind: 'DURATION_UPGRADE', counts: false },
  { id: 'TX-TIP', parent: 'TX-MASSAGE', kind: 'TIP', counts: false },
  { id: 'TX-TIP-NO-PARENT', parent: null, kind: 'TIP', counts: false },
  { id: 'TX-MISC', parent: null, kind: 'MISC_INCOME', counts: false },
  { id: 'TX-MISC-WITH-PARENT', parent: 'TX-MASSAGE', kind: 'MISC_INCOME', counts: false },
];

const COUNTED_IDS = SEED_ROWS.filter((row) => row.counts).map((row) => row.id).sort();

describe('RIT-CONTRACT-002 countable-massage predicate', () => {
  let tempDirectory;
  let database;

  beforeAll(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rit-counts-massage-'));
    process.env.DB_PATH = path.join(tempDirectory, 'massage_shop.db');
    process.env.NODE_ENV = 'testing';
    jest.resetModules();
    database = require('../backend/models/database');
    await database.connect();

    for (const row of SEED_ROWS) {
      await database.run(
        `INSERT INTO transactions (
           transaction_id, timestamp, date, masseuse_name, service_type, location,
           duration, payment_amount, payment_method, masseuse_fee, start_time,
           end_time, status, business_day, parent_transaction_id, add_on_kind
         ) VALUES (?, '2026-08-19T14:00:00+07:00', '2026-08-19', 'May เมย์',
                   'Thai Massage', 'In-Shop', 60, 700, 'Cash', 300, '14:00',
                   '15:00', 'ACTIVE', '2026-08-19', ?, ?)`,
        [row.id, row.parent, row.kind]
      );
    }
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  it('counts an ordinary massage and an ADDITIONAL_SERVICE, and does not count a DURATION_UPGRADE, a TIP or a parentless MISC_INCOME', async () => {
    const rows = await database.all(
      `SELECT transaction_id FROM transactions
        WHERE ${countsAsMassage()} ORDER BY transaction_id`
    );
    expect(rows.map((row) => row.transaction_id)).toEqual(COUNTED_IDS);
  });

  it('applies the same verdicts through a table alias', async () => {
    const rows = await database.all(
      `SELECT t.transaction_id FROM transactions t
        WHERE ${countsAsMassage('t')} ORDER BY t.transaction_id`
    );
    expect(rows.map((row) => row.transaction_id)).toEqual(COUNTED_IDS);
  });

  it('counts exactly one massage for a masseuse whose massage carried a tip and an upgrade', async () => {
    // FR-007 output: recording non-massage money leaves the workload as it was.
    const [{ massage_count: massageCount }] = await database.all(
      `SELECT COUNT(CASE WHEN ${countsAsMassage('t')} THEN 1 END) AS massage_count
         FROM transactions t
        WHERE t.transaction_id IN ('TX-MASSAGE', 'TX-UPGRADE', 'TX-TIP')`
    );
    expect(massageCount).toBe(1);
  });
});
