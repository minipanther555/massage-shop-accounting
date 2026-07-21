const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const DB_PATH = require('../dbPath');

const locationId = Number(process.argv[2]);
const replace = process.argv.includes('--replace');

if (!Number.isInteger(locationId) || locationId <= 0) {
  throw new Error('Usage: node backend/scripts/bootstrap-branch-database.js <positive-location-id> [--replace]');
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

fs.copyFileSync(DB_PATH, targetPath);

const db = new sqlite3.Database(targetPath);
const clearTables = [
  'transactions',
  'archived_transactions',
  'bookings',
  'booking_credits',
  'business_days',
  'daily_summaries',
  'expenses',
  'staff_payments',
  'staff_roster',
  'today_staff',
  'today_staff_planning',
  'today_staff_audit_log',
  'staff'
];

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

async function bootstrap() {
  try {
    const sourceIntegrity = await get('PRAGMA integrity_check');
    if (sourceIntegrity.integrity_check !== 'ok') {
      throw new Error(`Copied branch database failed integrity check: ${sourceIntegrity.integrity_check}`);
    }

    const locationsTable = await get("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'locations'");
    if (!locationsTable) {
      throw new Error('Source database does not contain the required locations table');
    }

    await execute('PRAGMA foreign_keys = OFF');
    await execute('BEGIN IMMEDIATE');
    for (const table of clearTables) {
      await execute(`DELETE FROM ${table}`);
    }
    await execute('DELETE FROM sqlite_sequence WHERE name IN (' + clearTables.map(() => '?').join(', ') + ')', clearTables);
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
        (SELECT COUNT(*) FROM payment_methods) AS payment_method_count
    `);

    if (verification.staff_count !== 0 || verification.transaction_count !== 0 || verification.booking_count !== 0) {
      throw new Error('Branch bootstrap verification failed: operational data was not cleared');
    }

    process.stdout.write(`${JSON.stringify({ targetPath, locationId, ...verification })}\n`);
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

bootstrap().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
