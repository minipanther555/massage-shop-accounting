const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Correct path to the production database
const dbPath = path.resolve(__dirname, '..', '..', 'data', 'massage_shop.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to the production database.');
});

// List of columns to add to the staff_roster table
// Each object contains the column name, type, and a default value if needed.
const columnsToAdd = [
    { name: 'hire_date', type: 'TEXT' },
    { name: 'notes', type: 'TEXT' },
    { name: 'total_fees_earned', type: 'REAL', default: 0.0 },
    { name: 'total_fees_paid', type: 'REAL', default: 0.0 },
    { name: 'last_payment_date', type: 'TEXT' },
    { name: 'last_payment_amount', type: 'REAL' },
    { name: 'last_payment_type', type: 'TEXT' }
];

// Function to check if a column exists in a table
function columnExists(tableName, columnName, callback) {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) {
            console.error(`❌ Error getting table info for ${tableName}:`, err.message);
            return callback(err);
        }
        const exists = rows.some(row => row.name === columnName);
        callback(null, exists);
    });
}

// Function to add a single column if it doesn't exist
function addColumn(tableName, column) {
    return new Promise((resolve, reject) => {
        columnExists(tableName, column.name, (err, exists) => {
            if (err) {
                return reject(err);
            }
            if (exists) {
                console.log(`🟡 Column '${column.name}' already exists in '${tableName}'. Skipping.`);
                return resolve();
            }

            let sql = `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${column.type}`;
            if (column.default !== undefined) {
                sql += ` DEFAULT ${typeof column.default === 'string' ? `'${column.default}'` : column.default}`;
            }

            console.log(`Executing: ${sql}`);
            db.run(sql, (err) => {
                if (err) {
                    console.error(`❌ Error adding column '${column.name}':`, err.message);
                    return reject(err);
                }
                console.log(`✅ Column '${column.name}' added to '${tableName}'.`);
                resolve();
            });
        });
    });
}

// Main function to run all migrations
async function runMigrations() {
    console.log('🚀 Starting database schema migration for staff_roster...');
    try {
        for (const column of columnsToAdd) {
            await addColumn('staff_roster', column);
        }
        console.log('✅ All schema migrations completed successfully.');
    } catch (error) {
        console.error('❌ A fatal error occurred during migration:', error);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('❌ Error closing the database:', err.message);
            } else {
                console.log('🚪 Database connection closed.');
            }
        });
    }
}

// Run the migration
runMigrations();
