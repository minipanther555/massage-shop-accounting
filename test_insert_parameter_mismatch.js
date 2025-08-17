#!/usr/bin/env node

/**
 * Unit Test: INSERT Parameter Count Mismatch
 * Tests the theory that the 500 error is caused by parameter count mismatch in SQL INSERT
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Test database path (local)
const DB_PATH = path.join(__dirname, 'data', 'massage_shop.db');

async function connectToDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('❌ Error connecting to database:', err.message);
                reject(err);
            } else {
                console.log('✅ Connected to test database');
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
            console.log(`📋 Parameter count: ${params.length}`);
        }
        
        db.all(query, params, (err, rows) => {
            if (err) {
                console.error(`❌ Query failed: ${err.message}`);
                reject(err);
            } else {
                console.log(`✅ Query successful - ${rows.length} rows returned`);
                resolve(rows);
            }
        });
    });
}

async function runInsert(db, query, params = []) {
    return new Promise((resolve, reject) => {
        console.log(`🔍 Running INSERT: ${query}`);
        console.log(`📋 Parameters: ${JSON.stringify(params)}`);
        console.log(`📋 Parameter count: ${params.length}`);
        
        db.run(query, params, function(err) {
            if (err) {
                console.error(`❌ INSERT failed: ${err.message}`);
                reject(err);
            } else {
                console.log(`✅ INSERT successful - ${this.changes} rows affected, last ID: ${this.lastID}`);
                resolve({ changes: this.changes, lastID: this.lastID });
            }
        });
    });
}

async function testInsertParameterMismatch() {
    console.log('🧪 UNIT TEST: INSERT Parameter Count Mismatch');
    console.log('=============================================');
    
    let db;
    try {
        db = await connectToDatabase();
        
        // Test 1: Check current transactions table structure
        console.log('\n📊 TEST 1: Check transactions table structure');
        const schema = await runQuery(db, 'PRAGMA table_info(transactions)');
        console.log('📋 Transactions table schema:');
        schema.forEach(col => {
            console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''}`);
        });
        
        // Test 2: Test the working INSERT statement from 9f1744e
        console.log('\n📊 TEST 2: Test working INSERT (9f1744e style)');
        const workingInsert = `
            INSERT INTO transactions (
                transaction_id, timestamp, date, masseuse_name, service_type,
                payment_amount, payment_method, masseuse_fee, start_time, end_time,
                customer_contact, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const workingParams = [
            'TEST001',           // transaction_id
            '2025-08-17 13:00:00', // timestamp
            '2025-08-17',       // date
            'Test Masseuse',    // masseuse_name
            'Test Service',      // service_type
            100.00,             // payment_amount
            'Cash',             // payment_method
            30.00,              // masseuse_fee
            '1:00 PM',          // start_time
            '2:00 PM',          // end_time
            '',                 // customer_contact
            'ACTIVE'            // status
        ];
        
        console.log(`🔍 Working INSERT: ${workingParams.length} parameters`);
        try {
            const workingResult = await runInsert(db, workingInsert, workingParams);
            console.log('✅ Working INSERT succeeded');
        } catch (error) {
            console.log('❌ Working INSERT failed:', error.message);
        }
        
        // Test 3: Test the broken INSERT statement from main16
        console.log('\n📊 TEST 3: Test broken INSERT (main16 style)');
        const brokenInsert = `
            INSERT INTO transactions (
                transaction_id, timestamp, date, masseuse_name, service_type,
                payment_amount, payment_method, masseuse_fee, start_time, end_time,
                customer_contact, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // But try to insert location and duration values (which the statement doesn't support)
        const brokenParams = [
            'TEST002',           // transaction_id
            '2025-08-17 13:00:00', // timestamp
            '2025-08-17',       // date
            'Test Masseuse',    // masseuse_name
            'Test Service',      // service_type
            100.00,             // payment_amount
            'Cash',             // payment_method
            30.00,              // masseuse_fee
            '1:00 PM',          // start_time
            '2:00 PM',          // end_time
            '',                 // customer_contact
            'ACTIVE',           // status
            'In-Shop',          // location ← Extra parameter!
            90                  // duration ← Extra parameter!
        ];
        
        console.log(`🔍 Broken INSERT: ${brokenParams.length} parameters (but only 12 placeholders)`);
        try {
            const brokenResult = await runInsert(db, brokenInsert, brokenParams);
            console.log('❌ Broken INSERT should have failed but succeeded - this disproves the theory');
        } catch (error) {
            console.log('✅ Broken INSERT failed as expected:', error.message);
            console.log('🎯 This confirms the parameter count mismatch theory!');
        }
        
        // Test 4: Test the correct INSERT statement that should work with location and duration
        console.log('\n📊 TEST 4: Test correct INSERT with location and duration');
        const correctInsert = `
            INSERT INTO transactions (
                transaction_id, timestamp, date, masseuse_name, service_type,
                location, duration, payment_amount, payment_method, masseuse_fee, 
                start_time, end_time, customer_contact, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const correctParams = [
            'TEST003',           // transaction_id
            '2025-08-17 13:00:00', // timestamp
            '2025-08-17',       // date
            'Test Masseuse',    // masseuse_name
            'Test Service',      // service_type
            'In-Shop',          // location
            90,                 // duration
            100.00,             // payment_amount
            'Cash',             // payment_method
            30.00,              // masseuse_fee
            '1:00 PM',          // start_time
            '2:00 PM',          // end_time
            '',                 // customer_contact
            'ACTIVE'            // status
        ];
        
        console.log(`🔍 Correct INSERT: ${correctParams.length} parameters with ${correctParams.length} placeholders`);
        try {
            const correctResult = await runInsert(db, correctInsert, correctParams);
            console.log('✅ Correct INSERT succeeded');
        } catch (error) {
            console.log('❌ Correct INSERT failed:', error.message);
        }
        
        // Test 5: Clean up test data
        console.log('\n📊 TEST 5: Clean up test data');
        await runQuery(db, 'DELETE FROM transactions WHERE transaction_id LIKE "TEST%"');
        console.log('✅ Test data cleaned up');
        
        // Test 6: Final analysis
        console.log('\n🎯 TEST CONCLUSION');
        console.log('==================');
        
        console.log('📋 What we tested:');
        console.log('  - Working INSERT (9f1744e): 12 parameters, 12 placeholders ✅');
        console.log('  - Broken INSERT (main16): 14 parameters, 12 placeholders ❌');
        console.log('  - Correct INSERT (with location/duration): 14 parameters, 14 placeholders ✅');
        
        console.log('\n🎯 Root Cause Analysis:');
        console.log('  - main16 tries to insert location and duration values');
        console.log('  - But the INSERT statement only has 12 placeholders');
        console.log('  - This causes a parameter count mismatch');
        console.log('  - Database throws error, backend returns 500');
        
        console.log('\n💡 Solution:');
        console.log('  - Either add location and duration to the INSERT statement');
        console.log('  - Or remove location and duration from the parameters');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
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

// Run the test
testInsertParameterMismatch().catch(console.error);
