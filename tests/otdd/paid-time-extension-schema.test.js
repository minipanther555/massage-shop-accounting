/**
 * PTE-DB-001 — permanent guardrail for the paid-time-extension add-on columns.
 *
 * Governs the additive shared contract that every later Paid Time Extension step
 * is written against:
 *   - parent_transaction_id  links an add-on to the original sale
 *   - add_on_kind            DURATION_UPGRADE | ADDITIONAL_SERVICE | NULL
 *   - payment_status         PAID | PENDING, defaulting to PAID
 *
 * Two paths must both work, because the project creates columns in two places:
 * a fresh database gets them from CREATE TABLE, and a database that predates this
 * change gets them from addMissingColumns(). Both run real production code.
 *
 * Permanent OTDD guardrail (db-ops-regular Law 4.5) — never delete.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const sqlite3 = require('sqlite3');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'pte-schema-test-'));
process.env.DB_PATH = path.join(testDirectory, 'pte-schema.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');

/** The contract: column name → expected PRAGMA table_info shape. */
const ADD_ON_COLUMNS = [
  { name: 'parent_transaction_id', notnull: 0, dflt_value: null },
  { name: 'add_on_kind', notnull: 0, dflt_value: null },
  { name: 'payment_status', notnull: 1, dflt_value: "'PAID'" },
];

/** Pre-feature shape of `transactions` — everything except the three add-on columns. */
const LEGACY_TRANSACTIONS_TABLE = `
  CREATE TABLE transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id TEXT UNIQUE NOT NULL,
    timestamp DATETIME NOT NULL,
    date DATE NOT NULL,
    masseuse_name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    location TEXT NOT NULL,
    duration INTEGER NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL,
    masseuse_fee DECIMAL(10,2) NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    customer_contact TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    business_day DATE,
    corrected_from_id TEXT,
    start_datetime DATETIME,
    end_datetime DATETIME,
    base_price DECIMAL(10,2),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    promotion_type TEXT,
    promotion_label TEXT
  )`;

function createLegacyDatabase(filePath) {
  return new Promise((resolve, reject) => {
    const raw = new sqlite3.Database(filePath, (openError) => {
      if (openError) return reject(openError);
      raw.run(LEGACY_TRANSACTIONS_TABLE, (runError) => {
        if (runError) return reject(runError);
        raw.close((closeError) => (closeError ? reject(closeError) : resolve()));
      });
    });
  });
}

async function columnsOf(connection, table) {
  const rows = await connection.all(`PRAGMA table_info(${table})`);
  return new Map(rows.map((row) => [row.name, row]));
}

describe('PTE-DB-001 add-on schema contract', () => {
  let connection;

  before(async () => {
    connection = await database.connect();
  });

  after(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('a freshly initialised database carries all three add-on columns', async () => {
    const columns = await columnsOf(connection, 'transactions');
    ADD_ON_COLUMNS.forEach((expected) => {
      const actual = columns.get(expected.name);
      assert.ok(actual, `transactions.${expected.name} is missing on a fresh database`);
      assert.strictEqual(actual.type, 'TEXT', `${expected.name} should be TEXT`);
      assert.strictEqual(actual.notnull, expected.notnull, `${expected.name} nullability`);
      assert.strictEqual(actual.dflt_value, expected.dflt_value, `${expected.name} default`);
    });
  });

  it('a database created before this change is upgraded by addMissingColumns()', async () => {
    const legacyPath = path.join(testDirectory, 'legacy.db');
    await createLegacyDatabase(legacyPath);

    // Real production upgrade path: CREATE TABLE IF NOT EXISTS is a no-op on the
    // existing legacy table, then addMissingColumns() ALTERs in what is missing.
    const legacyConnection = await database.getConnection(legacyPath);
    const columns = await columnsOf(legacyConnection, 'transactions');

    ADD_ON_COLUMNS.forEach((expected) => {
      assert.ok(
        columns.get(expected.name),
        `transactions.${expected.name} was not added to a pre-existing database`
      );
    });
  });

  it('running the column check twice adds nothing and throws nothing', async () => {
    const before = await columnsOf(connection, 'transactions');
    await connection.addMissingColumns();
    const after = await columnsOf(connection, 'transactions');

    assert.strictEqual(
      after.size,
      before.size,
      'a second initialisation changed the column count — addMissingColumns is not idempotent'
    );
  });

  it('existing rows read back as ordinary non-add-on transactions', async () => {
    await connection.run(
      `INSERT INTO transactions (
         transaction_id, timestamp, date, masseuse_name, service_type, location,
         duration, payment_amount, payment_method, masseuse_fee, start_time,
         end_time, status, business_day
       ) VALUES (
         'pte-schema-legacy-row', '2026-07-23T14:00:00+07:00', '2026-07-23', 'May เมย์',
         'Thai Massage', 'In-Shop', 60, 500, 'Cash', 200, '14:00', '15:00',
         'ACTIVE', '2026-07-23'
       )`
    );

    const row = await connection.get(
      `SELECT parent_transaction_id, add_on_kind, payment_status
         FROM transactions WHERE transaction_id = 'pte-schema-legacy-row'`
    );

    assert.strictEqual(row.parent_transaction_id, null, 'an ordinary sale has no parent');
    assert.strictEqual(row.add_on_kind, null, 'an ordinary sale has no add-on kind');
    assert.strictEqual(
      row.payment_status,
      'PAID',
      'an ordinary sale must default to PAID so historical revenue is never reclassified'
    );
  });
});
