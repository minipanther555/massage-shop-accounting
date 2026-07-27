const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();
const DB_PATH = require('../dbPath');

// Adopt the configured source database AS a branch database, preserving that
// branch's staff, roster, and trading history. This is the counterpart to
// bootstrap-branch-database.js: bootstrap creates an EMPTY branch, adopt claims
// an EXISTING body of data for a branch that was already trading before
// database-per-branch routing existed.
//
// Rows belonging to a different branch are removed by an explicit, auditable
// rule: staff whose created_at falls on an excluded date, plus every row keyed
// to those staff names. The source database is never modified.

const args = process.argv.slice(2);
const locationId = Number(args[0]);
const replace = args.includes('--replace');
const excludeStaffCreatedOn = args
  .filter((arg) => arg.startsWith('--exclude-staff-created-on='))
  .map((arg) => arg.split('=')[1])
  .filter(Boolean);

const USAGE = 'Usage: node backend/scripts/adopt-source-as-branch.js <positive-location-id> '
  + '[--exclude-staff-created-on=YYYY-MM-DD ...] [--replace]';

if (!Number.isInteger(locationId) || locationId <= 0) {
  throw new Error(USAGE);
}

for (const date of excludeStaffCreatedOn) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`--exclude-staff-created-on must be YYYY-MM-DD, received: ${date}`);
  }
}

const extension = path.extname(DB_PATH);
const baseName = path.basename(DB_PATH, extension);
const targetPath = path.join(path.dirname(DB_PATH), `${baseName}.branch-${locationId}${extension}`);

if (!fs.existsSync(DB_PATH)) {
  throw new Error(`Source database does not exist: ${DB_PATH}`);
}

if (path.resolve(DB_PATH) === path.resolve(targetPath)) {
  throw new Error('Refusing to use the source database as the branch target');
}

if (fs.existsSync(targetPath) && !replace) {
  throw new Error(`Branch database already exists: ${targetPath}. Re-run with --replace only after confirming it is disposable.`);
}

// Day-scoped queue state is rebuilt every business day and carries no history
// worth adopting. It is cleared wholesale rather than filtered by staff name so
// a foreign branch's setup day cannot leave a partial queue behind.
const dailyQueueTables = ['today_staff', 'today_staff_planning', 'today_staff_audit_log'];

fs.copyFileSync(DB_PATH, targetPath);

const db = new sqlite3.Database(targetPath);

function execute(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) return reject(error);
      return resolve({ changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => (error ? reject(error) : resolve(row)));
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
  });
}

async function adopt() {
  try {
    const integrity = await get('PRAGMA integrity_check');
    if (integrity.integrity_check !== 'ok') {
      throw new Error(`Copied branch database failed integrity check: ${integrity.integrity_check}`);
    }

    const locationsTable = await get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'locations'");
    if (!locationsTable) {
      throw new Error('Source database does not contain the required locations table');
    }

    const placeholders = excludeStaffCreatedOn.map(() => '?').join(', ');
    const foreignStaff = excludeStaffCreatedOn.length
      ? await all(`SELECT id, name FROM staff WHERE substr(created_at, 1, 10) IN (${placeholders})`, excludeStaffCreatedOn)
      : [];
    const foreignNames = foreignStaff.map((row) => row.name);

    await execute('PRAGMA foreign_keys = OFF');
    await execute('BEGIN IMMEDIATE');

    const removed = {
      staff: 0, transactions: 0, staff_roster: 0, bookings: 0, staff_payments: 0, expenses: 0
    };

    if (foreignNames.length) {
      const namePlaceholders = foreignNames.map(() => '?').join(', ');
      removed.transactions = (await execute(
        `DELETE FROM transactions WHERE masseuse_name IN (${namePlaceholders})`, foreignNames
      )).changes;
      removed.staff_roster = (await execute(
        `DELETE FROM staff_roster WHERE masseuse_name IN (${namePlaceholders})`, foreignNames
      )).changes;
      removed.bookings = (await execute(
        `DELETE FROM bookings WHERE requested_masseuse_name IN (${namePlaceholders})`, foreignNames
      )).changes;
      removed.staff_payments = (await execute(
        `DELETE FROM staff_payments WHERE masseuse_name IN (${namePlaceholders})`, foreignNames
      )).changes;
      removed.staff = (await execute(
        `DELETE FROM staff WHERE name IN (${namePlaceholders})`, foreignNames
      )).changes;
    }

    let clearedQueueRows = 0;
    for (const table of dailyQueueTables) {
      clearedQueueRows += (await execute(`DELETE FROM ${table}`)).changes;
    }

    await execute(
      'INSERT OR IGNORE INTO locations (id, name, active) VALUES (?, ?, 1)',
      [locationId, `Top Thai ${locationId}`]
    );

    await execute('COMMIT');
    await execute('PRAGMA foreign_keys = ON');

    const verification = await get(`
      SELECT
        (SELECT COUNT(*) FROM staff) AS staff_count,
        (SELECT COUNT(*) FROM transactions) AS transaction_count,
        (SELECT COUNT(*) FROM bookings) AS booking_count,
        (SELECT COUNT(*) FROM services) AS service_count,
        (SELECT COUNT(*) FROM payment_methods) AS payment_method_count,
        (SELECT COUNT(*) FROM staff_roster) AS staff_roster_count,
        (SELECT COUNT(*) FROM today_staff) AS today_staff_count,
        (SELECT COUNT(*) FROM locations WHERE id = ${locationId}) AS branch_location_row
    `);

    if (verification.branch_location_row !== 1) {
      throw new Error(`Branch adoption verification failed: locations row for ${locationId} is missing`);
    }
    if (verification.today_staff_count !== 0) {
      throw new Error('Branch adoption verification failed: the daily queue was not cleared');
    }
    if (excludeStaffCreatedOn.length && removed.staff !== foreignNames.length) {
      throw new Error(`Branch adoption verification failed: expected to remove ${foreignNames.length} staff, removed ${removed.staff}`);
    }

    process.stdout.write(`${JSON.stringify({
      targetPath,
      locationId,
      excludedStaffCreatedOn: excludeStaffCreatedOn,
      removedStaffNames: foreignNames,
      removed,
      clearedQueueRows,
      ...verification
    }, null, 2)}\n`);
  } catch (error) {
    try {
      await execute('ROLLBACK');
    } catch (_) {
      // No transaction was active or it already rolled back.
    }
    throw error;
  } finally {
    db.close();
  }
}

adopt().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
