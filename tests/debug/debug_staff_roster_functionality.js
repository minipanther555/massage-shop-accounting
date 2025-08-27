const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
  username: 'manager',
  password: 'manager456'
};

async function debugStaffRosterFunctionality() {
  console.log('🔍 DEBUGGING STAFF ROSTER FUNCTIONALITY 🔍');
  console.log('===========================================');
  console.log('Testing staff roster page: dropdown population, adding staff, and status management');

  let browser;

  try {
    console.log('[STEP 1/6] Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Configure page to handle cookies properly
    await page.setExtraHTTPHeaders({
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Enable console logging from the page
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
        console.log(`📝 PAGE LOG: ${msg.text()}`);
      }
    });

    // Track all requests and responses
    page.on('request', (request) => {
      console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📤 REQUEST BODY: ${request.postData()}`);
      }
    });

    page.on('response', (response) => {
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
    });

    console.log('✅ Browser launched and configured.');

    // --- LOGIN TEST ---
    console.log('[STEP 2/6] Testing login functionality...');
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });

    // Fill login form
    await page.type('#username', TEST_CREDENTIALS.username);
    await page.type('#password', TEST_CREDENTIALS.password);
    await page.click('#login-btn');

    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Login successful, redirected to main page.');

    // Wait for page to fully load and cookies to be set
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // --- STAFF ROSTER PAGE TEST ---
    console.log('[STEP 3/6] Testing staff roster page functionality...');
    await page.goto(`${BASE_URL}/api/main/staff-roster`, { waitUntil: 'networkidle2' });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check initial state of the page
    console.log('           Checking initial page state...');
    const initialState = await page.evaluate(() => ({
      hasAvailableStaffDropdown: !!document.getElementById('available-staff'),
      hasRosterList: !!document.getElementById('roster-list'),
      hasEmptyRosterMessage: !!document.getElementById('empty-roster'),
      hasAddButton: !!document.querySelector('button[onclick="addStaffToRoster()"]'),
      hasClearButton: !!document.querySelector('button[onclick="clearTodayRoster()"]'),
      dropdownOptions: Array.from(document.querySelector('#available-staff')?.options || []).map((opt) => ({
        value: opt.value,
        text: opt.text,
        selected: opt.selected
      })),
      rosterItems: Array.from(document.querySelectorAll('#roster-list .roster-item')).map((item) => ({
        position: item.querySelector('.position')?.textContent,
        name: item.querySelector('.name')?.textContent,
        status: item.querySelector('.status')?.textContent
      }))
    }));

    console.log('           Initial page state:', initialState);

    // Check if the dropdown is populated with staff names
    console.log('           Checking if dropdown is populated...');
    const dropdownState = await page.evaluate(() => {
      const dropdown = document.getElementById('available-staff');
      if (!dropdown) return { error: 'Dropdown not found' };

      const options = Array.from(dropdown.options);
      const availableOptions = options.filter((opt) => opt.value && opt.text !== 'Select masseuse to add...');

      return {
        totalOptions: options.length,
        availableOptions: availableOptions.length,
        optionTexts: availableOptions.map((opt) => opt.text),
        hasDefaultOption: options.some((opt) => opt.text === 'Select masseuse to add...')
      };
    });

    console.log('           Dropdown state:', dropdownState);

    // --- TEST 1: Add Staff to Roster ---
    console.log('[STEP 4/7] Testing staff addition to roster...');

    // Helper function to get current roster state
    const getRosterState = async (page) => page.evaluate(() => {
      const rosterItems = Array.from(document.querySelectorAll('#roster-list .roster-grid')).map((item) => ({
        position: parseInt(item.children[0].textContent.replace('#', '')),
        name: item.children[1].textContent,
        status: item.children[2].textContent.trim(),
        todayCount: parseInt(item.children[3].textContent)
      }));
      return {
        rosterItemCount: rosterItems.length,
        rosterItems
      };
    });

    try {
      // First, clear the roster to ensure a clean slate
      console.log('           Clearing roster before test...');
      page.on('dialog', async (dialog) => {
        await dialog.accept();
      });
      await page.evaluate(() => clearTodayRoster());
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const staffToAdd1 = dropdownState.optionTexts[0];
      console.log(`           Adding first staff member: ${staffToAdd1}`);
      await page.select('#available-staff', staffToAdd1);
      await page.click('button.btn');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const rosterAfterAdd1 = await getRosterState(page);
      console.log('           After adding first staff:', rosterAfterAdd1);
      if (rosterAfterAdd1.rosterItemCount !== 1 || rosterAfterAdd1.rosterItems[0].name !== staffToAdd1) {
        console.error('❌ First staff member was not added correctly');
      } else {
        console.log('✅ First staff member added successfully');
      }

      const staffToAdd2 = dropdownState.optionTexts[1];
      console.log(`           Adding second staff member: ${staffToAdd2}`);
      await page.select('#available-staff', staffToAdd2);
      await page.click('button.btn');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const rosterAfterAdd2 = await getRosterState(page);
      console.log('           After adding second staff:', rosterAfterAdd2);
      if (rosterAfterAdd2.rosterItemCount !== 2 || rosterAfterAdd2.rosterItems[1].name !== staffToAdd2) {
        console.error('❌ Second staff member was not added correctly');
      } else {
        console.log('✅ Second staff member added successfully');
      }

      // Test staff removal
      console.log('[STEP 5/7] Testing staff removal from roster...');
      const staffToRemove = rosterAfterAdd2.rosterItems[0]; // Remove the first person
      console.log(`           Removing staff: ${staffToRemove.name} at position ${staffToRemove.position}`);
      await page.click('.roster-grid:nth-child(1) button.btn-danger');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const rosterAfterRemove = await getRosterState(page);
      console.log('           After removing staff:', rosterAfterRemove);
      if (rosterAfterRemove.rosterItemCount !== 1 || rosterAfterRemove.rosterItems[0].name !== staffToAdd2) {
        console.error('❌ Staff member was not removed correctly');
      } else {
        console.log('✅ Staff member removed and roster re-indexed successfully');
      }

      // Test Clear All
      console.log('[STEP 6/7] Testing Clear All functionality...');
      await page.evaluate(() => clearTodayRoster());
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const rosterAfterClear = await getRosterState(page);
      console.log('           After Clear All:', rosterAfterClear);
      if (rosterAfterClear.rosterItemCount !== 0) {
        console.error('❌ Roster was not cleared correctly');
      } else {
        console.log('✅ Roster cleared successfully');
      }
    } catch (e) {
      console.error('Error during staff addition/status test:', e);
    }

    console.log('\n🎉 STAFF ROSTER FUNCTIONALITY TEST COMPLETE! 🎉');
  } catch (error) {
    console.error('❌ An error occurred during the test:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed.');
    }
    console.log('✅ Test completed successfully');
  }
}

debugStaffRosterFunctionality();
