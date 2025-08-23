#!/usr/bin/env node

// Clear fake staff payment data
const db = require('./backend/models/database');

async function clearStaffPayments() {
  try {
    console.log('🔧 Connecting to database...');
    await db.connect();

    console.log('🔄 Clearing fake staff payment data...');
    const result = await db.run(`
      UPDATE staff_roster 
      SET total_fees_earned = 0, 
          total_fees_paid = 0, 
          last_payment_date = NULL, 
          last_payment_amount = NULL, 
          last_payment_type = NULL 
      WHERE total_fees_earned > 0 OR total_fees_paid > 0
    `);

    console.log(`✅ Reset ${result.changes} staff records`);

    console.log('🔍 Verifying reset...');
    const staff = await db.all(`
      SELECT masseuse_name, total_fees_earned, total_fees_paid, 
             (total_fees_earned - total_fees_paid) as outstanding 
      FROM staff_roster 
      LIMIT 5
    `);

    console.log('📊 First 5 staff outstanding amounts:');
    staff.forEach((s) => {
      console.log(`- ${s.masseuse_name}: ฿${s.outstanding.toFixed(2)}`);
    });

    console.log('\n🎉 Staff payment data reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

clearStaffPayments();
