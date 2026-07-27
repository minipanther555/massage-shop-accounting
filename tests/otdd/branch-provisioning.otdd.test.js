const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const sqlite3 = require('sqlite3').verbose();

// Permanent guardrails for the two branch-provisioning commands.
//
// bootstrap-branch-database.js creates an EMPTY branch (covered by
// __tests__/branch-database-routing.otdd.test.js). These tests cover the two
// commands added for the 2026-07-27 chain-wide provisioning pass:
//   adopt-source-as-branch.js  — claim an existing trading history for a branch
//   sync-branch-catalog.js     — bring every branch to the exhaustive catalog
//
// The failure these exist to prevent: a branch opening with the wrong shop's
// staff or transactions in its books, or a branch silently losing money because
// a catalog sync overwrote a price.

const ADOPT = path.join(__dirname, '..', '..', 'backend', 'scripts', 'adopt-source-as-branch.js');
const SYNC = path.join(__dirname, '..', '..', 'backend', 'scripts', 'sync-branch-catalog.js');

function run(script, args, dbPath) {
  return execFileSync(process.execPath, [script, ...args], {
    env: { ...process.env, DB_PATH: dbPath },
    encoding: 'utf8'
  });
}

function openDb(filePath) {
  const db = new sqlite3.Database(filePath);
  return {
    run: (sql, params = []) => new Promise((resolve, reject) => {
      db.run(sql, params, (error) => (error ? reject(error) : resolve()));
    }),
    all: (sql, params = []) => new Promise((resolve, reject) => {
      db.all(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
    }),
    close: () => new Promise((resolve) => db.close(resolve))
  };
}

describe('branch provisioning OTDD guardrails', () => {
  let tempDirectory;
  let sourcePath;

  beforeEach(async () => {
    tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'massage-provision-'));
    sourcePath = path.join(tempDirectory, 'massage_shop.db');

    const db = openDb(sourcePath);
    await db.run(`CREATE TABLE staff (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
      active BOOLEAN DEFAULT TRUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await db.run('CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, transaction_id TEXT, masseuse_name TEXT)');
    await db.run('CREATE TABLE staff_roster (id INTEGER PRIMARY KEY AUTOINCREMENT, position INTEGER, masseuse_name TEXT)');
    await db.run('CREATE TABLE bookings (id INTEGER PRIMARY KEY AUTOINCREMENT, requested_masseuse_name TEXT)');
    await db.run('CREATE TABLE staff_payments (id INTEGER PRIMARY KEY AUTOINCREMENT, masseuse_name TEXT)');
    await db.run('CREATE TABLE today_staff (id INTEGER PRIMARY KEY AUTOINCREMENT, business_day DATE, display_name TEXT)');
    await db.run('CREATE TABLE today_staff_planning (id INTEGER PRIMARY KEY AUTOINCREMENT, business_day DATE)');
    await db.run('CREATE TABLE today_staff_audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, business_day DATE)');
    await db.run('CREATE TABLE locations (id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, active BOOLEAN DEFAULT TRUE)');
    await db.run('CREATE TABLE payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)');
    await db.run(`CREATE TABLE services (id INTEGER PRIMARY KEY AUTOINCREMENT, service_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL, location TEXT NOT NULL, price DECIMAL(10,2) NOT NULL,
      masseuse_fee DECIMAL(10,2) NOT NULL, active BOOLEAN DEFAULT TRUE, location_id INTEGER DEFAULT 1,
      UNIQUE(service_name, duration_minutes, location))`);

    // Two founding staff, plus one belonging to a different branch that was set
    // up inside this database on a known date.
    await db.run("INSERT INTO staff (name, created_at) VALUES ('Founding A', '2025-08-18 09:00:00')");
    await db.run("INSERT INTO staff (name, created_at) VALUES ('Founding B', '2025-09-03 09:00:00')");
    await db.run("INSERT INTO staff (name, created_at) VALUES ('Other Branch', '2026-07-21 09:00:00')");

    await db.run("INSERT INTO transactions (transaction_id, masseuse_name) VALUES ('TX-OURS', 'Founding A')");
    await db.run("INSERT INTO transactions (transaction_id, masseuse_name) VALUES ('TX-THEIRS', 'Other Branch')");
    await db.run("INSERT INTO staff_roster (position, masseuse_name) VALUES (1, 'Founding A')");
    await db.run("INSERT INTO staff_roster (position, masseuse_name) VALUES (2, 'Other Branch')");
    await db.run("INSERT INTO today_staff (business_day, display_name) VALUES ('2026-07-21', 'Other Branch')");
    await db.run("INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee) VALUES ('Thai', 60, 'In-Shop', 400, 120)");
    await db.close();
  });

  afterEach(() => {
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  });

  describe('adopt-source-as-branch', () => {
    it('preserves the founding shop staff and history it is adopting', async () => {
      run(ADOPT, ['49', '--exclude-staff-created-on=2026-07-21'], sourcePath);

      const db = openDb(path.join(tempDirectory, 'massage_shop.branch-49.db'));
      const staff = await db.all('SELECT name FROM staff ORDER BY name');
      const transactions = await db.all('SELECT transaction_id FROM transactions');
      expect(staff.map((r) => r.name)).toEqual(['Founding A', 'Founding B']);
      expect(transactions.map((r) => r.transaction_id)).toEqual(['TX-OURS']);
      await db.close();
    });

    it('removes every row belonging to the excluded branch, not just the staff row', async () => {
      run(ADOPT, ['49', '--exclude-staff-created-on=2026-07-21'], sourcePath);

      const db = openDb(path.join(tempDirectory, 'massage_shop.branch-49.db'));
      expect(await db.all("SELECT * FROM transactions WHERE masseuse_name = 'Other Branch'")).toEqual([]);
      expect(await db.all("SELECT * FROM staff_roster WHERE masseuse_name = 'Other Branch'")).toEqual([]);
      expect(await db.all('SELECT * FROM today_staff')).toEqual([]);
      await db.close();
    });

    it('records the branch in locations so the shop is identifiable in its own database', async () => {
      run(ADOPT, ['49', '--exclude-staff-created-on=2026-07-21'], sourcePath);

      const db = openDb(path.join(tempDirectory, 'massage_shop.branch-49.db'));
      expect(await db.all('SELECT name FROM locations WHERE id = 49')).toEqual([{ name: 'Top Thai 49' }]);
      await db.close();
    });

    it('never modifies the source database', async () => {
      run(ADOPT, ['49', '--exclude-staff-created-on=2026-07-21'], sourcePath);

      const db = openDb(sourcePath);
      expect((await db.all('SELECT COUNT(*) AS c FROM staff'))[0].c).toBe(3);
      expect((await db.all('SELECT COUNT(*) AS c FROM transactions'))[0].c).toBe(2);
      await db.close();
    });

    it('refuses to overwrite an existing branch database without --replace', () => {
      run(ADOPT, ['49', '--exclude-staff-created-on=2026-07-21'], sourcePath);
      expect(() => run(ADOPT, ['49'], sourcePath)).toThrow();
    });
  });

  describe('sync-branch-catalog', () => {
    async function seedBranch(locationId, services) {
      const branchPath = path.join(tempDirectory, `massage_shop.branch-${locationId}.db`);
      fs.copyFileSync(sourcePath, branchPath);
      const db = openDb(branchPath);
      await db.run('DELETE FROM staff');
      await db.run('DELETE FROM transactions');
      for (const s of services) {
        await db.run(
          'INSERT OR IGNORE INTO services (service_name, duration_minutes, location, price, masseuse_fee) VALUES (?, ?, ?, ?, ?)',
          s
        );
      }
      await db.close();
      return branchPath;
    }

    it('gives every branch the exhaustive union of services offered anywhere', async () => {
      const a = await seedBranch(43, [['Tiger Balm', 90, 'In-Shop', 800, 225]]);
      const b = await seedBranch(9, [['Foot Spa', 30, 'In-Shop', 500, 150]]);

      run(SYNC, ['--apply'], sourcePath);

      for (const file of [a, b]) {
        const db = openDb(file);
        const names = (await db.all('SELECT service_name FROM services ORDER BY service_name')).map((r) => r.service_name);
        expect(names).toEqual(['Foot Spa', 'Thai', 'Tiger Balm']);
        await db.close();
      }
    });

    it('never changes the price or commission of a service a branch already has', async () => {
      const branchPath = await seedBranch(43, []);
      const db = openDb(branchPath);
      await db.run("UPDATE services SET price = 999, masseuse_fee = 333 WHERE service_name = 'Thai'");
      await db.close();

      run(SYNC, ['--apply'], sourcePath);

      const after = openDb(branchPath);
      const row = (await after.all("SELECT price, masseuse_fee FROM services WHERE service_name = 'Thai'"))[0];
      expect(Number(row.price)).toBe(999);
      expect(Number(row.masseuse_fee)).toBe(333);
      await after.close();
    });

    it('skips rather than guesses when two branches price the same service differently', async () => {
      await seedBranch(43, [['Oil', 60, 'In-Shop', 600, 180]]);
      await seedBranch(9, [['Oil', 60, 'In-Shop', 700, 210]]);

      const output = run(SYNC, ['--apply'], sourcePath);
      const report = JSON.parse(output);

      expect(report.conflicts.length).toBeGreaterThan(0);
      const inserted = report.branches.flatMap((br) => br.missing);
      expect(inserted.join(' ')).not.toContain('Oil');
    });

    it('never writes to a dated backup file that happens to sit beside the branch databases', async () => {
      await seedBranch(43, [['Tiger Balm', 90, 'In-Shop', 800, 225]]);
      const backupPath = path.join(tempDirectory, 'massage_shop.branch-43.pre-pte-20260723-182830.db');
      fs.copyFileSync(sourcePath, backupPath);
      const before = fs.statSync(backupPath).size;

      const report = JSON.parse(run(SYNC, ['--apply'], sourcePath));

      expect(report.branches.map((b) => b.locationId)).toEqual([43]);
      expect(fs.statSync(backupPath).size).toBe(before);
    });

    it('leaves the source database untouched — it is the archive, not a branch', async () => {
      await seedBranch(43, [['Tiger Balm', 90, 'In-Shop', 800, 225]]);

      run(SYNC, ['--apply'], sourcePath);

      const db = openDb(sourcePath);
      const names = (await db.all('SELECT service_name FROM services')).map((r) => r.service_name);
      expect(names).toEqual(['Thai']);
      await db.close();
    });
  });
});
