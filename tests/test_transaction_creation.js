const puppeteer = require('puppeteer-core');

async function testTransactionCreation() {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: false
  });

  const page = await browser.newPage();

  try {
    console.log('🔍 Testing transaction creation on testing1401...');

    // Navigate to login
    await page.goto('https://109.123.238.197.sslip.io/login.html');
    await page.waitForTimeout(2000);

    // Login
    await page.type('#username', 'manager');
    await page.type('#password', 'manager456');
    await page.click('#login-btn');
    await page.waitForTimeout(3000);

    // Navigate to transaction page
    await page.goto('https://109.123.238.197.sslip.io/transaction.html');
    await page.waitForTimeout(3000);

    // Fill form
    await page.select('#masseuse-select', 'May เมย์');
    await page.select('#service-select', 'Foot massage');
    await page.select('#location-select', 'In-Shop');
    await page.select('#duration-select', '90');
    await page.select('#payment-method-select', 'Cash');
    await page.type('#start-time', '8:00 PM');

    // Submit
    console.log('📝 Submitting transaction...');
    await page.click('#submit-btn');

    // Wait for response
    await page.waitForTimeout(5000);

    // Check for success/error
    const pageContent = await page.content();
    if (pageContent.includes('Transaction created successfully')) {
      console.log('✅ SUCCESS: Transaction created!');
    } else if (pageContent.includes('Failed to create transaction')) {
      console.log('❌ FAILED: Transaction creation failed');
    } else {
      console.log('🔍 UNKNOWN: Could not determine result');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testTransactionCreation();
