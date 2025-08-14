#!/usr/bin/env node

// Debug script to test all 5 hypotheses about fake staff payment data
const db = require('./backend/models/database');

async function testAllHypotheses() {
  try {
    console.log('🔍 TESTING ALL 5 HYPOTHESES SIMULTANEOUSLY');
    console.log('===========================================\n');
    
    await db.connect();
    console.log('✅ Database connected successfully\n');
    
    // Hypothesis 1: Columns exist but with different names
    console.log('🔍 HYPOTHESIS 1: Columns exist but with different names');
    console.log('Checking staff_roster table structure...');
    const columns = await db.all('PRAGMA table_info(staff_roster)');
    console.log('📋 All columns in staff_roster:');
    columns.forEach(col => console.log(`- ${col.name} (${col.type})`));
    
    const hasPaymentColumns = columns.some(col => 
      col.name.includes('fees') || 
      col.name.includes('payment') || 
      col.name.includes('earned') || 
      col.name.includes('paid')
    );
    console.log(`\n🔍 Hypothesis 1 Result: Payment-related columns exist: ${hasPaymentColumns}\n`);
    
    // Hypothesis 2: Data is coming from a different table
    console.log('🔍 HYPOTHESIS 2: Data is coming from a different table');
    console.log('Checking all tables in database...');
    const tables = await db.all('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('📋 All tables:');
    tables.forEach(table => console.log(`- ${table.name}`));
    
    const hasPaymentTable = tables.some(table => 
      table.name.includes('payment') || 
      table.name.includes('staff') || 
      table.name.includes('fees')
    );
    console.log(`\n🔍 Hypothesis 2 Result: Payment-related tables exist: ${hasPaymentTable}\n`);
    
    // Hypothesis 3: Endpoint is calling a different function
    console.log('🔍 HYPOTHESIS 3: Endpoint is calling a different function');
    console.log('Checking what the current admin endpoint actually returns...');
    
    // Try to simulate what the admin endpoint does
    const staffData = await db.all(`
      SELECT 
        sr.*,
        (sr.total_fees_earned - sr.total_fees_paid) as outstanding_balance
      FROM staff_roster sr 
      WHERE sr.masseuse_name IS NOT NULL AND sr.masseuse_name != ''
      LIMIT 3
    `);
    
    console.log('📊 Raw staff data from admin endpoint query:');
    staffData.forEach(staff => {
      console.log(`- ${staff.masseuse_name}:`);
      console.log(`  * total_fees_earned: ${staff.total_fees_earned}`);
      console.log(`  * total_fees_paid: ${staff.total_fees_paid}`);
      console.log(`  * outstanding_balance: ${staff.outstanding_balance}`);
    });
    
    console.log(`\n🔍 Hypothesis 3 Result: Query runs without errors: ${staffData.length > 0}\n`);
    
    // Hypothesis 4: Different version of admin endpoint running
    console.log('🔍 HYPOTHESIS 4: Different version of admin endpoint running');
    console.log('Checking if there are multiple admin route files...');
    
    // Check if the admin endpoint is actually working
    const adminRoutes = await db.all('SELECT name FROM sqlite_master WHERE type="table" AND name LIKE "%admin%"');
    console.log('📋 Admin-related tables:', adminRoutes.map(t => t.name).join(', ') || 'None');
    
    console.log(`\n🔍 Hypothesis 4 Result: Admin tables exist: ${adminRoutes.length > 0}\n`);
    
    // Hypothesis 5: Data is cached or calculated from other sources
    console.log('🔍 HYPOTHESIS 5: Data is cached or calculated from other sources');
    console.log('Checking if there are transactions or other data sources...');
    
    const transactionCount = await db.all('SELECT COUNT(*) as count FROM transactions');
    const expenseCount = await db.all('SELECT COUNT(*) as count FROM expenses');
    
    console.log(`📊 Transaction count: ${transactionCount[0].count}`);
    console.log(`📊 Expense count: ${expenseCount[0].count}`);
    
    if (transactionCount[0].count > 0) {
      const sampleTransaction = await db.all('SELECT masseuse_name, masseuse_fee FROM transactions LIMIT 1');
      console.log(`📊 Sample transaction: ${JSON.stringify(sampleTransaction[0])}`);
    }
    
    console.log(`\n🔍 Hypothesis 5 Result: Other data sources exist: ${transactionCount[0].count > 0 || expenseCount[0].count > 0}\n`);
    
    // Summary and root cause analysis
    console.log('🎯 ROOT CAUSE ANALYSIS:');
    console.log('=======================');
    
    if (hasPaymentColumns) {
      console.log('✅ Hypothesis 1 CONFIRMED: Payment columns exist with different names');
      console.log('💡 SOLUTION: Update the admin endpoint to use correct column names');
    } else if (staffData.length > 0 && staffData[0].outstanding_balance !== null) {
      console.log('✅ Hypothesis 3 CONFIRMED: Admin endpoint query works and returns data');
      console.log('💡 SOLUTION: The columns exist but may be NULL or have default values');
    } else if (transactionCount[0].count > 0) {
      console.log('✅ Hypothesis 5 CONFIRMED: Data is calculated from transaction records');
      console.log('💡 SOLUTION: Clear transaction records or update calculation logic');
    } else {
      console.log('❓ UNKNOWN: None of the hypotheses fully explain the behavior');
      console.log('💡 NEXT STEP: Check the actual running admin endpoint code');
    }
    
    console.log('\n🔍 RECOMMENDATION: Check the actual admin endpoint response in the browser');
    console.log('   Network tab -> /api/admin/staff -> Response to see exact data structure');
    
  } catch (error) {
    console.error('❌ Error during hypothesis testing:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await db.close();
    process.exit(0);
  }
}

testAllHypotheses();
