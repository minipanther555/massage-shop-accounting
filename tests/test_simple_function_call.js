const puppeteer = require('puppeteer');

async function testSimpleFunctionCall() {
  console.log('🧪 TESTING SIMPLE FUNCTION CALL');
  console.log('================================');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
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

    // Enable console logging for ALL messages
    page.on('console', (msg) => {
      console.log(`📝 CONSOLE: ${msg.text()}`);
    });

    // Navigate to login page
    console.log('\n[STEP 1] Navigating to login page...');
    await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });

    // Login as manager
    console.log('\n[STEP 2] Logging in as manager...');
    await page.type('#username', 'manager');
    await page.type('#password', 'manager456');
    await page.click('#login-btn');

    // Wait for redirect and login
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Navigate to transaction page
    console.log('\n[STEP 3] Navigating to transaction page...');
    await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 4] TESTING SIMPLE FUNCTION CALL...');

    // Test 1: Check if the function exists
    const functionExists = await page.evaluate(() => {
      console.log('🔍 Checking if updateTimeDropdowns function exists...');
      if (typeof updateTimeDropdowns === 'function') {
        console.log('✅ updateTimeDropdowns function exists');
        return true;
      }
      console.log('❌ updateTimeDropdowns function does not exist');
      return false;
    });

    console.log('📋 Function exists:', functionExists);

    if (functionExists) {
      // Test 2: Call the function directly
      console.log('\n🔍 Calling updateTimeDropdowns function directly...');

      // First, call the function to trigger all the logging
      await page.evaluate(() => {
        console.log('🔍 CALLING updateTimeDropdowns()...');
        updateTimeDropdowns();
      });

      // Wait a moment for console messages to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Now check the result
      const result = await page.evaluate(() => {
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const endTimeOptions = Array.from(document.getElementById('endTime').options).map((opt) => ({
          value: opt.value,
          text: opt.textContent,
          selected: opt.selected
        }));

        return {
          startTime,
          endTime,
          endTimeOptions
        };
      });

      console.log('📋 Function call result:', result);
    }

    console.log('\n🧪 SIMPLE FUNCTION CALL TEST COMPLETE');
    console.log('=====================================');
    console.log('Check the output above for results');
  } catch (error) {
    console.error('❌ ERROR during testing:', error);
  } finally {
    await browser.close();
  }
}

testSimpleFunctionCall();
