/**
 * RIT-DB-001 — permanent guardrail for the expenses attribution columns.
 *
 * Governs the additive schema contract that RIT-MONEY-002 (a tip is income,
 * expense, and attributed) is written against:
 *   - expenses.masseuse_name  TEXT NULL — soft reference to staff.name
 *   - expenses.business_day   DATE NULL — the shop day, not the UTC calendar day
 *   - index idx_expenses_business_day on expenses (business_day)
 *
 * Three paths must all hold, because the project creates schema in three places:
 * a fresh database gets the columns from CREATE TABLE, a database that predates
 * this change gets them from addMissingColumns(), and the index comes from
 * ensureIndexes() — which columnTasks cannot create, since its applier only ever
 * emits ALTER TABLE ... ADD COLUMN.
 *
 * The pre-existing-rows assertion is the data-integrity half of the step's
 * Validation line: a seeded legacy database must come through the upgrade with
 * the same expense row count and the same total amount, and no backfill.
 *
 * Permanent OTDD guardrail (db-ops-regular Law 4.5) — never delete.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const sqlite3 = require('sqlite3');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'rit-expenses-schema-test-'));
process.env.DB_PATH = path.join(testDirectory, 'rit-expenses-schema.db');
process.env.NODE_ENV = 'testing';
process.env.PWTEST = '1';

const database = require('../../backend/models/database');

/** The contract: column name → expected PRAGMA table_info shape. */
const EXPENSE_COLUMNS = [
  { name: 'masseuse_name', type: 'TEXT', notnull: 0, dflt_value: null },
  { name: 'business_day', type: 'DATE', notnull: 0, dflt_value: null },
];

const EXPENSE_INDEX = 'idx_expenses_business_day';

/** Pre-feature shape of `expenses` — exactly the six original columns. */
const LEGACY_EXPENSES_TABLE = `
  CREATE TABLE expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`;

/** Rows that must survive the upgrade untouched, in number and in total. */
const LEGACY_EXPENSE_ROWS = [
  ['2026-07-21', 'Laundry', 250],
  ['2026-07-21', 'Cleaning supplies', 130.5],
  ['2026-07-22', 'Water delivery', 90],
];

const LEGACY_ROW_COUNT = LEGACY_EXPENSE_ROWS.length;
const LEGACY_ROW_TOTAL = LEGACY_EXPENSE_ROWS.reduce((sum, row) => sum + row[2], 0);

function createLegacyDatabase(filePath) {
  return new Promise((resolve, reject) => {
    const raw = new sqlite3.Database(filePath, (openError) => {
      if (openError) return reject(openError);
      raw.run(LEGACY_EXPENSES_TABLE, (runError) => {
        if (runError) return reject(runError);
        const insert = raw.prepare(
          'INSERT INTO expenses (date, description, amount) VALUES (?, ?, ?)'
        );
        LEGACY_EXPENSE_ROWS.forEach((row) => insert.run(row));
        insert.finalize((finalizeError) => {
          if (finalizeError) return reject(finalizeError);
          raw.close((closeError) => (closeError ? reject(closeError) : resolve()));
        });
      });
    });
  });
}

async function columnsOf(connection, table) {
  const rows = await connection.all(`PRAGMA table_info(${table})`);
  return new Map(rows.map((row) => [row.name, row]));
}

async function indexesOf(connection, table) {
  const rows = await connection.all(`PRAGMA index_list(${table})`);
  return new Map(rows.map((row) => [row.name, row]));
}

