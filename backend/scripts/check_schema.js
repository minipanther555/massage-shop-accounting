const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Correct path to the production database
const dbPath = path.resolve(__dirname, '..', '..', 'data', 'massage_shop.db');
console.log(`Checking database at: ${dbPath}`);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to the production database in read-only mode.');
});

const tableName = 'staff_roster';

db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
    if (err) {
        console.error(`❌ Error fetching schema for table '${tableName}':`, err.message);
    } else {
        console.log(`\n--- Schema for table: ${tableName} ---`);
        if (rows.length === 0) {
            console.log(`❓ Table '${tableName}' not found or has no columns.`);
        } else {
            console.table(rows);
        }
        console.log('-------------------------------------\n');
    }

    db.close((err) => {
        if (err) {
            console.error('❌ Error closing the database:', err.message);
        } else {
            console.log('🚪 Database connection closed.');
        }
    });
});
