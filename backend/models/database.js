const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const DB_PATH = require('../dbPath'); // Use the centralized path
require('dotenv').config();

class Database {
  constructor(dbPath) {
    this.db = null;
    this.dbPath = dbPath;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      console.log(' MDB_LOG: Attempting to connect to database at:', this.dbPath);
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('❌ MDB_LOG: FATAL - Error connecting to SQLite database:', err);
          reject(err);
        } else {
          console.log('✅ MDB_LOG: Connection successful.');
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async initializeTables() {
    console.log(' MDB_LOG: [Step 1] Starting table initialization...');
    const tables = [
      // Master transaction log (equivalent to Master Log sheet)
      `CREATE TABLE IF NOT EXISTS transactions (
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
        promotion_label TEXT,
        parent_transaction_id TEXT,
        add_on_kind TEXT,
        payment_status TEXT NOT NULL DEFAULT 'PAID'
      )`,

      // Staff roster (equivalent to Daily Entry roster section)
      `CREATE TABLE IF NOT EXISTS staff_roster (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        position INTEGER NOT NULL,
        masseuse_name TEXT,
        status TEXT,
        today_massages INTEGER DEFAULT 0,
        busy_until TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
        location_id INTEGER DEFAULT 1
      )`,

      // Service types and pricing with duration and location options
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        location TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        masseuse_fee DECIMAL(10,2) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(service_name, duration_minutes, location)
      )`,

      // Payment methods (equivalent to Settings sheet)
      `CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method_name TEXT UNIQUE NOT NULL,
        description TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Daily expenses (new feature from v14)
      `CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        description TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Daily summaries (equivalent to Daily Summary sheet)
      `CREATE TABLE IF NOT EXISTS daily_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE UNIQUE NOT NULL,
        total_revenue DECIMAL(10,2) NOT NULL,
        total_fees DECIMAL(10,2) NOT NULL,
        total_transactions INTEGER NOT NULL,
        total_expenses DECIMAL(10,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Archive log (equivalent to Archive Log sheet)
      `CREATE TABLE IF NOT EXISTS archived_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        original_transaction_id TEXT NOT NULL,
        transaction_id TEXT NOT NULL,
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
        status TEXT NOT NULL,
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Staff payments history
      `CREATE TABLE IF NOT EXISTS staff_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        masseuse_name TEXT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_type TEXT NOT NULL, -- 'regular' or 'advance'
        fees_period_start DATE,
        fees_period_end DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (masseuse_name) REFERENCES staff(name)
      )`,

      // Master staff list (separate from daily roster)
      `CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        hire_date DATE,
        total_fees_earned DECIMAL(10,2) DEFAULT 0,
        total_fees_paid DECIMAL(10,2) DEFAULT 0,
        last_payment_date DATE,
        last_payment_amount DECIMAL(10,2),
        last_payment_type TEXT,
        notes TEXT
      )`,

      `CREATE TABLE IF NOT EXISTS business_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_day DATE UNIQUE NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reset_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS today_staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_day DATE NOT NULL,
        staff_id INTEGER NOT NULL,
        display_name TEXT NOT NULL,
        position INTEGER NOT NULL,
        queue_status TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        removed_at DATETIME,
        removed_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )`,

      `CREATE TABLE IF NOT EXISTS today_staff_planning (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_day DATE NOT NULL,
        staff_id INTEGER NOT NULL,
        planning_status TEXT NOT NULL DEFAULT 'available_to_add',
        updated_by_user_id TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(business_day, staff_id),
        FOREIGN KEY (staff_id) REFERENCES staff(id)
      )`,

      `CREATE TABLE IF NOT EXISTS today_staff_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        business_day DATE NOT NULL,
        staff_id INTEGER,
        action TEXT NOT NULL,
        actor_user_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        scheduled_start TEXT NOT NULL,
        scheduled_end TEXT NOT NULL,
        service_type TEXT NOT NULL,
        location TEXT NOT NULL,
        duration INTEGER NOT NULL,
        requested_masseuse_name TEXT,
        customer_contact TEXT,
        status TEXT NOT NULL DEFAULT 'BOOKED',
        transaction_id TEXT,
        completed_at DATETIME,
        cancelled_at DATETIME
      )`,

      `CREATE TABLE IF NOT EXISTS booking_credits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id TEXT NOT NULL,
        transaction_id TEXT UNIQUE NOT NULL,
        masseuse_name TEXT NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 50,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reversed_at DATETIME
      )`,

      `CREATE TABLE IF NOT EXISTS time_window_promotion_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled BOOLEAN NOT NULL DEFAULT FALSE,
        start_minute INTEGER NOT NULL DEFAULT 600,
        end_minute INTEGER NOT NULL DEFAULT 1080,
        manual_override_grace_minutes INTEGER NOT NULL DEFAULT 15,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS time_window_promotion_prices (
        service_name TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        location TEXT NOT NULL,
        promotional_price DECIMAL(10,2) NOT NULL,
        PRIMARY KEY (service_name, duration_minutes, location)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
    console.log(' MDB_LOG: [Step 2] All CREATE TABLE IF NOT EXISTS statements executed.');

    // Add missing columns to existing tables
    await this.addMissingColumns();

    await this.seedBranchPromotionConfiguration();

    // Insert default data
    await this.insertDefaultData();
    console.log(' MDB_LOG: [Step 5] Finished table initialization.');
  }

  async addMissingColumns() {
    console.log(' MDB_LOG: [Step 3] Checking and adding missing columns...');

    const columnTasks = [
      // Staff table columns
      ...[
        { name: 'hire_date', definition: 'DATE' },
        { name: 'total_fees_earned', definition: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'total_fees_paid', definition: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'last_payment_date', definition: 'DATE' },
        { name: 'last_payment_amount', definition: 'DECIMAL(10,2)' },
        { name: 'last_payment_type', definition: 'TEXT' },
        { name: 'notes', definition: 'TEXT' }
      ].map(c => ({ table: 'staff', ...c })),

      // Transactions table columns
      ...[
        { name: 'location', definition: 'TEXT' },
        { name: 'duration', definition: 'INTEGER' },
        { name: 'business_day', definition: 'DATE' },
        { name: 'corrected_from_id', definition: 'TEXT' },
        { name: 'booking_id', definition: 'TEXT' },
        { name: 'start_datetime', definition: 'DATETIME' },
        { name: 'end_datetime', definition: 'DATETIME' },
        { name: 'base_price', definition: 'DECIMAL(10,2)' },
        { name: 'discount_amount', definition: 'DECIMAL(10,2) NOT NULL DEFAULT 0' },
        { name: 'promotion_type', definition: 'TEXT' },
        { name: 'promotion_label', definition: 'TEXT' },
        // Paid Time Extension (PTE-DB-001): links an add-on to the original sale,
        // types it, and tracks whether its money has arrived. Defaults keep every
        // pre-existing row reading exactly as it did before.
        { name: 'parent_transaction_id', definition: 'TEXT' },
        { name: 'add_on_kind', definition: 'TEXT' },
        { name: 'payment_status', definition: "TEXT NOT NULL DEFAULT 'PAID'" }
      ].map(c => ({ table: 'transactions', ...c })),

      // Archived transactions table columns
      ...[
        { name: 'location', definition: 'TEXT' },
        { name: 'duration', definition: 'INTEGER' }
      ].map(c => ({ table: 'archived_transactions', ...c })),

      // Expenses table columns (RIT-DB-001): a tip passes through the shop to a
      // masseuse, so an expense row needs to say whose it was and which shop day
      // it belongs to. Both nullable — every pre-existing expense row stays valid
      // and nothing is backfilled. `business_day` is the shop day from
      // getBusinessDay(), which is NOT the UTC calendar day already in `date`.
      ...[
        { name: 'masseuse_name', definition: 'TEXT' },
        { name: 'business_day', definition: 'DATE' }
      ].map(c => ({ table: 'expenses', ...c }))
    ];

    for (const task of columnTasks) {
      try {
        console.log(` MDB_LOG: Checking/adding column ${task.table}.${task.name}...`);
        await this.run(`ALTER TABLE ${task.table} ADD COLUMN ${task.name} ${task.definition}`);
        console.log(`✅ MDB_LOG: Successfully added column ${task.table}.${task.name}`);
      } catch (error) {
        if (error && error.message.includes('duplicate column name')) {
          console.log(`- MDB_LOG: Column ${task.table}.${task.name} already exists, skipping.`);
        } else {
          console.error(`❌ MDB_LOG: FATAL - Failed to add column ${task.table}.${task.name}:`, error);
          throw error; // Rethrow unexpected and fatal errors
        }
      }
    }

    // Update existing records with default values for staff table
    await this.run('UPDATE staff SET total_fees_earned = 0 WHERE total_fees_earned IS NULL');
    await this.run('UPDATE staff SET total_fees_paid = 0 WHERE total_fees_paid IS NULL');

    await this.ensureIndexes();

    console.log(' MDB_LOG: [Step 4] Missing columns check and update completed.');
  }

  async ensureIndexes() {
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_transactions_business_day_staff ON transactions (business_day, masseuse_name, status)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_recent_date_timestamp ON transactions (date, timestamp DESC, id DESC)',
      'CREATE INDEX IF NOT EXISTS idx_today_staff_business_day_position ON today_staff (business_day, position)',
      'CREATE INDEX IF NOT EXISTS idx_today_staff_business_day_staff ON today_staff (business_day, staff_id)',
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_today_staff_one_active_staff_day ON today_staff (business_day, staff_id) WHERE removed_at IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_today_staff_planning_business_day_status ON today_staff_planning (business_day, planning_status)',
      'CREATE INDEX IF NOT EXISTS idx_today_staff_planning_staff ON today_staff_planning (staff_id)',
      'CREATE INDEX IF NOT EXISTS idx_today_staff_audit_business_day ON today_staff_audit_log (business_day, staff_id, action)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_status_start ON bookings (status, scheduled_start)',
      'CREATE INDEX IF NOT EXISTS idx_bookings_staff_status_start ON bookings (requested_masseuse_name, status, scheduled_start)',
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_one_active_booking ON transactions (booking_id) WHERE booking_id IS NOT NULL AND status IN ('ACTIVE', 'CORRECTED')",
      "CREATE UNIQUE INDEX IF NOT EXISTS idx_booking_credits_one_active ON booking_credits (booking_id) WHERE status = 'ACTIVE'",
      // RIT-DB-001: day-scoped expense totals. This runs after addMissingColumns()
      // has added expenses.business_day, which is why it lives here — the
      // columnTasks applier only ever emits ALTER TABLE ... ADD COLUMN.
      'CREATE INDEX IF NOT EXISTS idx_expenses_business_day ON expenses (business_day)'
    ];

    for (const indexSql of indexes) {
      await this.run(indexSql);
    }
  }

  async seedBranchPromotionConfiguration() {
    const branchMatch = this.dbPath.match(/\.branch-(\d+)\.db$/);
    if (!branchMatch) return;

    const branchLocationId = Number(branchMatch[1]);
    const branchDefaults = {
      43: { enabled: 1, startMinute: 600, endMinute: 1440, graceMinutes: 15 },
      49: { enabled: 1, startMinute: 600, endMinute: 1080, graceMinutes: 15 }
    };
    const defaults = branchDefaults[branchLocationId] || {
      enabled: 0,
      startMinute: 600,
      endMinute: 1080,
      graceMinutes: 15
    };

    await this.run(
      `INSERT INTO time_window_promotion_settings
        (id, enabled, start_minute, end_minute, manual_override_grace_minutes, updated_at)
       VALUES (1, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO NOTHING`,
      [defaults.enabled, defaults.startMinute, defaults.endMinute, defaults.graceMinutes]
    );

    // Correct the original Top Thai 43 seed once without overwriting manager-edited values.
    if (branchLocationId === 43) {
      await this.run(
        `UPDATE time_window_promotion_settings
         SET end_minute = 1440, updated_at = CURRENT_TIMESTAMP
         WHERE id = 1
           AND enabled = 1
           AND start_minute = 600
           AND end_minute = 1080
           AND manual_override_grace_minutes = 15`
      );
    }

    if (!branchDefaults[branchLocationId]) return;

    const prices = [
      ['Thai Massage', 60, 'In-Shop', 399], ['Thai Massage', 90, 'In-Shop', 598], ['Thai Massage', 120, 'In-Shop', 798],
      ['Foot massage', 60, 'In-Shop', 399], ['Foot massage', 90, 'In-Shop', 598], ['Foot massage', 120, 'In-Shop', 798],
      ['Oil massage', 60, 'In-Shop', 599], ['Oil massage', 90, 'In-Shop', 899], ['Oil massage', 120, 'In-Shop', 1198],
      ['Aroma massage', 60, 'In-Shop', 699], ['Aroma massage', 90, 'In-Shop', 1049], ['Aroma massage', 120, 'In-Shop', 1398]
    ];
    for (const [serviceName, durationMinutes, location, promotionalPrice] of prices) {
      await this.run(
        `INSERT INTO time_window_promotion_prices (service_name, duration_minutes, location, promotional_price)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(service_name, duration_minutes, location) DO NOTHING`,
        [serviceName, durationMinutes, location, promotionalPrice]
      );
    }
  }

  async insertDefaultData() {
    // Skip all default data insertion - data will be inserted via external script for clean data
    console.log(' MDB_LOG: Skipping default data insertion as per configuration.');
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function (err) {
        if (err) {
          console.error('Database run error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          console.error('Database get error:', err);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('Database all error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('Database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

class DatabaseRouter {
  constructor() {
    this.defaultPath = DB_PATH;
    this.connections = new Map();
    this.connecting = new Map();
    this.requestContext = new AsyncLocalStorage();
  }

  getBranchPath(locationId) {
    const normalizedLocationId = Number(locationId);
    if (!Number.isInteger(normalizedLocationId) || normalizedLocationId <= 0) {
      throw new Error(`Invalid branch location id: ${locationId}`);
    }

    const extension = path.extname(this.defaultPath);
    const baseName = path.basename(this.defaultPath, extension);
    return path.join(path.dirname(this.defaultPath), `${baseName}.branch-${normalizedLocationId}${extension}`);
  }

  async getConnection(dbPath) {
    if (this.connections.has(dbPath)) {
      return this.connections.get(dbPath);
    }

    if (!this.connecting.has(dbPath)) {
      const connection = new Database(dbPath);
      const connectPromise = connection.connect()
        .then(() => {
          this.connections.set(dbPath, connection);
          this.connecting.delete(dbPath);
          return connection;
        })
        .catch((error) => {
          this.connecting.delete(dbPath);
          throw error;
        });
      this.connecting.set(dbPath, connectPromise);
    }

    return this.connecting.get(dbPath);
  }

  async connect() {
    return this.getConnection(this.defaultPath);
  }

  async runWithLocation(locationId, callback) {
    if (locationId === undefined || locationId === null) {
      return callback();
    }

    const branchPath = this.getBranchPath(locationId);
    if (!fs.existsSync(branchPath)) {
      const error = new Error(`Branch database is not provisioned for location ${locationId}`);
      error.code = 'BRANCH_DATABASE_MISSING';
      throw error;
    }

    const connection = await this.getConnection(branchPath);
    return this.requestContext.run(connection, callback);
  }

  get activeConnection() {
    return this.requestContext.getStore() || this.connections.get(this.defaultPath);
  }

  get db() {
    return this.activeConnection ? this.activeConnection.db : null;
  }

  get dbPath() {
    return this.activeConnection ? this.activeConnection.dbPath : this.defaultPath;
  }

  requireActiveConnection() {
    const connection = this.activeConnection;
    if (!connection) {
      throw new Error('Database connection is not initialized');
    }
    return connection;
  }

  run(sql, params = []) {
    return this.requireActiveConnection().run(sql, params);
  }

  get(sql, params = []) {
    return this.requireActiveConnection().get(sql, params);
  }

  all(sql, params = []) {
    return this.requireActiveConnection().all(sql, params);
  }

  async close() {
    const connections = Array.from(this.connections.values());
    this.connections.clear();
    await Promise.all(connections.map((connection) => connection.close()));
  }
}

module.exports = new DatabaseRouter();
