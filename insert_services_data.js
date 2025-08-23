// Script to insert all service data into the database
const database = require('./backend/models/database');

async function insertAllData() {
  try {
    await database.connect();
    console.log('Connected to database');

    // Drop all tables and recreate fresh
    await database.run('DROP TABLE IF EXISTS services');
    await database.run('DROP TABLE IF EXISTS payment_methods');
    await database.run('DROP TABLE IF EXISTS staff_roster');
    await database.run('DROP TABLE IF EXISTS transactions');
    await database.run('DROP TABLE IF EXISTS expenses');
    await database.run('DROP TABLE IF EXISTS daily_summaries');
    await database.run('DROP TABLE IF EXISTS archived_transactions');

    // Recreate tables fresh
    await database.run(`CREATE TABLE services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      location TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      masseuse_fee DECIMAL(10,2) NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(service_name, duration_minutes, location)
    )`);

    await database.run(`CREATE TABLE payment_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      method_name TEXT UNIQUE NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await database.run(`CREATE TABLE staff_roster (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      position INTEGER NOT NULL,
      masseuse_name TEXT,
      status TEXT,
      today_massages INTEGER DEFAULT 0,
      busy_until TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await database.run(`CREATE TABLE transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      transaction_id TEXT UNIQUE NOT NULL,
      timestamp DATETIME NOT NULL,
      date DATE NOT NULL,
      masseuse_name TEXT NOT NULL,
      service_type TEXT NOT NULL,
      payment_amount DECIMAL(10,2) NOT NULL,
      payment_method TEXT NOT NULL,
      masseuse_fee DECIMAL(10,2) NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      customer_contact TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await database.run(`CREATE TABLE expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date DATE NOT NULL,
      description TEXT NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('Recreated all tables fresh');

    // Insert staff names
    const staffNames = [
      'สา', 'แพท', 'จิ้บ', 'Phyo พิว', 'nine นาย', 'May เมย์', 'พี่นัท', 'นา',
      'Saw ซอ', 'พี่วัน', 'พี่แจ๋ว', 'แอนนา', 'ส้ม', 'กี้', 'พี่พิมพ์', 'ไอด้าน'
    ];

    for (let i = 0; i < staffNames.length; i++) {
      const status = i === 0 ? 'Next' : null; // First person is Next
      await database.run(
        'INSERT INTO staff_roster (position, masseuse_name, status, today_massages, busy_until) VALUES (?, ?, ?, ?, ?)',
        [i + 1, staffNames[i], status, 0, null]
      );
    }

    // Fill remaining positions (17-20) with empty slots
    for (let i = 17; i <= 20; i++) {
      await database.run(
        'INSERT INTO staff_roster (position, masseuse_name, status, today_massages, busy_until) VALUES (?, ?, ?, ?, ?)',
        [i, '', null, 0, null]
      );
    }

    console.log('Inserted staff names');

    // Insert services - In-Shop first
    const inShopServices = [
      // Foot massage
      ['Foot massage', 30, 'In-Shop', 350, 100],
      ['Foot massage', 60, 'In-Shop', 450, 120],
      ['Foot massage', 90, 'In-Shop', 650, 180],
      ['Foot massage', 120, 'In-Shop', 800, 240],

      // Foot massage with herbal compress
      ['Foot massage with herbal compress', 60, 'In-Shop', 650, 140],
      ['Foot massage with herbal compress', 90, 'In-Shop', 950, 210],
      ['Foot massage with herbal compress', 120, 'In-Shop', 1200, 280],

      // Thai Massage
      ['Thai Massage', 60, 'In-Shop', 450, 120],
      ['Thai Massage', 90, 'In-Shop', 650, 180],
      ['Thai Massage', 120, 'In-Shop', 800, 240],

      // Thai massage with Herbal compress
      ['Thai massage with Herbal compress', 60, 'In-Shop', 650, 140],
      ['Thai massage with Herbal compress', 90, 'In-Shop', 950, 210],
      ['Thai massage with Herbal compress', 120, 'In-Shop', 1200, 280],

      // Back, Neck & shoulder
      ['Back, Neck & shoulder', 30, 'In-Shop', 350, 100],
      ['Back, Neck & shoulder', 60, 'In-Shop', 500, 130],
      ['Back, Neck & shoulder', 90, 'In-Shop', 700, 195],
      ['Back, Neck & shoulder', 120, 'In-Shop', 900, 260],

      // Back, neck & shoulder with herbal compress
      ['Back, neck & shoulder with herbal compress', 60, 'In-Shop', 700, 150],
      ['Back, neck & shoulder with herbal compress', 90, 'In-Shop', 1000, 225],
      ['Back, neck & shoulder with herbal compress', 120, 'In-Shop', 1300, 300],

      // Oil massage
      ['Oil massage', 60, 'In-Shop', 700, 160],
      ['Oil massage', 90, 'In-Shop', 1000, 240],
      ['Oil massage', 120, 'In-Shop', 1300, 320],

      // Aroma massage
      ['Aroma massage', 60, 'In-Shop', 850, 180],
      ['Aroma massage', 90, 'In-Shop', 1250, 270],
      ['Aroma massage', 120, 'In-Shop', 1600, 360],

      // Body Scrub
      ['Body Scrub', 30, 'In-Shop', 650, 100],
      ['Body Scrub', 60, 'In-Shop', 1050, 160],

      // Body Scrub + oil massage
      ['Body Scrub + oil massage', 90, 'In-Shop', 1300, 240],
      ['Body Scrub + oil massage', 120, 'In-Shop', 1700, 320],

      // Body scrub + Aroma massage
      ['Body scrub + Aroma massage', 90, 'In-Shop', 1400, 240],
      ['Body scrub + Aroma massage', 120, 'In-Shop', 1800, 320],

      // Foot spa
      ['Foot spa', 30, 'In-Shop', 500, 100],

      // Foot + back, neck& shoulder
      ['Foot + back, neck & shoulder', 60, 'In-Shop', 600, 130],
      ['Foot + back, neck & shoulder', 90, 'In-Shop', 800, 195],
      ['Foot + back, neck & shoulder', 120, 'In-Shop', 900, 260],

      // Foot spa with foot massage
      ['Foot spa with foot massage', 90, 'In-Shop', 950, 220],
      ['Foot spa with foot massage', 120, 'In-Shop', 1100, 280],

      // Foot + Thai Massage
      ['Foot + Thai Massage', 90, 'In-Shop', 700, 180],
      ['Foot + Thai Massage', 120, 'In-Shop', 800, 240],

      // Foot + oil Massage
      ['Foot + oil Massage', 90, 'In-Shop', 1000, 220],
      ['Foot + oil Massage', 120, 'In-Shop', 1100, 280],

      // Foot + Aroma Massage
      ['Foot + Aroma Massage', 90, 'In-Shop', 1100, 220],
      ['Foot + Aroma Massage', 120, 'In-Shop', 1200, 280],

      // Coconut lovers - coconut oil massage
      ['Coconut lovers - coconut oil massage', 60, 'In-Shop', 700, 160],
      ['Coconut lovers - coconut oil massage', 90, 'In-Shop', 1000, 240],
      ['Coconut lovers - coconut oil massage', 120, 'In-Shop', 1300, 320]
    ];

    // Insert In-Shop services
    for (const [name, duration, location, price, fee] of inShopServices) {
      await database.run(
        'INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee) VALUES (?, ?, ?, ?, ?)',
        [name, duration, location, price, fee]
      );
    }

    // Home services (only 60min+, with +20% masseuse fee)
    const homeServices = [
      // Foot massage (fees: 120*1.2=144, 180*1.2=216, 240*1.2=288)
      ['Foot massage', 60, 'Home Service', 650, Math.round(120 * 1.2)],
      ['Foot massage', 90, 'Home Service', 900, Math.round(180 * 1.2)],
      ['Foot massage', 120, 'Home Service', 1200, Math.round(240 * 1.2)],

      // Foot massage with herbal compress (fees: 140*1.2=168, 210*1.2=252, 280*1.2=336)
      ['Foot massage with herbal compress', 60, 'Home Service', 850, Math.round(140 * 1.2)],
      ['Foot massage with herbal compress', 90, 'Home Service', 1200, Math.round(210 * 1.2)],
      ['Foot massage with herbal compress', 120, 'Home Service', 1600, Math.round(280 * 1.2)],

      // Thai Massage (fees: 120*1.2=144, 180*1.2=216, 240*1.2=288)
      ['Thai Massage', 60, 'Home Service', 650, Math.round(120 * 1.2)],
      ['Thai Massage', 90, 'Home Service', 900, Math.round(180 * 1.2)],
      ['Thai Massage', 120, 'Home Service', 1200, Math.round(240 * 1.2)],

      // Thai massage with Herbal compress (fees: 140*1.2=168, 210*1.2=252, 280*1.2=336)
      ['Thai massage with Herbal compress', 60, 'Home Service', 850, Math.round(140 * 1.2)],
      ['Thai massage with Herbal compress', 90, 'Home Service', 1200, Math.round(210 * 1.2)],
      ['Thai massage with Herbal compress', 120, 'Home Service', 1600, Math.round(280 * 1.2)],

      // Neck & shoulder (note: only "Neck & shoulder" for home, not "Back, Neck & shoulder")
      ['Neck & shoulder', 60, 'Home Service', 700, Math.round(130 * 1.2)],
      ['Neck & shoulder', 90, 'Home Service', 1000, Math.round(195 * 1.2)],
      ['Neck & shoulder', 120, 'Home Service', 1300, Math.round(260 * 1.2)],

      // Back, neck & shoulder with herbal compress (fees: 150*1.2=180, 225*1.2=270, 300*1.2=360)
      ['Back, neck & shoulder with herbal compress', 60, 'Home Service', 900, Math.round(150 * 1.2)],
      ['Back, neck & shoulder with herbal compress', 90, 'Home Service', 1300, Math.round(225 * 1.2)],
      ['Back, neck & shoulder with herbal compress', 120, 'Home Service', 1700, Math.round(300 * 1.2)],

      // Oil massage (fees: 160*1.2=192, 240*1.2=288, 320*1.2=384)
      ['Oil massage', 60, 'Home Service', 900, Math.round(160 * 1.2)],
      ['Oil massage', 90, 'Home Service', 1300, Math.round(240 * 1.2)],
      ['Oil massage', 120, 'Home Service', 1700, Math.round(320 * 1.2)],

      // Aroma massage (fees: 180*1.2=216, 270*1.2=324, 360*1.2=432)
      ['Aroma massage', 60, 'Home Service', 1050, Math.round(180 * 1.2)],
      ['Aroma massage', 90, 'Home Service', 1500, Math.round(270 * 1.2)],
      ['Aroma massage', 120, 'Home Service', 2000, Math.round(360 * 1.2)],

      // Body Scrub (30min: 100*1.2=120, 60min: 160*1.2=192)
      ['Body Scrub', 30, 'Home Service', 850, Math.round(100 * 1.2)],
      ['Body Scrub', 60, 'Home Service', 1200, Math.round(160 * 1.2)],

      // Body Scrub + oil massage (fees: 240*1.2=288, 320*1.2=384)
      ['Body Scrub + oil massage', 90, 'Home Service', 1500, Math.round(240 * 1.2)],
      ['Body Scrub + oil massage', 120, 'Home Service', 2000, Math.round(320 * 1.2)],

      // Body scrub + Aroma massage (fees: 240*1.2=288, 320*1.2=384)
      ['Body scrub + Aroma massage', 90, 'Home Service', 1600, Math.round(240 * 1.2)],
      ['Body scrub + Aroma massage', 120, 'Home Service', 2100, Math.round(320 * 1.2)],

      // Foot spa (fee: 100*1.2=120)
      ['Foot spa', 30, 'Home Service', 700, Math.round(100 * 1.2)],

      // Foot + back, neck & shoulder (fees: 130*1.2=156, 195*1.2=234, 260*1.2=312)
      ['Foot + back, neck & shoulder', 60, 'Home Service', 800, Math.round(130 * 1.2)],
      ['Foot + back, neck & shoulder', 90, 'Home Service', 1100, Math.round(195 * 1.2)],
      ['Foot + back, neck & shoulder', 120, 'Home Service', 1700, Math.round(260 * 1.2)],

      // Foot spa with foot massage (fees: 220*1.2=264, 280*1.2=336)
      ['Foot spa with foot massage', 90, 'Home Service', 1150, Math.round(220 * 1.2)],
      ['Foot spa with foot massage', 120, 'Home Service', 1400, Math.round(280 * 1.2)],

      // Foot + Thai Massage (fees: 180*1.2=216, 240*1.2=288)
      ['Foot + Thai Massage', 90, 'Home Service', 900, Math.round(180 * 1.2)],
      ['Foot + Thai Massage', 120, 'Home Service', 1100, Math.round(240 * 1.2)],

      // Foot + oil Massage (fees: 220*1.2=264, 280*1.2=336)
      ['Foot + oil Massage', 90, 'Home Service', 1200, Math.round(220 * 1.2)],
      ['Foot + oil Massage', 120, 'Home Service', 1400, Math.round(280 * 1.2)],

      // Foot + Aroma Massage (fees: 220*1.2=264, 280*1.2=336)
      ['Foot + Aroma Massage', 90, 'Home Service', 1300, Math.round(220 * 1.2)],
      ['Foot + Aroma Massage', 120, 'Home Service', 1500, Math.round(280 * 1.2)],

      // Coconut lovers - coconut oil massage (fees: 160*1.2=192, 240*1.2=288, 320*1.2=384)
      ['Coconut lovers - coconut oil massage', 60, 'Home Service', 900, Math.round(160 * 1.2)],
      ['Coconut lovers - coconut oil massage', 90, 'Home Service', 1300, Math.round(240 * 1.2)],
      ['Coconut lovers - coconut oil massage', 120, 'Home Service', 1700, Math.round(320 * 1.2)]
    ];

    // Insert Home Service services
    for (const [name, duration, location, price, fee] of homeServices) {
      await database.run(
        'INSERT INTO services (service_name, duration_minutes, location, price, masseuse_fee) VALUES (?, ?, ?, ?, ?)',
        [name, duration, location, price, fee]
      );
    }

    // Insert payment methods
    const paymentMethods = ['Cash', 'Credit Card', 'Bank Transfer', 'Alipay', 'WeChat Payment', 'QR Credit Pay'];
    for (const method of paymentMethods) {
      await database.run(
        'INSERT INTO payment_methods (method_name) VALUES (?)',
        [method]
      );
    }

    console.log('✅ All data inserted successfully!');
    console.log(`📝 Staff: ${staffNames.length} masseuses`);
    console.log(`💆 Services: ${inShopServices.length} in-shop + ${homeServices.length} home services = ${inShopServices.length + homeServices.length} total`);
    console.log(`💳 Payment methods: ${paymentMethods.length}`);

    await database.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error inserting data:', error);
    process.exit(1);
  }
}

insertAllData();
