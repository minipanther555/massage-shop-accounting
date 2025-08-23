const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
  username: 'manager',
  password: 'manager456'
};

async function testStaffPageFunctionality() {
  console.log('🚀 TESTING STAFF PAGE FUNCTIONALITY 🚀');

  let browser;

  try {
    console.log('[STEP 1/4] Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Enable console logging from the page
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));

    // Track all requests and responses
    page.on('requestfailed', (request) => {
      console.error(`❌ REQUEST FAILED: ${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    console.log('✅ Browser launched and configured.');

    // --- LOGIN TEST ---
    console.log('[STEP 2/4] Testing login functionality...');
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });

    // Fill login form
    await page.type('#username', TEST_CREDENTIALS.username);
    await page.type('#password', TEST_CREDENTIALS.password);
    await page.click('#login-btn');

    // Wait for redirect
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Login successful, redirected to main page.');

    // --- STAFF PAGE TEST ---
    console.log('[STEP 3/4] Testing staff page functionality...');

    // Navigate directly to staff page
    console.log('           Navigating to staff page...');
    await page.goto(`${BASE_URL}/api/main/staff-roster`, { waitUntil: 'networkidle2' });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('           Checking page elements...');

    // Check if required elements exist
    const pageElements = await page.evaluate(() => ({
      hasAvailableStaffDropdown: !!document.getElementById('available-staff'),
      hasRosterList: !!document.getElementById('roster-list'),
      hasEmptyRosterMessage: !!document.getElementById('empty-roster'),
      hasAddButton: !!document.querySelector('button[onclick="addStaffToRoster()"]'),
      hasClearButton: !!document.querySelector('button[onclick="clearTodayRoster()"]'),
      hasUserInfo: !!document.getElementById('user-info'),
      hasCurrentUser: !!document.getElementById('current-user'),
      scriptsLoaded: document.scripts.length,
      stylesheetsLoaded: document.styleSheets.length
    }));

    console.log('           Page elements status:', pageElements);

    // Check if JavaScript functions are available
    const jsFunctions = await page.evaluate(() => ({
      hasLoadData: typeof loadData === 'function',
      hasUpdateAvailableStaffDropdown: typeof updateAvailableStaffDropdown === 'function',
      hasUpdateRosterDisplay: typeof updateRosterDisplay === 'function',
      hasAddStaffToRoster: typeof addStaffToRoster === 'function',
      hasMoveUp: typeof moveUp === 'function',
      hasMoveDown: typeof moveDown === 'function',
      hasCONFIG: typeof CONFIG !== 'undefined',
      hasAppData: typeof appData !== 'undefined'
    }));

    console.log('           JavaScript functions status:', jsFunctions);

    // Check if data is loaded
    const dataStatus = await page.evaluate(() => {
      if (typeof CONFIG !== 'undefined' && typeof appData !== 'undefined') {
        return {
          hasMasseuses: CONFIG.settings?.masseuses?.length > 0,
          masseusesCount: CONFIG.settings?.masseuses?.length || 0,
          hasRoster: appData.roster?.length > 0,
          rosterCount: appData.roster?.length || 0,
          hasServices: CONFIG.settings?.services?.length > 0,
          servicesCount: CONFIG.settings?.services?.length || 0
        };
      }
      return { error: 'CONFIG or appData not available' };
    });

    console.log('           Data status:', dataStatus);

    // Test adding staff to roster if possible
    if (jsFunctions.hasAddStaffToRoster && dataStatus.hasMasseuses) {
      console.log('           Testing staff roster management...');

      try {
        // Select first available staff member
        await page.select('#available-staff', '1');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Click add button
        await page.click('button[onclick="addStaffToRoster()"]');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if staff was added
        const rosterRows = await page.evaluate(() => document.querySelectorAll('.roster-grid').length);

        console.log(`           Roster rows after adding staff: ${rosterRows}`);

        // Test up/down buttons if staff was added
        if (rosterRows > 1) { // More than just header
          console.log('           Testing up/down buttons...');

          const upButton = await page.$('button[onclick*="moveUp"]');
          const downButton = await page.$('button[onclick*="moveDown"]');

          if (upButton && downButton) {
            console.log('           ✅ Up/down buttons found');

            // Test moving staff up
            try {
              await upButton.click();
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log('           ✅ Up button clicked successfully');
            } catch (error) {
              console.log('           ⚠️ Up button click had issues:', error.message);
            }

            // Test moving staff down
            try {
              await downButton.click();
              await new Promise((resolve) => setTimeout(resolve, 1000));
              console.log('           ✅ Down button clicked successfully');
            } catch (error) {
              console.log('           ⚠️ Down button click had issues:', error.message);
            }
          } else {
            console.log('           ❌ Up/down buttons not found');
          }
        }
      } catch (error) {
        console.log('           ❌ Error testing staff roster:', error.message);
      }
    }

    // --- FINAL ASSESSMENT ---
    console.log('[STEP 4/4] Final assessment...');

    console.log('\n🔍 STAFF PAGE FUNCTIONALITY TEST RESULTS:');
    console.log('=====================================');

    if (jsFunctions.hasLoadData && jsFunctions.hasCONFIG && jsFunctions.hasAppData) {
      console.log('✅ Core JavaScript infrastructure working');
    } else {
      console.log('❌ Core JavaScript infrastructure missing');
    }

    if (dataStatus.hasMasseuses && dataStatus.hasRoster) {
      console.log('✅ Data loading working');
    } else {
      console.log('❌ Data loading issues');
    }

    if (pageElements.hasAvailableStaffDropdown && pageElements.hasRosterList) {
      console.log('✅ Page structure correct');
    } else {
      console.log('❌ Page structure issues');
    }

    console.log('\nDetailed Status:');
    console.log('- Page Elements:', pageElements);
    console.log('- JavaScript Functions:', jsFunctions);
    console.log('- Data Status:', dataStatus);
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed.');
    }
  }
}

testStaffPageFunctionality();
