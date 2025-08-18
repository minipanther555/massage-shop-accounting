// One-time script to populate the staff table with master staff list
// Run this once to set up the initial staff data
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database - works from backend directory
const dbPath = path.join(__dirname, 'data', 'massage_shop.db');
const db = new sqlite3.Database(dbPath);

console.log('🚀 Starting staff table population...');

// Master staff list
const staffNames = [
  'สา', 'แพท', 'จิ้บ', 'Phyo พิว', 'nine นาย', 'May เมย์', 'พี่นัท', 'นา',
  'Saw ซอ', 'พี่วัน', 'พี่แจ๋ว', 'แอนนา', 'ส้ม', 'กี้', 'พี่พิมพ์', 'ไอด้าน'
];

async function populateStaffTable() {
  return new Promise((resolve, reject) => {
    // First, create the staff table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating staff table:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Staff table created/verified');
      
      // Insert staff names
      let insertedCount = 0;
      let skippedCount = 0;
      
      staffNames.forEach((name, index) => {
        const insertSQL = 'INSERT OR IGNORE INTO staff (name) VALUES (?)';
        
        db.run(insertSQL, [name], function(err) {
          if (err) {
            console.error(`❌ Error inserting ${name}:`, err);
          } else if (this.changes > 0) {
            insertedCount++;
            console.log(`✅ Inserted: ${name}`);
          } else {
            skippedCount++;
            console.log(`⏭️ Skipped (already exists): ${name}`);
          }
          
          // Check if this was the last insertion
          if (index === staffNames.length - 1) {
            console.log(`\n🎉 Staff table population complete!`);
            console.log(`📊 Inserted: ${insertedCount}, Skipped: ${skippedCount}, Total: ${staffNames.length}`);
            
            // Verify the data
            db.all('SELECT * FROM staff ORDER BY name', (err, rows) => {
              if (err) {
                console.error('❌ Error verifying data:', err);
              } else {
                console.log('\n📋 Final staff table contents:');
                rows.forEach(row => console.log(`  ${row.id}: ${row.name} (${row.active ? 'active' : 'inactive'})`));
              }
              
              db.close();
              resolve();
            });
          }
        });
      });
    });
  });
}

// Run the script
populateStaffTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
