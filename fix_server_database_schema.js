#!/usr/bin/env node

/**
 * Fix Server Database Schema
 * Adds missing columns to staff_roster and other tables on the server
 * Uses the same database connection approach as the main application
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database path (same as used by the server application)
const DB_PATH = '/opt/massage-shop/backend/data/massage_shop.db';

async function connectToDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Error connecting to database:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to server database');
                resolve(db);
            }
        });
    });
}

async function runQuery(db, query, params = []) {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Running query: ${query}`);
        if (params.length > 0) {
            console.log(`📋 Parameters: ${JSON.stringify(params)}`);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error(`❌ Query failed: ${err.message}`);
                reject(err);
            } else {
                console.log(`✅ Query successful - ${rows.length} rows affected/returned`);
                resolve(rows);
            }
        });
    });
}

async function addColumnIfNotExists(db, tableName, columnName, columnDefinition) {
    try {
        // First check if column exists
        const tableInfo = await runQuery(db, `PRAGMA table_info(${tableName})`);
        const columnExists = tableInfo.some(col => col.name === columnName);
        
        if (columnExists) {
            console.log(`✅ Column ${tableName}.${columnName} already exists`);
            return;
        }
        
        // Add the column
        console.log(`🔧 Adding column ${columnName} to ${tableName}`);
        await runQuery(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
        console.log(`✅ Successfully added ${tableName}.${columnName}`);
        
    } catch (error) {
        console.error(`❌ Failed to add column ${tableName}.${columnName}:`, error.message);
        throw error;
    }
}

async function checkCurrentSchema(db) {
    console.log('\n📊 CHECKING CURRENT SERVER DATABASE SCHEMA');
    console.log('==========================================');
    
    try {
        // Check staff_roster table structure
        console.log('\n📋 staff_roster table structure:');
        const staffSchema = await runQuery(db, 'PRAGMA table_info(staff_roster)');
        staffSchema.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });
        
        // Check if there are any staff records
        console.log('\n📊 Current staff records:');
        const staffRecords = await runQuery(db, 'SELECT id, masseuse_name, hire_date, total_fees_earned, total_fees_paid FROM staff_roster LIMIT 5');
        if (staffRecords.length > 0) {
            console.log('Sample records:');
            staffRecords.forEach(record => {
                console.log(`  - ID ${record.id}: ${record.masseuse_name}, hire_date: ${record.hire_date}, fees_earned: ${record.total_fees_earned}`);
            });
        } else {
            console.log('  No staff records found');
        }
        
    } catch (error) {
        console.error('❌ Error checking schema:', error.message);
        throw error;
    }
}

async function fixStaffRosterTable(db) {
    console.log('\n🔧 FIXING staff_roster TABLE');
    console.log('============================');
    
    try {
        // Add all missing columns to staff_roster
        await addColumnIfNotExists(db, 'staff_roster', 'hire_date', 'DATE');
        await addColumnIfNotExists(db, 'staff_roster', 'total_fees_earned', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(db, 'staff_roster', 'total_fees_paid', 'DECIMAL(10,2) DEFAULT 0');
        await addColumnIfNotExists(db, 'staff_roster', 'last_payment_date', 'DATE');
        await addColumnIfNotExists(db, 'staff_roster', 'last_payment_amount', 'DECIMAL(10,2)');
        await addColumnIfNotExists(db, 'staff_roster', 'last_payment_type', 'TEXT');
        await addColumnIfNotExists(db, 'staff_roster', 'notes', 'TEXT');
        
        console.log('✅ staff_roster table schema fixed');
        
    } catch (error) {
        console.error('❌ Error fixing staff_roster table:', error.message);
        throw error;
    }
}

async function updateExistingStaffRecords(db) {
    console.log('\n🔧 UPDATING EXISTING STAFF RECORDS');
    console.log('==================================');
    
    try {
        // Update any NULL values with defaults for existing records
        await runQuery(db, `
            UPDATE staff_roster 
            SET total_fees_earned = 0 
            WHERE total_fees_earned IS NULL
        `);
        
        await runQuery(db, `
            UPDATE staff_roster 
            SET total_fees_paid = 0 
            WHERE total_fees_paid IS NULL
        `);
        
        console.log('✅ Updated existing staff records with default values');
        
    } catch (error) {
        console.error('❌ Error updating existing records:', error.message);
        throw error;
    }
}

async function verifyFix(db) {
    console.log('\n✅ VERIFYING FIX');
    console.log('================');
    
    try {
        // Test the exact query that was failing
        console.log('🔍 Testing the staff query that was causing 500 error...');
        const staffQuery = `
            SELECT 
                sr.*,
                (sr.total_fees_earned - sr.total_fees_paid) as outstanding_balance,
                CASE 
                    WHEN sr.last_payment_date IS NULL THEN 'Never Paid'
                    WHEN JULIANDAY('now') - JULIANDAY(sr.last_payment_date) > 30 THEN 'Overdue'
                    WHEN JULIANDAY('now') - JULIANDAY(sr.last_payment_date) > 14 THEN 'Due Soon'
                    ELSE 'Current'
                END as payment_status,
                JULIANDAY('now') - JULIANDAY(sr.last_payment_date) as days_since_payment,
                COUNT(t.id) as total_transactions_today,
                COALESCE(SUM(t.service_fee), 0) as total_fees_today
            FROM staff_roster sr 
            LEFT JOIN transactions t ON sr.masseuse_name = t.masseuse_name 
                AND DATE(t.transaction_time) = DATE('now')
            GROUP BY sr.id, sr.masseuse_name
            ORDER BY sr.position
        `;
        
        const result = await runQuery(db, staffQuery);
        console.log(`✅ Staff query successful! Returned ${result.length} records`);
        
        if (result.length > 0) {
            console.log('Sample staff record:');
            const sample = result[0];
            console.log(`  - Name: ${sample.masseuse_name}`);
            console.log(`  - Hire Date: ${sample.hire_date || 'NULL'}`);
            console.log(`  - Total Fees Earned: ${sample.total_fees_earned}`);
            console.log(`  - Outstanding Balance: ${sample.outstanding_balance}`);
            console.log(`  - Payment Status: ${sample.payment_status}`);
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        throw error;
    }
}

async function fixServerDatabaseSchema() {
    console.log('🚀 SERVER DATABASE SCHEMA FIX');
    console.log('==============================');
    
    let db;
    try {
        db = await connectToDatabase();
        
        // Step 1: Check current schema
        await checkCurrentSchema(db);
        
        // Step 2: Fix staff_roster table
        await fixStaffRosterTable(db);
        
        // Step 3: Update existing records
        await updateExistingStaffRecords(db);
        
        // Step 4: Verify the fix
        await verifyFix(db);
        
        console.log('\n🎉 DATABASE SCHEMA FIX COMPLETED SUCCESSFULLY!');
        console.log('===============================================');
        console.log('✅ All missing columns added to staff_roster');
        console.log('✅ Existing records updated with default values');
        console.log('✅ Staff query verified working');
        console.log('🔧 The /api/admin/staff endpoint should now work correctly');
        
    } catch (error) {
        console.error('\n🚨 DATABASE SCHEMA FIX FAILED');
        console.error('==============================');
        console.error('Error:', error.message);
        console.error('The server database schema was not fully fixed');
        
    } finally {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

// Run the database schema fix
fixServerDatabaseSchema();
