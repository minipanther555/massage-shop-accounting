const puppeteer = require('puppeteer');

// =============================================================================
// CONFIGURATION
// =============================================================================
const BASE_URL = 'http://109.123.238.197';
const LOGIN_PAGE_URL = `${BASE_URL}/login.html`;
const STAFF_PAGE_URL = `${BASE_URL}/api/admin/staff-page`;

const credentials = {
  username: 'manager',
  password: 'manager456'
};

// =============================================================================
// AUTOMATED BROWSER TEST
// =============================================================================

async function runBrowserTest() {
  console.log('🚀 LAUNCHING AUTOMATED BROWSER TEST 🚀');
  let browser;
  try {
    console.log('[STEP 1/5] Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'] // Required for some environments
    });
    const page = await browser.newPage();
    console.log('✅ Browser launched.');

    // --- Login Step ---
    console.log(`[STEP 2/5] Navigating to login page: ${LOGIN_PAGE_URL}`);
    await page.goto(LOGIN_PAGE_URL, { waitUntil: 'networkidle2' });

    console.log('           Typing credentials...');
    await page.type('#username', credentials.username);
    await page.type('#password', credentials.password);

    console.log('           Clicking login button...');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);

    // Check if login was successful by looking for the admin section on the dashboard
    const adminSection = await page.$('#admin-section');
    if (!adminSection) {
      throw new Error('Login failed. Admin section not found on dashboard.');
    }
    console.log('✅ Login successful.');

    // --- Navigate to Staff Page ---
    console.log(`[STEP 3/5] Navigating to staff admin page: ${STAFF_PAGE_URL}`);
    await page.goto(STAFF_PAGE_URL, { waitUntil: 'networkidle2' });
    console.log('✅ Navigation to staff page complete.');

    // --- Extract CSRF Token ---
    console.log('[STEP 4/5] Extracting CSRF token from meta tag...');
    const csrfToken = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="csrf-token"]');
      return meta ? meta.getAttribute('content') : null;
    });

    if (!csrfToken) {
      throw new Error('CSRF meta tag not found on the page.');
    }
    console.log(`✅ Found CSRF meta tag. Content: "${csrfToken}"`);

    // --- Final Verification ---
    console.log('[STEP 5/5] Verifying token content...');
    if (csrfToken && csrfToken !== '{{ an_actual_token }}') {
      console.log('🎉🎉🎉 SUCCESS! The real CSRF token was correctly injected into the page. 🎉🎉🎉');
    } else {
      console.error('❌❌❌ FAILURE! The CSRF token is either missing or still the placeholder. ❌❌❌');
    }
  } catch (error) {
    console.error('🚨 TEST FAILED:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('✅ Browser closed.');
    }
  }
}

runBrowserTest();
