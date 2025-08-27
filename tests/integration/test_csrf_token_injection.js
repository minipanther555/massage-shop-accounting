const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
  username: 'manager',
  password: 'manager456'
};

async function testCSRFTokenInjection() {
  console.log('🔍 TESTING CSRF TOKEN INJECTION 🔍');
  console.log('=====================================');

  let browser;

  try {
    console.log('[STEP 1] Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      ignoreHTTPSErrors: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Enable request/response logging
    page.on('request', (request) => {
      console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
    });

    page.on('response', (response) => {
      console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
    });

    console.log('[STEP 2] Testing login and CSRF token injection...');

    // Go to login page
    await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle0' });

    // Fill login form
    await page.type('#username', TEST_CREDENTIALS.username);
    await page.type('#password', TEST_CREDENTIALS.password);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for redirect to main page
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    console.log('✅ Login successful, redirected to main page');

    // Now navigate to transaction page through backend route
    console.log('[STEP 3] Navigating to transaction page through backend route...');
    await page.goto(`${BASE_URL}/api/main/transaction`, { waitUntil: 'networkidle0' });

    // Check if CSRF token was injected
    console.log('[STEP 4] Checking CSRF token injection...');
    const csrfToken = await page.evaluate(() => {
      const metaTag = document.querySelector('meta[name="csrf-token"]');
      if (metaTag) {
        return {
          exists: true,
          content: metaTag.getAttribute('content'),
          isPlaceholder: metaTag.getAttribute('content') === '{{ an_actual_token }}',
          length: metaTag.getAttribute('content').length
        };
      }
      return { exists: false };
    });

    console.log('🔍 CSRF Token Check Results:', csrfToken);

    if (csrfToken.exists && !csrfToken.isPlaceholder) {
      console.log('✅ CSRF token successfully injected!');
    } else if (csrfToken.exists && csrfToken.isPlaceholder) {
      console.log('❌ CSRF token still shows placeholder - injection failed!');
    } else {
      console.log('❌ CSRF meta tag not found!');
    }

    // Check if form elements are present
    console.log('[STEP 5] Checking form elements...');
    const formElements = await page.evaluate(() => {
      const elements = {
        location: document.getElementById('location'),
        service: document.getElementById('service'),
        duration: document.getElementById('duration'),
        masseuse: document.getElementById('masseuse'),
        payment: document.getElementById('payment'),
        form: document.getElementById('transaction-form')
      };

      return Object.fromEntries(
        Object.entries(elements).map(([key, element]) => [
          key,
          element ? {
            exists: true,
            id: element.id,
            tagName: element.tagName,
            type: element.type || 'N/A'
          } : { exists: false }
        ])
      );
    });

    console.log('🔍 Form Elements Check:', formElements);

    // Check page source for debugging
    const pageSource = await page.content();
    const hasCSRFToken = pageSource.includes('X-CSRF-Token');
    const hasPlaceholder = pageSource.includes('{{ an_actual_token }}');

    console.log('🔍 Page Source Analysis:');
    console.log('  - Contains X-CSRF-Token header:', hasCSRFToken);
    console.log('  - Contains placeholder token:', hasPlaceholder);

    // Check response headers
    const response = await page.goto(`${BASE_URL}/api/main/transaction`, { waitUntil: 'networkidle0' });
    const headers = response.headers();

    console.log('🔍 Response Headers:');
    console.log('  - X-CSRF-Token:', headers['x-csrf-token'] ? 'PRESENT' : 'MISSING');
    console.log('  - Set-Cookie:', headers['set-cookie'] ? 'PRESENT' : 'MISSING');

    console.log('✅ CSRF Token Injection Test Complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testCSRFTokenInjection().catch(console.error);
