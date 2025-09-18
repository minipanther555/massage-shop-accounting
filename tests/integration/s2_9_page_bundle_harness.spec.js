const { test, expect } = require('@playwright/test');

test.describe('S2.9_PageBundleHarness', () => {
  test('initial load makes exactly one staff fetch and populates dropdown uniquely', async ({ page }) => {
    const requests = [];
    const consoleBeacons = [];
    
    // Capture network requests
    page.on('request', r => {
      const u = new URL(r.url());
      if (u.pathname === '/api/staff/allstaff' && r.method() === 'GET') {
        requests.push({ url: r.url(), ts: Date.now() });
      }
    });

    // Capture console beacons
    page.on('console', msg => {
      const t = msg.text();
      if (t.includes('[STAFF_CTRL/LOAD]') || t.includes('[STAFF_CTRL/INIT]')) {
        consoleBeacons.push(t);
      }
    });

    // Load the staff page
    await page.goto('http://localhost:3000/staff.html', { waitUntil: 'domcontentloaded' });
    
    // Wait for init window (1000ms)
    await page.waitForTimeout(1000);

    // S2.9 Gate Assertions
    console.log('=== S2.9_PageBundleHarness Results ===');
    console.log(`INIT_BEACONS: ${consoleBeacons.length}`);
    console.log(`INIT_WINDOW_GETS: ${requests.length}`);
    
    // Check for load beacon
    const hasLoadBeacon = consoleBeacons.some(t => t.includes('[STAFF_CTRL/LOAD]'));
    console.log(`Has [STAFF_CTRL/LOAD] beacon: ${hasLoadBeacon}`);
    
    // Check for init beacon  
    const hasInitBeacon = consoleBeacons.some(t => t.includes('[STAFF_CTRL/INIT]'));
    console.log(`Has [STAFF_CTRL/INIT] beacon: ${hasInitBeacon}`);

    // Gate 1: Must have both beacons
    expect(hasLoadBeacon).toBeTruthy();
    expect(hasInitBeacon).toBeTruthy();

    // Gate 2: Must have exactly 1 GET request
    expect(requests).toHaveLength(1);

    // Gate 3: Check dropdown uniqueness
    const options = await page.$$eval('#available-staff option', els => 
      els.map(e => e.textContent?.trim()).filter(Boolean)
    );
    
    console.log(`Total options: ${options.length}`);
    console.log(`Options: ${JSON.stringify(options)}`);
    
    const defaultOption = options.find(opt => opt.includes('Select') || opt.includes('—'));
    const staffOptions = options.filter(opt => !opt.includes('Select') && !opt.includes('—'));
    const uniqueStaff = new Set(staffOptions);
    
    console.log(`Default option: ${defaultOption}`);
    console.log(`Staff options: ${staffOptions.length}`);
    console.log(`Unique staff: ${uniqueStaff.size}`);
    
    // Gate 4: No duplicates in staff options
    expect(uniqueStaff.size).toBe(staffOptions.length);
    
    // Gate 5: Must have staff populated
    expect(uniqueStaff.size).toBeGreaterThan(0);
    
    console.log('✅ S2.9_PageBundleHarness: ALL GATES PASSED');
  });
});
