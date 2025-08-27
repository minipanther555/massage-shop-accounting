const puppeteer = require('puppeteer');

async function debugTransactionPricingMismatch() {
  console.log('🔍 TRANSACTION PRICING MISMATCH DEBUGGING - FOOT MASSAGE 90 MINUTES');
  console.log('==================================================================');
  console.log('Testing the specific bug: Foot Massage 90 minutes shows correct pricing but stores wrong data');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Set realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Navigate to login page
    await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });

    // Login as manager
    await page.type('#username', 'manager');
    await page.type('#password', 'manager456');
    await page.click('#login-btn');

    // Wait for redirect and login
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Navigate to transaction page
    await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });

    // Wait for page to load
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Wait for dropdowns to populate
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Select Foot Massage 90 minutes
    await page.select('#masseuse', 'May เมย์');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.select('#service', 'Foot massage');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.select('#duration', '90');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.select('#payment', 'Cash');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await page.select('#location', 'In-Shop');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check frontend pricing before submission
    const frontendPrice = await page.$eval('#service-price', (el) => el.textContent);
    const frontendFee = await page.$eval('#masseuse-fee', (el) => el.textContent);

    console.log('\n[STEP 7] ADDING EXTENSIVE LOGGING TO SUBMIT TRANSACTION FUNCTION...');

    // Override the submitTransaction function with extensive logging
    await page.evaluate(() => {
      const originalSubmitTransaction = window.submitTransaction;

      window.submitTransaction = async function (formData) {
        console.log('🚀 SUBMIT TRANSACTION FUNCTION CALLED!');
        console.log('📋 Form data received:', formData);
        console.log('🔍 Form data type:', typeof formData);
        console.log('🔍 Form data keys:', Object.keys(formData));

        // Log each field individually
        for (const [key, value] of Object.entries(formData)) {
          console.log(`📝 Field ${key}:`, value);
        }

        // Check if this is FormData object
        if (formData instanceof FormData) {
          console.log('📋 FormData object detected');
          const entries = Array.from(formData.entries());
          console.log('📋 FormData entries:', entries);
        }

        // Call original function
        console.log('🚀 Calling original submitTransaction function...');
        const result = await originalSubmitTransaction(formData);
        console.log('✅ Original function result:', result);
        return result;
      };

      console.log('✅ submitTransaction function overridden with logging');
    });

    // Override the API call with logging
    await page.evaluate(() => {
      const originalApiCall = window.api.post;

      window.api.post = async function (endpoint, data) {
        console.log('🚀 API POST CALL INTERCEPTED!');
        console.log('📡 Endpoint:', endpoint);
        console.log('📋 Data being sent:', data);
        console.log('🔍 Data type:', typeof data);

        if (data instanceof FormData) {
          console.log('📋 FormData object detected in API call');
          const entries = Array.from(data.entries());
          console.log('📋 FormData entries in API call:', entries);
        }

        // Call original function
        console.log('🚀 Calling original API post function...');
        const result = await originalApiCall.call(this, endpoint, data);
        console.log('✅ API call result:', result);
        return result;
      };

      console.log('✅ API post function overridden with logging');
    });

    console.log('\n[STEP 8] CLICKING SUBMIT BUTTON...');

    // Click submit button
    await page.click('button[type="submit"]');

    // Wait for any API calls
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 9] CHECKING DATABASE FOR NEW TRANSACTION...');

    // Navigate to recent transactions to see what was actually stored
    await page.goto('https://109.123.238.197.sslip.io/api/main/summary', { waitUntil: 'networkidle2' });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Check the most recent transaction
    const recentTransactions = await page.evaluate(() => {
      const transactionRows = document.querySelectorAll('#recent-transactions tbody tr');
      if (transactionRows.length === 0) return [];

      const transactions = [];
      transactionRows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 6) {
          transactions.push({
            index: index + 1,
            service: cells[1]?.textContent?.trim(),
            duration: cells[2]?.textContent?.trim(),
            price: cells[3]?.textContent?.trim(),
            masseuse: cells[4]?.textContent?.trim(),
            date: cells[5]?.textContent?.trim()
          });
        }
      });
      return transactions;
    });

    console.log('\n📋 RECENT TRANSACTIONS IN DATABASE:');
    recentTransactions.forEach((tx, index) => {
      console.log(`${index + 1}. Service: ${tx.service}, Duration: ${tx.duration}, Price: ${tx.price}, Masseuse: ${tx.masseuse}, Date: ${tx.date}`);
    });

    console.log('\n🔍 FRONTEND PRICING BEFORE SUBMISSION:');
    console.log('Service Price:', frontendPrice);
    console.log('Masseuse Fee:', frontendFee);

    console.log('\n✅ DEBUGGING COMPLETE');
  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await browser.close();
  }
}

debugTransactionPricingMismatch();
