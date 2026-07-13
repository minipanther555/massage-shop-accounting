const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const fixtureDbs = [];

describe('OTDD today staff demo seed guardrails', () => {
  const modulePath = path.join('..', '..', 'scripts', 'todayStaffDemoSeed');

  afterEach(() => {
    for (const dbPath of fixtureDbs.splice(0)) {
      try { fs.unlinkSync(dbPath); } catch {}
    }
  });

  it('exposes production seed/reset functions', () => {
    const seedModule = require(modulePath);

    assert.strictEqual(typeof seedModule.buildSeedPlan, 'function');
    assert.strictEqual(typeof seedModule.runSeed, 'function');
  });

  it('rejects DB paths outside the workspace', () => {
    const { assertWorkspaceDb } = require(modulePath);
    assert.throws(() => assertWorkspaceDb('/tmp/outside-workspace.sqlite'), /outside workspace/);
  });

  it('dry-run reports a bounded plan and does not mutate payday or transaction data', async () => {
    const dbPath = await createFixtureDb();
    const { runSeed } = require(modulePath);

    const before = await inspectDb(dbPath);
    const result = await runSeed({ dbPath, dryRun: true, baseBusinessDay: '2026-07-10' });
    const after = await inspectDb(dbPath);

    assert.strictEqual(result.mode, 'dry-run');
    assert.strictEqual(result.staffCount, 5);
    assert.strictEqual(result.wouldSeedTransactions, 9);
    assert.deepStrictEqual(after, before);
  });

  it('apply preserves staff, clears payday tracking, and seeds three helper business days', async () => {
    const dbPath = await createFixtureDb();
    const { runSeed } = require(modulePath);

    const result = await runSeed({ dbPath, dryRun: false, baseBusinessDay: '2026-07-10' });
    const after = await inspectDb(dbPath);

    assert.strictEqual(result.mode, 'apply');
    assert.strictEqual(result.staffCountBefore, 5);
    assert.strictEqual(result.staffCountAfter, 5);
    assert.strictEqual(after.staffCount, 5);
    assert.strictEqual(after.staffPayments, 0);
    assert.strictEqual(after.totalEarned, 0);
    assert.strictEqual(after.totalPaid, 0);
    assert.strictEqual(after.lastPaymentDates, 0);
    assert.strictEqual(after.seedTransactions, 9);
    assert.deepStrictEqual(after.seedBusinessDays, ['2026-07-07', '2026-07-08', '2026-07-09']);
    assert.strictEqual(result.helperPreview[0].previous_day_commission, 0);
    assert.ok(result.helperPreview.some((row) => row.previous_day_commission === 600));
  });

  it('seeds enough previous-day data for the first helper page to show non-zero ranking rows', async () => {
    const dbPath = await createFixtureDb({ staffCount: 12 });
    const { runSeed } = require(modulePath);

    const result = await runSeed({ dbPath, dryRun: false, baseBusinessDay: '2026-07-10' });

    assert.strictEqual(result.helperPreview.length, 8);
    assert.ok(
      result.helperPreview.some((row) => row.previous_day_commission > 0),
      'expected the visible helper preview to include at least one non-zero previous-day commission'
    );
  });
});

async function createFixtureDb(options = {}) {
  const staffCount = options.staffCount || 5;
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = path.join(process.cwd(), 'test-data', `today-staff-demo-${process.pid}-${Date.now()}.sqlite`);
  fixtureDbs.push(dbPath);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  try { fs.unlinkSync(dbPath); } catch {}

  const db = new sqlite3.Database(dbPath);
  const run = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
  const close = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));

  await run(`CREATE TABLE staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT TRUE,
    total_fees_earned DECIMAL(10,2) DEFAULT 0,
    total_fees_paid DECIMAL(10,2) DEFAULT 0,
    last_payment_date DATE,
    last_payment_amount DECIMAL(10,2),
    last_payment_type TEXT
  )`);
  await run(`CREATE TABLE staff_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    masseuse_name TEXT NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_type TEXT NOT NULL
  )`);
  await run(`CREATE TABLE transactions (
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
    status TEXT NOT NULL DEFAULT 'ACTIVE'
  )`);

  const staffNames = ['Ann', 'Bee', 'Cat', 'Dee', 'Eli', 'Fay', 'Gia', 'Han', 'Ivy', 'Jai', 'Kim', 'Lou'];
  for (const name of staffNames.slice(0, staffCount)) {
    await run(
      `INSERT INTO staff (name, active, total_fees_earned, total_fees_paid, last_payment_date, last_payment_amount, last_payment_type)
       VALUES (?, 1, 999, 111, '2026-07-01', 111, 'regular')`,
      [name]
    );
  }
  await run("INSERT INTO staff_payments (masseuse_name, payment_date, amount, payment_type) VALUES ('Ann', '2026-07-01', 111, 'regular')");
  await run(`INSERT INTO transactions (
    transaction_id, timestamp, date, masseuse_name, service_type, location, duration,
    payment_amount, payment_method, masseuse_fee, start_time, end_time, customer_contact, status
  ) VALUES ('existing-tx', '2026-07-01T10:00:00.000Z', '2026-07-01', 'Ann', 'Existing', 'Room', 60, 100, 'cash', 50, '10:00', '11:00', 'existing', 'ACTIVE')`);

  await close();
  return dbPath;
}

async function inspectDb(dbPath) {
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
  const get = (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
  const all = (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
  const close = () => new Promise((resolve, reject) => db.close((error) => (error ? reject(error) : resolve())));

  const staff = await get('SELECT COUNT(*) AS count, COALESCE(SUM(total_fees_earned), 0) AS earned, COALESCE(SUM(total_fees_paid), 0) AS paid, COUNT(last_payment_date) AS last_dates FROM staff');
  const payments = await get('SELECT COUNT(*) AS count FROM staff_payments');
  const seedTransactions = await get("SELECT COUNT(*) AS count FROM transactions WHERE customer_contact = 'TODAY_STAFF_DEMO_SEED_V1'");
  let seedBusinessDays = [];
  try {
    seedBusinessDays = (await all(
      "SELECT DISTINCT business_day FROM transactions WHERE customer_contact = 'TODAY_STAFF_DEMO_SEED_V1' ORDER BY business_day"
    )).map((row) => row.business_day);
  } catch {}

  await close();
  return {
    staffCount: staff.count,
    staffPayments: payments.count,
    totalEarned: staff.earned,
    totalPaid: staff.paid,
    lastPaymentDates: staff.last_dates,
    seedTransactions: seedTransactions.count,
    seedBusinessDays
  };
}
