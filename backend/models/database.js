const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

class Database {
  constructor() {
    this.db = null;
    this.dbPath = process.env.DATABASE_PATH || './data/massage_shop.db';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database:', this.dbPath);
          this.initializeTables()
            .then(() => resolve())
            .catch(reject);
        }
      });
    });
  }

  async initializeTables() {
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
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Add missing columns to existing tables
    await this.addMissingColumns();

    // Insert default data
    await this.insertDefaultData();
    
  }

  async addMissingColumns() {
    try {
      console.log('Checking and adding missing columns to existing tables...');
      
      // Add missing columns to staff table (payment tracking fields)
      const staffColumns = [
        { name: 'hire_date', definition: 'DATE' },
        { name: 'total_fees_earned', definition: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'total_fees_paid', definition: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'last_payment_date', definition: 'DATE' },
        { name: 'last_payment_amount', definition: 'DECIMAL(10,2)' },
        { name: 'last_payment_type', definition: 'TEXT' },
        { name: 'notes', definition: 'TEXT' }
      ];

      // Add missing columns to transactions table
      const transactionColumns = [
        { name: 'location', definition: 'TEXT' },
        { name: 'duration', definition: 'INTEGER' }
      ];

      // Add missing columns to archived_transactions table
      const archivedTransactionColumns = [
        { name: 'location', definition: 'TEXT' },
        { name: 'duration', definition: 'INTEGER' }
      ];

      // Add payment tracking columns to staff table
      for (const column of staffColumns) {
        try {
          await this.run(`ALTER TABLE staff ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✅ Added column staff.${column.name}`);
        } catch (error) {
          if (error.message.includes('duplicate column name')) {
            console.log(`✅ Column staff.${column.name} already exists`);
          } else {
            console.error(`❌ Failed to add column staff.${column.name}:`, error.message);
          }
        }
      }

      // Add missing columns to transactions table
      for (const column of transactionColumns) {
        try {
          await this.run(`ALTER TABLE transactions ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✅ Added column transactions.${column.name}`);
        } catch (error) {
          if (error.message.includes('duplicate column name')) {
            console.log(`✅ Column transactions.${column.name} already exists`);
          } else {
            console.error(`❌ Failed to add column transactions.${column.name}:`, error.message);
          }
        }
      }

      // Add missing columns to archived_transactions table
      for (const column of archivedTransactionColumns) {
        try {
          await this.run(`ALTER TABLE archived_transactions ADD COLUMN ${column.name} ${column.definition}`);
          console.log(`✅ Added column archived_transactions.${column.name}`);
        } catch (error) {
          if (error.message.includes('duplicate column name')) {
            console.log(`✅ Column archived_transactions.${column.name} already exists`);
          } else {
            console.error(`❌ Failed to add column archived_transactions.${column.name}:`, error.message);
          }
        }
      }

      // Update existing records with default values for staff table
      await this.run(`UPDATE staff SET total_fees_earned = 0 WHERE total_fees_earned IS NULL`);
      await this.run(`UPDATE staff SET total_fees_paid = 0 WHERE total_fees_paid IS NULL`);
      
      console.log('✅ Missing columns check and update completed');
    } catch (error) {
      console.error('❌ Error adding missing columns:', error);
    }
  }

  async insertDefaultData() {
    // Skip all default data insertion - data will be inserted via external script for clean data
    console.log('Skipping default data insertion - using external script for clean data');
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
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

module.exports = new Database();
