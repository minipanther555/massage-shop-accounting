/**
 * RIT-CONTRACT-001 — one shared definition of live work.
 *
 * The predicate `isLiveWork(alias)` answers "does this transaction represent work
 * that is happening or has happened?" It must be true for `ACTIVE` and for
 * `CORRECTED` (the replacement an edit creates) and false for the superseded
 * original, whose status is the free-text literal `EDITED (Corrected by <id>)`.
 *
 * The predicate is evaluated by SQLite against real seeded rows, never asserted
 * on as a string: a string assertion cannot tell a correct predicate from a
 * plausible wrong one. All verdicts live in one test so a predicate returning a
 * constant fails.
 *
 * Governed by spec FR-001 / AC-001 in
 * 00-project-docs/feature-specifications/reception-intake-truth-and-non-massage-income.md
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const { isLiveWork } = require('../backend/services/transaction-status-sql');

/** The three statuses the contract names, plus the two cancelled literals the
 *  correction workflow actually writes (transactions.js:502 and :893). */
const SEED_ROWS = [
  { id: 'TX-ACTIVE', status: 'ACTIVE', live: true },
  { id: 'TX-CORRECTED', status: 'CORRECTED', live: true },
  { id: 'TX-EDITED', status: 'EDITED (Corrected by TX-1)', live: false },
  { id: 'TX-CANCELLED', status: 'CANCELLED', live: false },
  { id: 'TX-CANCELLED-LEFT', status: 'CANCELLED (Customer left before service)', live: false },
];

const LIVE_IDS = SEED_ROWS.filter((row) => row.live).map((row) => row.id).sort();

describe('RIT-CONTRACT-001 live-work predicate', () => {
  let tempDirectory;
  let database;

  beforeAll(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rit-live-work-'));
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
           end_time, status, business_day
         ) VALUES (?, '2026-08-19T14:00:00+07:00', '2026-08-19', 'May เมย์',
                   'Thai Massage', 'In-Shop', 60, 700, 'Cash', 300, '14:00',
                   '15:00', ?, '2026-08-19')`,
        [row.id, row.status]
      );
    }
  });

  afterAll(async () => {
    await database.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
    delete process.env.DB_PATH;
  });

  it('accepts ACTIVE and CORRECTED and rejects the superseded original and cancelled rows', async () => {
    const rows = await database.all(
      `SELECT transaction_id FROM transactions WHERE ${isLiveWork()} ORDER BY transaction_id`
    );
    expect(rows.map((row) => row.transaction_id)).toEqual(LIVE_IDS);
  });

  it('applies the same verdicts through a table alias', async () => {
    const rows = await database.all(
      `SELECT t.transaction_id FROM transactions t WHERE ${isLiveWork('t')} ORDER BY t.transaction_id`
    );
    expect(rows.map((row) => row.transaction_id)).toEqual(LIVE_IDS);
  });

  it('leaves exactly one live row after two consecutive edits of the same massage', async () => {
    // FR-001 edge case: original EDITED, first replacement EDITED, second CORRECTED.
    const chain = [
      ['TX-CHAIN-0', 'EDITED (Corrected by TX-CHAIN-1)'],
      ['TX-CHAIN-1', 'EDITED (Corrected by TX-CHAIN-2)'],
      ['TX-CHAIN-2', 'CORRECTED'],
    ];
    for (const [id, status] of chain) {
      await database.run(
        `INSERT INTO transactions (
           transaction_id, timestamp, date, masseuse_name, service_type, location,
           duration, payment_amount, payment_method, masseuse_fee, start_time,
           end_time, status, business_day
         ) VALUES (?, '2026-08-19T16:00:00+07:00', '2026-08-19', 'Nok นก',
                   'Thai Massage', 'In-Shop', 60, 700, 'Cash', 300, '16:00',
                   '17:00', ?, '2026-08-19')`,
        [id, status]
      );
    }

    const rows = await database.all(
      `SELECT transaction_id FROM transactions t
        WHERE t.masseuse_name = 'Nok นก' AND ${isLiveWork('t')}`
    );
    expect(rows.map((row) => row.transaction_id)).toEqual(['TX-CHAIN-2']);
  });
});
