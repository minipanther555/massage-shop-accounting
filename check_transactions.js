const db = require('./backend/models/database');

async function checkTransactions() {
  try {
    console.log('🔧 Connecting to database...');
    await db.connect();

    console.log('\n🔍 Checking transactions table...');

    // Check total count
    const totalCount = await db.get('SELECT COUNT(*) as count FROM transactions');
    console.log(`📊 Total transactions: ${totalCount.count}`);

    // Check by status
    const byStatus = await db.all(`
      SELECT status, COUNT(*) as count, SUM(masseuse_fee) as total_fees
      FROM transactions 
      GROUP BY status
    `);
    console.log('\n📊 Transactions by status:');
    byStatus.forEach((row) => {
      console.log(`- ${row.status}: ${row.count} transactions, ฿${(row.total_fees || 0).toFixed(2)} total fees`);
    });

    // Check for any transactions with fees > 0
    const withFees = await db.all(`
      SELECT status, masseuse_name, masseuse_fee, timestamp, date(timestamp/1000, 'unixepoch') as date
      FROM transactions 
      WHERE masseuse_fee > 0
      ORDER BY timestamp DESC
      LIMIT 10
    `);

    if (withFees.length > 0) {
      console.log('\n💰 Transactions with fees > 0:');
      withFees.forEach((t) => {
        console.log(`- ${t.masseuse_name}: ฿${t.masseuse_fee.toFixed(2)} on ${t.date} (${t.status})`);
      });
    } else {
      console.log('\n✅ No transactions with fees > 0 found');
    }

    // Check what the admin endpoint is actually seeing
    console.log('\n🔍 Simulating admin endpoint query...');
    const adminQuery = await db.all(`
      SELECT 
        sr.masseuse_name,
        sr.total_fees_earned,
        sr.total_fees_paid,
        (sr.total_fees_earned - sr.total_fees_paid) as outstanding_balance,
        (SELECT COALESCE(SUM(t.masseuse_fee), 0) FROM transactions t 
         WHERE t.masseuse_name = sr.masseuse_name 
         AND date(t.timestamp/1000, 'unixepoch') >= date('now', 'weekday 1', '-6 days')
         AND t.status = 'ACTIVE') as this_week_fees
      FROM staff_roster sr 
      WHERE sr.masseuse_name IS NOT NULL AND sr.masseuse_name != ''
      ORDER BY outstanding_balance DESC
      LIMIT 5
    `);

    console.log('\n📊 Admin endpoint would see:');
    adminQuery.forEach((s) => {
      console.log(`- ${s.masseuse_name}: earned=${s.total_fees_earned}, paid=${s.total_fees_paid}, outstanding=${s.outstanding_balance}, this_week=${s.this_week_fees}`);
    });

    console.log('\n🎯 CONCLUSION:');
    if (totalCount.count === 0) {
      console.log('✅ No transactions exist - the fake data must be coming from somewhere else');
    } else {
      console.log('🔍 Transactions exist but may not be the source of fake data');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

checkTransactions();
