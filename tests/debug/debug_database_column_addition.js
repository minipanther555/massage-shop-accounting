#!/usr/bin/env node

/**
 * Database Column Addition Debugging Script
 * Tests all 5 hypotheses for why columns aren't being added to staff_roster
 * Uses extensive logging to trace exactly what happens during database initialization
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Test all 5 hypotheses for column addition failure
const COLUMN_ADDITION_TESTS = [
  {
    name: 'HYPOTHESIS 1: addMissingColumns() function never gets called',
    description: 'Test if the addMissingColumns function is actually invoked during initialization',
    test: async (dbPath) => {
      console.log('🔍 TESTING: Function call verification');

      // Create a modified version of database.js with logging
      const originalCode = fs.readFileSync('backend/models/database.js', 'utf8');

      // Check if addMissingColumns is called
      const hasCallToAddMissingColumns = originalCode.includes('await this.addMissingColumns()');
      console.log(`📋 Code contains call to addMissingColumns(): ${hasCallToAddMissingColumns}`);

      if (!hasCallToAddMissingColumns) {
        console.log('🚨 HYPOTHESIS 1 CONFIRMED: addMissingColumns() is never called!');
        return { confirmed: true, reason: 'Missing function call in initializeTables()' };
      }

      // Check if function is defined
      const hasFunctionDefinition = originalCode.includes('async addMissingColumns()');
      console.log(`📋 Code contains addMissingColumns() definition: ${hasFunctionDefinition}`);

      if (!hasFunctionDefinition) {
        console.log('🚨 HYPOTHESIS 1 CONFIRMED: addMissingColumns() function not defined!');
        return { confirmed: true, reason: 'Function definition missing' };
      }

      console.log('✅ Function is called and defined - hypothesis rejected');
      return { confirmed: false, reason: 'Function call and definition exist' };
    }
  },
  {
    name: 'HYPOTHESIS 2: ALTER TABLE commands fail silently',
    description: 'Test if ALTER TABLE commands execute but fail without proper error reporting',
    test: async (dbPath) => {
      console.log('🔍 TESTING: ALTER TABLE command execution');

      const db = new sqlite3.Database(dbPath);

      // Test each ALTER TABLE command individually
      const missingColumns = [
        { name: 'hire_date', definition: 'DATE' },
        { name: 'total_fees_earned', definition: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'total_fees_paid', definition: 'DECIMAL(10,2) DEFAULT 0' },
        { name: 'last_payment_date', definition: 'DATE' },
        { name: 'last_payment_amount', definition: 'DECIMAL(10,2)' },
        { name: 'last_payment_type', definition: 'TEXT' },
        { name: 'notes', definition: 'TEXT' }
      ];

      const results = [];

      for (const column of missingColumns) {
        try {
          console.log(`🔧 Testing ALTER TABLE for column: ${column.name}`);

          await new Promise((resolve, reject) => {
            db.run(`ALTER TABLE staff_roster ADD COLUMN ${column.name} ${column.definition}`, (err) => {
              if (err) {
                console.log(`❌ ALTER TABLE failed for ${column.name}: ${err.message}`);
                if (err.message.includes('duplicate column name')) {
                  console.log(`✅ Column ${column.name} already exists (this is good)`);
                  results.push({ column: column.name, status: 'exists', error: null });
                } else {
                  console.log(`🚨 REAL ERROR for ${column.name}: ${err.message}`);
                  results.push({ column: column.name, status: 'error', error: err.message });
                }
              } else {
                console.log(`✅ Successfully added column ${column.name}`);
                results.push({ column: column.name, status: 'added', error: null });
              }
              resolve();
            });
          });
        } catch (error) {
          console.log(`🚨 Exception during ALTER TABLE for ${column.name}: ${error.message}`);
          results.push({ column: column.name, status: 'exception', error: error.message });
        }
      }

      db.close();

      const failedColumns = results.filter((r) => r.status === 'error' || r.status === 'exception');
      if (failedColumns.length > 0) {
        console.log('🚨 HYPOTHESIS 2 CONFIRMED: ALTER TABLE commands are failing!');
        console.log('Failed columns:', failedColumns);
        return { confirmed: true, reason: 'ALTER TABLE commands failing', details: failedColumns };
      }

      console.log('✅ All ALTER TABLE commands work - hypothesis rejected');
      return { confirmed: false, reason: 'ALTER TABLE commands succeed', details: results };
    }
  },
  {
    name: 'HYPOTHESIS 3: Database connection fails before column addition',
    description: 'Test if database connection is working when ALTER TABLE should run',
    test: async (dbPath) => {
      console.log('🔍 TESTING: Database connection during initialization');

      try {
        console.log(`📋 Testing connection to database: ${dbPath}`);

        // Check if database file exists
        const dbExists = fs.existsSync(dbPath);
        console.log(`📋 Database file exists: ${dbExists}`);

        if (!dbExists) {
          console.log('🚨 HYPOTHESIS 3 CONFIRMED: Database file does not exist!');
          return { confirmed: true, reason: 'Database file missing' };
        }

        // Test basic connection
        const db = new sqlite3.Database(dbPath);

        await new Promise((resolve, reject) => {
          db.get('SELECT 1 as test', (err, row) => {
            if (err) {
              console.log(`🚨 HYPOTHESIS 3 CONFIRMED: Database connection failed: ${err.message}`);
              reject(err);
            } else {
              console.log(`✅ Database connection successful: ${JSON.stringify(row)}`);
              resolve(row);
            }
          });
        });

        // Test staff_roster table exists
        await new Promise((resolve, reject) => {
          db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='staff_roster'", (err, row) => {
            if (err) {
              console.log(`🚨 Database query failed: ${err.message}`);
              reject(err);
            } else if (!row) {
              console.log('🚨 HYPOTHESIS 3 CONFIRMED: staff_roster table does not exist!');
              reject(new Error('staff_roster table missing'));
            } else {
              console.log('✅ staff_roster table exists');
              resolve(row);
            }
          });
        });

        db.close();

        console.log('✅ Database connection works - hypothesis rejected');
        return { confirmed: false, reason: 'Database connection successful' };
      } catch (error) {
        console.log(`🚨 HYPOTHESIS 3 CONFIRMED: Database connection issue: ${error.message}`);
        return { confirmed: true, reason: 'Database connection failed', error: error.message };
      }
    }
  },
  {
    name: 'HYPOTHESIS 4: Column addition succeeds but UPDATE statements fail',
    description: 'Test if columns are added but default value updates fail',
    test: async (dbPath) => {
      console.log('🔍 TESTING: UPDATE statement execution after column addition');

      const db = new sqlite3.Database(dbPath);

      try {
        // First check current schema
        console.log('📋 Checking current staff_roster schema...');
        const schema = await new Promise((resolve, reject) => {
          db.all('PRAGMA table_info(staff_roster)', (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          });
        });

        console.log('📋 Current columns in staff_roster:');
        schema.forEach((col) => {
          console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.dflt_value ? `DEFAULT ${col.dflt_value}` : ''}`);
        });

        // Check if target columns exist
        const targetColumns = ['hire_date', 'total_fees_earned', 'total_fees_paid', 'last_payment_date', 'last_payment_amount', 'last_payment_type', 'notes'];
        const existingColumns = schema.map((col) => col.name);
        const missingColumns = targetColumns.filter((col) => !existingColumns.includes(col));

        console.log(`📋 Missing columns: ${missingColumns.join(', ') || 'NONE'}`);

        if (missingColumns.length > 0) {
          console.log('🚨 HYPOTHESIS 4 REJECTED: Columns are missing entirely (not an UPDATE issue)');
          return { confirmed: false, reason: 'Columns not added yet', missing: missingColumns };
        }

        // Test UPDATE statements
        console.log('🔧 Testing UPDATE statements...');

        const updateQueries = [
          'UPDATE staff_roster SET total_fees_earned = 0 WHERE total_fees_earned IS NULL',
          'UPDATE staff_roster SET total_fees_paid = 0 WHERE total_fees_paid IS NULL'
        ];

        for (const query of updateQueries) {
          try {
            console.log(`🔧 Testing: ${query}`);
            const result = await new Promise((resolve, reject) => {
              db.run(query, function (err) {
                if (err) reject(err);
                else resolve({ changes: this.changes });
              });
            });
            console.log(`✅ UPDATE successful: ${result.changes} rows affected`);
          } catch (error) {
            console.log(`🚨 HYPOTHESIS 4 CONFIRMED: UPDATE failed: ${error.message}`);
            return { confirmed: true, reason: 'UPDATE statement failed', error: error.message };
          }
        }

        console.log('✅ All UPDATE statements work - hypothesis rejected');
        return { confirmed: false, reason: 'UPDATE statements succeed' };
      } catch (error) {
        console.log(`🚨 Error during UPDATE testing: ${error.message}`);
        return { confirmed: true, reason: 'UPDATE testing failed', error: error.message };
      } finally {
        db.close();
      }
    }
  },
  {
    name: 'HYPOTHESIS 5: Server uses different database file',
    description: 'Test if columns are added to one DB but app reads from another',
    test: async (dbPath) => {
      console.log('🔍 TESTING: Database file location verification');

      // Check multiple potential database locations
      const potentialPaths = [
        '/opt/massage-shop/backend/data/massage_shop.db',
        '/opt/massage-shop/data/massage_shop.db',
        './data/massage_shop.db',
        './backend/data/massage_shop.db'
      ];

      console.log('📋 Checking all potential database file locations...');

      const foundDatabases = [];

      for (const testPath of potentialPaths) {
        try {
          if (fs.existsSync(testPath)) {
            console.log(`✅ Database found at: ${testPath}`);

            // Check schema of this database
            const db = new sqlite3.Database(testPath);
            const schema = await new Promise((resolve, reject) => {
              db.all('PRAGMA table_info(staff_roster)', (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
              });
            });
            db.close();

            const columnNames = schema.map((col) => col.name);
            const hasTargetColumns = ['hire_date', 'total_fees_earned', 'total_fees_paid'].every((col) => columnNames.includes(col));

            foundDatabases.push({
              path: testPath,
              hasTargetColumns,
              columnCount: columnNames.length,
              columns: columnNames
            });

            console.log(`📋 ${testPath}: ${columnNames.length} columns, has target columns: ${hasTargetColumns}`);
          } else {
            console.log(`❌ No database at: ${testPath}`);
          }
        } catch (error) {
          console.log(`❌ Error checking ${testPath}: ${error.message}`);
        }
      }

      console.log(`📋 Found ${foundDatabases.length} database files`);

      if (foundDatabases.length > 1) {
        console.log('🚨 HYPOTHESIS 5 CONFIRMED: Multiple database files found!');

        const withTargetCols = foundDatabases.filter((db) => db.hasTargetColumns);
        const withoutTargetCols = foundDatabases.filter((db) => !db.hasTargetColumns);

        console.log(`📊 Databases WITH target columns: ${withTargetCols.length}`);
        console.log(`📊 Databases WITHOUT target columns: ${withoutTargetCols.length}`);

        if (withTargetCols.length > 0 && withoutTargetCols.length > 0) {
          console.log('🔍 This explains the issue: Columns added to one DB, app reads from another!');
          return {
            confirmed: true,
            reason: 'Multiple database files with different schemas',
            databases: foundDatabases
          };
        }
      }

      console.log('✅ No multiple database issue found - hypothesis rejected');
      return { confirmed: false, reason: 'Single database or consistent schemas', databases: foundDatabases };
    }
  }
];

async function runHypothesisTest(test, dbPath) {
  try {
    console.log(`\n${test.name}`);
    console.log(`${test.description}`);
    console.log('='.repeat(test.name.length));

    const result = await test.test(dbPath);

    if (result.confirmed) {
      console.log(`🎯 HYPOTHESIS CONFIRMED: ${result.reason}`);
      if (result.details) console.log('📊 Details:', result.details);
      if (result.error) console.log('❌ Error:', result.error);
    } else {
      console.log(`❌ Hypothesis rejected: ${result.reason}`);
    }

    return result;
  } catch (error) {
    console.log(`🚨 Test failed with exception: ${error.message}`);
    return { confirmed: true, reason: 'Test exception', error: error.message };
  }
}

async function debugColumnAddition() {
  console.log('🚀 DATABASE COLUMN ADDITION DEBUGGING');
  console.log('=====================================');
  console.log('Testing all 5 hypotheses for why columns are not being added to staff_roster\n');

  // Use the same database path as the server
  const dbPath = '/opt/massage-shop/backend/data/massage_shop.db';
  console.log(`📋 Target database: ${dbPath}\n`);

  const results = [];

  for (const test of COLUMN_ADDITION_TESTS) {
    const result = await runHypothesisTest(test, dbPath);
    results.push({ test: test.name, result });

    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Final analysis
  console.log('\n\n📊 FINAL ANALYSIS');
  console.log('==================');

  const confirmedHypotheses = results.filter((r) => r.result.confirmed);

  if (confirmedHypotheses.length > 0) {
    console.log('🎯 ROOT CAUSE IDENTIFIED:');
    confirmedHypotheses.forEach((result, index) => {
      console.log(`${index + 1}. ${result.test}`);
      console.log(`   Reason: ${result.result.reason}`);
    });

    console.log('\n🔧 RECOMMENDED FIXES:');
    confirmedHypotheses.forEach((result, index) => {
      if (result.test.includes('HYPOTHESIS 1')) {
        console.log('1. Add the missing function call to initializeTables()');
      } else if (result.test.includes('HYPOTHESIS 2')) {
        console.log('2. Fix the ALTER TABLE command syntax or error handling');
      } else if (result.test.includes('HYPOTHESIS 3')) {
        console.log('3. Fix database connection or file path issues');
      } else if (result.test.includes('HYPOTHESIS 4')) {
        console.log('4. Fix the UPDATE statement syntax');
      } else if (result.test.includes('HYPOTHESIS 5')) {
        console.log('5. Consolidate to single database file or fix path configuration');
      }
    });
  } else {
    console.log('❓ No hypotheses confirmed - the issue may be elsewhere');
    console.log('🔍 Consider additional debugging or different hypothesis');
  }
}

// Run the debugging
debugColumnAddition().catch(console.error);
