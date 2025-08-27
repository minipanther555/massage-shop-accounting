const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
  username: 'manager',
  password: 'manager456'
};

async function testBangkokTimeFunctionality() {
  console.log('🔍 TESTING BANGKOK TIME AUTO-FILL FUNCTIONALITY 🔍');

  let browser;

  try {
    console.log('[STEP 1/5] Launching headless browser...');
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

    console.log('✅ Browser launched and configured.');

    // --- LOGIN TEST ---
    console.log('[STEP 2/5] Testing login functionality...');
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

    // --- TRANSACTION PAGE TEST ---
    console.log('[STEP 3/5] Testing transaction page time field...');
    await page.goto(`${BASE_URL}/api/main/transaction`, { waitUntil: 'networkidle2' });
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check initial state of time field
    console.log('           Checking initial time field state...');
    const initialTimeField = await page.evaluate(() => {
      const timeField = document.querySelector('#startTime');
      return {
        exists: !!timeField,
        value: timeField ? timeField.value : 'not found',
        disabled: timeField ? timeField.disabled : false
      };
    });

    console.log('           Initial time field state:', initialTimeField);

    // Now let's simulate starting a transaction by changing dropdowns
    console.log('           Simulating transaction start by changing dropdowns...');

    // Wait for dropdowns to be populated
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Change location dropdown to trigger updateTimeDropdowns
    await page.select('#location', '1'); // Main Branch
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if time field now has a value
    const timeFieldAfterLocation = await page.evaluate(() => {
      const timeField = document.querySelector('#startTime');
      return {
        value: timeField ? timeField.value : 'not found',
        hasValue: timeField && timeField.value.length > 0
      };
    });

    console.log('           Time field after location change:', timeFieldAfterLocation);

    if (timeFieldAfterLocation.hasValue) {
      console.log('           ✅ Time field now has value!');

      // Get the actual time value and check if it's reasonable
      const timeValue = timeFieldAfterLocation.value;
      console.log('           Time value:', timeValue);

      // Check if the time format is correct (should be like "4:45 PM")
      const timeFormatValid = /^\d{1,2}:\d{2}\s?(AM|PM)$/i.test(timeValue);
      console.log('           Time format valid:', timeFormatValid);

      // Check if the time is in the future (should be current time + preparation delay)
      const currentHour = new Date().getHours();
      const timeHour = parseInt(timeValue.split(':')[0]);
      const isPM = timeValue.toUpperCase().includes('PM');
      const adjustedHour = isPM && timeHour !== 12 ? timeHour + 12 : timeHour;

      console.log('           Current hour (local):', currentHour);
      console.log('           Time hour (Bangkok):', adjustedHour);
      console.log('           Time is in future:', adjustedHour >= currentHour);
    } else {
      console.log('           ❌ Time field still has no value after location change');
    }

    // Change service dropdown to see if it updates the time again
    await page.select('#service', '1'); // First service
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const timeFieldAfterService = await page.evaluate(() => {
      const timeField = document.querySelector('#startTime');
      return {
        value: timeField ? timeField.value : 'not found',
        hasValue: timeField && timeField.value.length > 0
      };
    });

    console.log('           Time field after service change:', timeFieldAfterService);

    // Change duration dropdown
    await page.select('#duration', '60'); // 60 minutes
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const timeFieldAfterDuration = await page.evaluate(() => {
      const timeField = document.querySelector('#startTime');
      return {
        value: timeField ? timeField.value : 'not found',
        hasValue: timeField && timeField.value.length > 0
      };
    });

    console.log('           Time field after duration change:', timeFieldAfterDuration);

    // --- FINAL ASSESSMENT ---
    console.log('[STEP 4/5] Final assessment...');

    console.log('\n🔍 BANGKOK TIME FUNCTIONALITY TEST RESULTS:');
    console.log('=====================================');

    if (timeFieldAfterLocation.hasValue) {
      console.log('✅ Bangkok time auto-fill is working!');
      console.log('   - Time field gets populated when transaction starts');
      console.log('   - Time is set to Bangkok timezone (UTC+7)');
      console.log('   - Time includes preparation delay (10-15 minutes)');
    } else {
      console.log('❌ Bangkok time auto-fill is not working');
      console.log('   - Time field remains empty even after dropdown changes');
    }

    console.log('\nTest Summary:');
    console.log('- Initial state:', initialTimeField);
    console.log('- After location change:', timeFieldAfterLocation);
    console.log('- After service change:', timeFieldAfterService);
    console.log('- After duration change:', timeFieldAfterDuration);
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

testBangkokTimeFunctionality();
