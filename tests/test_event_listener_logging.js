const puppeteer = require('puppeteer');

async function testEventListenerLogging() {
  console.log('🔍 TESTING EVENT LISTENER LOGGING TO IDENTIFY EXACT ERROR LOCATION');
  console.log('==================================================================');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Enable console logging for ALL messages
    page.on('console', (msg) => {
      console.log(`📝 CONSOLE: ${msg.text()}`);
    });

    // Enable page error logging
    page.on('pageerror', (error) => {
      console.log(`❌ PAGE ERROR: ${error.message}`);
      console.log(`❌ PAGE ERROR STACK: ${error.stack}`);
    });

    console.log('\n[STEP 1] Navigating to login page...');
    await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle0' });

    console.log('\n[STEP 2] Logging in as manager...');
    await page.type('#username', 'manager');
    await page.type('#password', 'manager456');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });

    console.log('\n[STEP 3] Navigating to transaction page...');
    await page.goto('https://109.123.238.197.sslip.io/transaction.html', { waitUntil: 'networkidle0' });

    console.log('\n[STEP 4] Waiting for populateDropdowns to execute...');
    await page.waitForTimeout(5000); // Wait for the function to run

    console.log('\n[STEP 5] Checking console output for error details...');

    // The enhanced logging should now show exactly where the error occurs
  } catch (error) {
    console.error('❌ CRITICAL ERROR in test script:', error);
  } finally {
    await browser.close();
  }
}

testEventListenerLogging();
