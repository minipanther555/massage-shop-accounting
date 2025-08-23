#!/usr/bin/env node

/**
 * Unit Test: Service Lookup Data Type Mismatch
 * Tests the theory that the 500 error is caused by data type issues in service lookup
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
      console.log(`📋 Parameter types: ${params.map((p) => typeof p)}`);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error(`❌ Query failed: ${err.message}`);
        reject(err);
      } else {
        console.log(`✅ Query successful - ${rows.length} rows returned`);
        if (rows.length > 0) {
          console.log('📊 Sample result:', rows[0]);
        }
        resolve(rows);
      }
    });
  });
}

async function testServiceLookupDataTypes() {
  console.log('🧪 UNIT TEST: Service Lookup Data Type Mismatch');
  console.log('================================================');

  let db;
  try {
    db = await connectToDatabase();

    // Test 1: Check what services exist in the database
    console.log('\n📊 TEST 1: Check existing services');
    const existingServices = await runQuery(db, 'SELECT service_name, duration_minutes, location, price, masseuse_fee FROM services LIMIT 5');

    if (existingServices.length === 0) {
      console.log('❌ No services found in database - cannot test lookup');
      return;
    }

    const testService = existingServices[0];
    console.log(`📋 Using test service: ${JSON.stringify(testService)}`);

    // Test 2: Test the exact query from main16 (with duration and location)
    console.log('\n📊 TEST 2: Test main16 service lookup (with duration + location)');
    const main16Query = 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND duration_minutes = ? AND location = ? AND active = true';

    // Test with correct types (as backend expects)
    console.log('\n🔍 Test 2a: Correct types (backend expectation)');
    const correctParams = [
      testService.service_name,
      parseInt(testService.duration_minutes), // Integer
      testService.location
    ];
    const correctResult = await runQuery(db, main16Query, correctParams);

    // Test with string duration (as frontend sends)
    console.log('\n🔍 Test 2b: String duration (frontend sends)');
    const stringDurationParams = [
      testService.service_name,
      testService.duration_minutes.toString(), // String
      testService.location
    ];
    const stringResult = await runQuery(db, main16Query, stringDurationParams);

    // Test 3: Test the working query from 9f1744e (service name only)
    console.log('\n📊 TEST 3: Test 9f1744e service lookup (service name only)');
    const workingQuery = 'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND active = true';
    const workingParams = [testService.service_name];
    const workingResult = await runQuery(db, workingQuery, workingParams);

    // Test 4: Test with the exact data from the debug script
    console.log('\n📊 TEST 4: Test with exact debug script data');
    const debugData = {
      service_type: 'Foot massage',
      duration: '90', // String as sent by frontend
      location: 'In-Shop'
    };

    console.log(`🔍 Debug data: ${JSON.stringify(debugData)}`);

    // Test main16 query with debug data
    const debugResult = await runQuery(db, main16Query, [
      debugData.service_type,
      parseInt(debugData.duration), // Parse to int
      debugData.location
    ]);

    // Test working query with debug data
    const debugWorkingResult = await runQuery(db, workingQuery, [debugData.service_type]);

    // Test 5: Analyze the results
    console.log('\n📊 TEST 5: Analysis of results');
    console.log('================================');

    console.log(`✅ Correct types query: ${correctResult.length} results`);
    console.log(`✅ String duration query: ${stringResult.length} results`);
    console.log(`✅ Working query (9f1744e): ${workingResult.length} results`);
    console.log(`✅ Debug data with main16 query: ${debugResult.length} results`);
    console.log(`✅ Debug data with working query: ${debugWorkingResult.length} results`);

    // Test 6: Check if the issue is in the database schema
    console.log('\n📊 TEST 6: Database schema verification');
    const schema = await runQuery(db, 'PRAGMA table_info(services)');
    console.log('📋 Services table schema:');
    schema.forEach((col) => {
      console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''}`);
    });

    // Test 7: Check if there are any services matching the debug data exactly
    console.log('\n📊 TEST 7: Check for exact debug data matches');
    const exactMatchQuery = 'SELECT * FROM services WHERE service_name = ? AND duration_minutes = ? AND location = ?';
    const exactMatches = await runQuery(db, exactMatchQuery, [
      debugData.service_type,
      parseInt(debugData.duration),
      debugData.location
    ]);

    console.log(`🔍 Exact matches for debug data: ${exactMatches.length}`);
    if (exactMatches.length > 0) {
      console.log('📋 Found services:', exactMatches);
    } else {
      console.log('❌ No exact matches found - this explains the 500 error!');

      // Check what services exist with similar names
      const similarServices = await runQuery(
        db,
        'SELECT service_name, duration_minutes, location FROM services WHERE service_name LIKE ?',
        [`%${debugData.service_type}%`]
      );
      console.log('🔍 Similar services found:', similarServices);
    }

    console.log('\n🎯 TEST CONCLUSION');
    console.log('==================');

    if (exactMatches.length === 0) {
      console.log('❌ ROOT CAUSE CONFIRMED: No service matches the exact combination');
      console.log('❌ This explains why main16 returns 500 error');
      console.log('✅ This explains why 9f1744e works (only checks service_name)');
    } else {
      console.log('✅ Services found - the issue is elsewhere');
    }
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
testServiceLookupDataTypes().catch(console.error);
