const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const SEED_MARKER = 'TODAY_STAFF_DEMO_SEED_V1';
const DEFAULT_BASE_BUSINESS_DAY = '2026-07-10';

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function assertWorkspaceDb(dbPath) {
  if (!dbPath) {
    throw new Error('--db is required');
  }

  const resolved = path.resolve(dbPath);
  const relative = path.relative(WORKSPACE_ROOT, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to touch DB outside workspace: ${resolved}`);
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`DB file does not exist: ${resolved}`);
  }

  return resolved;
}

function buildSeedPlan(options = {}) {
  const baseBusinessDay = options.baseBusinessDay || DEFAULT_BASE_BUSINESS_DAY;
  const businessDays = [addDays(baseBusinessDay, -3), addDays(baseBusinessDay, -2), addDays(baseBusinessDay, -1)];

  return {
    marker: SEED_MARKER,
    baseBusinessDay,
    helperPreviewAt: `${baseBusinessDay}T10:00:00+07:00`,
    businessDays,
    requiredActiveStaff: 5,
    paydayReset: {
      deleteStaffPayments: true,
      resetStaffTotals: true
    }
  };
}

function loadDatabase(dbPath) {
  const resolved = assertWorkspaceDb(dbPath);
  process.env.DB_PATH = resolved;
  delete require.cache[require.resolve('../backend/dbPath')];
  delete require.cache[require.resolve('../backend/models/database')];
  return require('../backend/models/database');
}

async function tableExists(database, tableName) {
  const row = await database.get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  return Boolean(row);
}

async function assertRequiredSchema(database) {
  const requiredTables = [
    'staff',
    'staff_payments',
    'transactions',
    'business_days',
    'today_staff',
    'today_staff_planning',
    'today_staff_audit_log'
  ];

  for (const tableName of requiredTables) {
    if (!await tableExists(database, tableName)) {
      throw new Error(`Required table missing after initialization: ${tableName}`);
    }
  }

  const columns = await database.all('PRAGMA table_info(transactions)');
  if (!columns.some((column) => column.name === 'business_day')) {
    throw new Error('Required column missing after initialization: transactions.business_day');
  }
}

async function getActiveSeedStaff(database, count) {
  const staff = await database.all(
    `SELECT id, name
     FROM staff
     WHERE active = 1
       AND name IS NOT NULL
       AND TRIM(name) != ''
     ORDER BY name COLLATE NOCASE ASC`
  );

  if (staff.length < count) {
    throw new Error(`Need at least ${count} active staff to seed helper data; found ${staff.length}`);
  }

  return staff;
}

function buildTransactions(plan, staff) {
  const [zeroPrevious, lowPrevious, midPrevious, highPrevious, supportStaff] = staff;
  const day1 = plan.businessDays[0];
  const day2 = plan.businessDays[1];
  const day3 = plan.businessDays[2];
  const rows = [
    { day: day1, staff: zeroPrevious, fee: 120, price: 300, hour: 11, service: 'Demo Thai 60' },
    { day: day1, staff: lowPrevious, fee: 240, price: 600, hour: 12, service: 'Demo Oil 90' },
    { day: day1, staff: midPrevious, fee: 360, price: 900, hour: 13, service: 'Demo Thai 120' },
    { day: day2, staff: zeroPrevious, fee: 300, price: 750, hour: 11, service: 'Demo Thai 90' },
    { day: day2, staff: supportStaff, fee: 180, price: 450, hour: 12, service: 'Demo Foot 60' },
    { day: day2, staff: highPrevious, fee: 420, price: 1050, hour: 13, service: 'Demo Oil 120' },
    { day: day3, staff: lowPrevious, fee: 150, price: 400, hour: 11, service: 'Demo Thai 60' },
    { day: day3, staff: midPrevious, fee: 300, price: 800, hour: 12, service: 'Demo Oil 90' },
    { day: day3, staff: highPrevious, fee: 600, price: 1500, hour: 13, service: 'Demo Thai 120' }
  ];

  for (const [index, activeStaff] of staff.slice(5).entries()) {
    rows.push({
      day: day3,
      staff: activeStaff,
      fee: 90 + (index * 30),
      price: 300 + (index * 100),
      hour: 14 + (index % 8),
      service: 'Demo Overflow 60'
    });
  }

  return rows.map((row, index) => ({
    transaction_id: `${SEED_MARKER}_${row.day.replace(/-/g, '')}_${String(index + 1).padStart(2, '0')}`,
    timestamp: `${row.day}T${String(row.hour).padStart(2, '0')}:00:00.000+07:00`,
    date: row.day,
    business_day: row.day,
    masseuse_name: row.staff.name,
    service_type: row.service,
    location: 'Demo Room',
    duration: row.service.includes('120') ? 120 : row.service.includes('90') ? 90 : 60,
    payment_amount: row.price,
    payment_method: 'demo-cash',
    masseuse_fee: row.fee,
    start_time: `${String(row.hour).padStart(2, '0')}:00`,
    end_time: `${String(row.hour + 1).padStart(2, '0')}:00`,
    customer_contact: SEED_MARKER,
    status: 'ACTIVE'
  }));
}

async function previewHelper(database, currentBusinessDay) {
  const previousBusinessDay = addDays(currentBusinessDay, -1);
  return database.all(
    `SELECT
       s.name AS display_name,
       COALESCE(SUM(CASE WHEN t.status = 'ACTIVE' THEN t.masseuse_fee ELSE 0 END), 0) AS previous_day_commission
     FROM staff s
     LEFT JOIN transactions t
       ON t.masseuse_name = s.name
      AND t.business_day = ?
     WHERE s.active = 1
     GROUP BY s.id, s.name
     ORDER BY previous_day_commission ASC, s.name COLLATE NOCASE ASC
     LIMIT 8`,
    [previousBusinessDay]
  );
}

async function runSeed(options = {}) {
  const dbPath = assertWorkspaceDb(options.dbPath);
  const plan = buildSeedPlan(options);
  const database = loadDatabase(dbPath);
  await database.connect();

  try {
    await assertRequiredSchema(database);
    const beforeStaff = await database.get('SELECT COUNT(*) AS count FROM staff');
    const activeStaff = await getActiveSeedStaff(database, plan.requiredActiveStaff);
    const transactions = buildTransactions(plan, activeStaff);

    if (options.dryRun) {
      return {
        mode: 'dry-run',
        dbPath,
        staffCount: beforeStaff.count,
        activeSeedStaff: activeStaff.map((staff) => staff.name),
        wouldDeleteStaffPayments: true,
        wouldResetStaffPaydayTotals: true,
        wouldSeedTransactions: transactions.length,
        businessDays: plan.businessDays,
        helperPreviewAt: plan.helperPreviewAt
      };
    }

    await database.run('BEGIN IMMEDIATE TRANSACTION');
    try {
      await database.run('DELETE FROM staff_payments');
      await database.run(
        `UPDATE staff
         SET total_fees_earned = 0,
             total_fees_paid = 0,
             last_payment_date = NULL,
             last_payment_amount = NULL,
             last_payment_type = NULL`
      );
      await database.run('DELETE FROM transactions WHERE customer_contact = ?', [SEED_MARKER]);
      await database.run('DELETE FROM today_staff_audit_log WHERE details LIKE ?', [`%${SEED_MARKER}%`]);
      await database.run('DELETE FROM today_staff WHERE removed_reason = ?', [SEED_MARKER]);
      await database.run(
        `DELETE FROM today_staff_planning
         WHERE business_day IN (?, ?, ?, ?)`,
        [...plan.businessDays, plan.baseBusinessDay]
      );

      for (const businessDay of [...plan.businessDays, plan.baseBusinessDay]) {
        await database.run(
          `INSERT INTO business_days (business_day, status)
           VALUES (?, ?)
           ON CONFLICT(business_day) DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP`,
          [businessDay, businessDay === plan.baseBusinessDay ? 'open' : 'reset']
        );
      }

      for (const tx of transactions) {
        await database.run(
          `INSERT INTO transactions (
             transaction_id, timestamp, date, business_day, masseuse_name, service_type,
             location, duration, payment_amount, payment_method, masseuse_fee,
             start_time, end_time, customer_contact, status
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.transaction_id,
            tx.timestamp,
            tx.date,
            tx.business_day,
            tx.masseuse_name,
            tx.service_type,
            tx.location,
            tx.duration,
            tx.payment_amount,
            tx.payment_method,
            tx.masseuse_fee,
            tx.start_time,
            tx.end_time,
            tx.customer_contact,
            tx.status
          ]
        );
      }

      await database.run('COMMIT');
    } catch (error) {
      await database.run('ROLLBACK').catch(() => {});
      throw error;
    }

    const afterStaff = await database.get('SELECT COUNT(*) AS count FROM staff');
    if (afterStaff.count !== beforeStaff.count) {
      throw new Error(`Staff count changed from ${beforeStaff.count} to ${afterStaff.count}`);
    }

    const staffPayments = await database.get('SELECT COUNT(*) AS count FROM staff_payments');
    const paydayTotals = await database.get(
      `SELECT
         COALESCE(SUM(total_fees_earned), 0) AS earned,
         COALESCE(SUM(total_fees_paid), 0) AS paid,
         COUNT(last_payment_date) AS last_payment_dates
       FROM staff`
    );
    const seededTransactions = await database.get(
      'SELECT COUNT(*) AS count FROM transactions WHERE customer_contact = ?',
      [SEED_MARKER]
    );
    const helperPreview = await previewHelper(database, plan.baseBusinessDay);

    return {
      mode: 'apply',
      dbPath,
      staffCountBefore: beforeStaff.count,
      staffCountAfter: afterStaff.count,
      staffPaymentsCount: staffPayments.count,
      paydayTotals,
      seededTransactions: seededTransactions.count,
      businessDays: plan.businessDays,
      helperPreviewAt: plan.helperPreviewAt,
      helperPreview
    };
  } finally {
    await database.close().catch(() => {});
  }
}

module.exports = {
  SEED_MARKER,
  DEFAULT_BASE_BUSINESS_DAY,
  addDays,
  assertWorkspaceDb,
  buildSeedPlan,
  runSeed
};