describe('RIT-DB-001 expenses attribution schema contract', () => {
  let connection;

  before(async () => {
    connection = await database.connect();
  });

  after(async () => {
    await database.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  });

  it('a freshly initialised database carries both attribution columns, nullable', async () => {
    const columns = await columnsOf(connection, 'expenses');
    EXPENSE_COLUMNS.forEach((expected) => {
      const actual = columns.get(expected.name);
      assert.ok(actual, `expenses.${expected.name} is missing on a fresh database`);
      assert.strictEqual(actual.type, expected.type, `${expected.name} declared type`);
      assert.strictEqual(
        actual.notnull,
        expected.notnull,
        `${expected.name} must be nullable so existing rows stay valid with no backfill`
      );
      assert.strictEqual(actual.dflt_value, expected.dflt_value, `${expected.name} default`);
    });
  });

  it('the business-day index exists, and it indexes business_day', async () => {
    const indexes = await indexesOf(connection, 'expenses');
    assert.ok(
      indexes.get(EXPENSE_INDEX),
      `${EXPENSE_INDEX} is missing — columnTasks cannot create an index, ensureIndexes() must`
    );

    const indexedColumns = await connection.all(`PRAGMA index_info(${EXPENSE_INDEX})`);
    assert.deepStrictEqual(
      indexedColumns.map((row) => row.name),
      ['business_day'],
      `${EXPENSE_INDEX} must index exactly business_day`
    );
  });

  it('a database created before this change is upgraded, and its rows are untouched', async () => {
    const legacyPath = path.join(testDirectory, 'legacy.db');
    await createLegacyDatabase(legacyPath);

    // Real production upgrade path: CREATE TABLE IF NOT EXISTS is a no-op on the
    // existing legacy table, then addMissingColumns() ALTERs in what is missing
    // and ensureIndexes() creates the index.
    const legacyConnection = await database.getConnection(legacyPath);

    const columns = await columnsOf(legacyConnection, 'expenses');
    EXPENSE_COLUMNS.forEach((expected) => {
      assert.ok(
        columns.get(expected.name),
        `expenses.${expected.name} was not added to a pre-existing database`
      );
    });

    const indexes = await indexesOf(legacyConnection, 'expenses');
    assert.ok(
      indexes.get(EXPENSE_INDEX),
      `${EXPENSE_INDEX} was not created on a pre-existing database`
    );

    const totals = await legacyConnection.get(
      'SELECT COUNT(*) AS row_count, COALESCE(SUM(amount), 0) AS total_amount FROM expenses'
    );
    assert.strictEqual(
      totals.row_count,
      LEGACY_ROW_COUNT,
      'the upgrade changed how many expense rows exist'
    );
    assert.strictEqual(
      Number(totals.total_amount),
      LEGACY_ROW_TOTAL,
      'the upgrade changed the total expense amount'
    );

    const backfilled = await legacyConnection.get(
      `SELECT COUNT(*) AS filled FROM expenses
        WHERE masseuse_name IS NOT NULL OR business_day IS NOT NULL`
    );
    assert.strictEqual(
      backfilled.filled,
      0,
      'pre-existing expense rows were backfilled — the change must be additive only'
    );
  });

  it('running the schema check twice adds nothing and throws nothing', async () => {
    const columnsBefore = await columnsOf(connection, 'expenses');
    const indexesBefore = await indexesOf(connection, 'expenses');

    await connection.addMissingColumns();

    const columnsAfter = await columnsOf(connection, 'expenses');
    const indexesAfter = await indexesOf(connection, 'expenses');

    assert.strictEqual(
      columnsAfter.size,
      columnsBefore.size,
      'a second initialisation changed the expenses column count — addMissingColumns is not idempotent'
    );
    assert.strictEqual(
      indexesAfter.size,
      indexesBefore.size,
      'a second initialisation changed the expenses index count — ensureIndexes is not idempotent'
    );
  });

  it('a new expense row can carry a masseuse and a business day', async () => {
    await connection.run(
      `INSERT INTO expenses (date, description, amount, masseuse_name, business_day)
       VALUES ('2026-08-19', 'Tip handed to masseuse', 100, 'May เมย์', '2026-08-19')`
    );

    const row = await connection.get(
      `SELECT masseuse_name, business_day, amount FROM expenses
        WHERE description = 'Tip handed to masseuse'`
    );

    assert.strictEqual(row.masseuse_name, 'May เมย์', 'the masseuse attribution did not persist');
    assert.strictEqual(row.business_day, '2026-08-19', 'the business day did not persist');
    assert.strictEqual(Number(row.amount), 100, 'the amount did not persist');
  });
});
