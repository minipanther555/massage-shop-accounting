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
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      const fs = require('fs');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

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
        status TEXT NOT NULL DEFAULT 'Available',
        today_massages INTEGER DEFAULT 0,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Service types and pricing (equivalent to Settings sheet)
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        service_name TEXT UNIQUE NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        masseuse_fee DECIMAL(10,2) NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Payment methods (equivalent to Settings sheet)
      `CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        method_name TEXT UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
        payment_amount DECIMAL(10,2) NOT NULL,
        payment_method TEXT NOT NULL,
        masseuse_fee DECIMAL(10,2) NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        customer_contact TEXT,
        status TEXT NOT NULL,
        archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Insert default data
    await this.insertDefaultData();
  }

  async insertDefaultData() {
    // Default services (from Google Sheets Settings)
    const defaultServices = [
      ['Thai 60', 250, 100],
      ['Neck and Shoulder', 150, 60],
      ['Foot', 200, 80],
      ['Oil', 400, 150]
    ];

    for (const [name, price, fee] of defaultServices) {
      await this.run(
        `INSERT OR IGNORE INTO services (service_name, price, masseuse_fee) VALUES (?, ?, ?)`,
        [name, price, fee]
      );
    }

    // Default payment methods
    const defaultPaymentMethods = ['Cash', 'Credit Card', 'Voucher'];
    for (const method of defaultPaymentMethods) {
      await this.run(
        `INSERT OR IGNORE INTO payment_methods (method_name) VALUES (?)`,
        [method]
      );
    }

    // Initialize roster positions (20 positions as per CONFIG)
    for (let i = 1; i <= 20; i++) {
      await this.run(
        `INSERT OR IGNORE INTO staff_roster (position, masseuse_name, status) VALUES (?, ?, ?)`,
        [i, '', 'Available']
      );
    }
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
