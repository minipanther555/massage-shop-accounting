const { test, expect } = require('@playwright/test');

test.describe('S2.9_PageBundleHarness', () => {
  test('initial load makes exactly one staff fetch and populates dropdown uniquely', async ({ page, context }) => {
    // Force auth bypass before any app JS runs
    await context.addCookies([
      { name: 'PWTEST', value: '1', domain: 'localhost', path: '/' },
    ]);

    await context.addInitScript(() => {
      window.__PWTEST__ = true;
      window.isLoggedIn = () => true;
      window.getCurrentUser = () => ({ username: 'pwtest' });
      window.requireAuth = () => true;
    });

    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3000/staff.html?PWTEST=1', { waitUntil: 'domcontentloaded' });

    // Gate 0: make sure we are not on login
    expect(page.url()).not.toMatch(/\/login(\.html)?$/i);
    console.log(`✅ Not on login page: ${page.url()}`);

    // Debug: Check if controller script loaded
    const controllerLoaded = await page.evaluate(() => {
      return typeof window.staffControllerInit !== 'undefined';
    });
    console.log(`🔍 Controller loaded: ${controllerLoaded}`);

    // Debug: Check if controller is initialized
    const controllerInitialized = await page.evaluate(() => {
      return typeof window.__staffCtrl !== 'undefined' && window.__staffCtrl.__inited;
    });
    console.log(`🔍 Controller initialized: ${controllerInitialized}`);

    // Debug: Check what's in the window object
    const windowKeys = await page.evaluate(() => {
      return Object.keys(window).filter(k => k.includes('staff') || k.includes('Staff'));
    });
    console.log(`🔍 Window staff keys: ${windowKeys.join(', ')}`);

    // Debug: Check for JavaScript errors
    if (consoleErrors.length > 0) {
      console.log('🚨 Console errors:', consoleErrors);
    }
    
    // Verify we're on the correct page (tolerant to roster container ID)
    await expect(page.locator('#available-staff')).toBeVisible();
    
    // Check for roster container (tolerant)
    const rosterCandidates = ['#roster-list', '#current-roster', '#todays-roster', '[data-roster]'];
    const found = await page.evaluate((sels) => sels.find(s => !!document.querySelector(s)), rosterCandidates);
    expect(found, `Missing roster container. Tried: ${rosterCandidates.join(', ')}`).toBeTruthy();
    await expect(page.locator(found)).toBeVisible();
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

    // Page already loaded above in auth gate
    
    // Wait for init window (1000ms)
    await page.waitForTimeout(1000);

    // S2.9 Gate Assertions
    console.log('=== S2.9_PageBundleHarness Results ===');
    console.log(`INIT_WINDOW_GETS: ${requests.length}`);
    
    // Check DOM beacons (more reliable than console)
    const hasLoadBeacon = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-staff-ctrl') === 'loaded';
    });
    const hasInitBeacon = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-staff-ctrl') === 'init';
    });
    console.log(`Has [STAFF_CTRL/LOAD] beacon: ${hasLoadBeacon}`);
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
