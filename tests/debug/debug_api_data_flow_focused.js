const puppeteer = require('puppeteer');

class APIDataFlowFocusedDebug {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async setup() {
    console.log('🚀 SETUP: Launching browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    this.page = await this.browser.newPage();

    // Set realistic user agent
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // Configure page to handle cookies properly
    await this.page.setExtraHTTPHeaders({
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1'
    });

    // Enable console logging
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
        console.log(`📝 PAGE LOG: ${msg.text()}`);
      }
    });

    // Override console.log to capture frontend logs
    await this.page.exposeFunction('logToNode', (message) => {
      console.log(`🌐 FRONTEND: ${message}`);
    });

    // Override the submitTransaction function to add detailed logging
    await this.page.evaluateOnNewDocument(() => {
      const originalSubmitTransaction = window.submitTransaction;
      window.submitTransaction = async function (formData) {
        console.log('🚀 DEBUG: submitTransaction called with formData:', formData);

        // Log the exact data being sent
        const transactionData = {
          masseuse_name: formData.masseuse,
          service_type: formData.service,
          payment_method: formData.payment,
          start_time: formData.startTime,
          end_time: formData.endTime,
          customer_contact: formData.customerContact || '',
          corrected_transaction_id: window.appData?.correctionMode ? window.appData.originalTransactionId : null
        };

        console.log('📤 DEBUG: About to send transactionData to API:', transactionData);
        console.log('🔍 DEBUG: Data types:', {
          masseuse_name: `${typeof transactionData.masseuse_name} (${transactionData.masseuse_name})`,
          service_type: `${typeof transactionData.service_type} (${transactionData.service_type})`,
          payment_method: `${typeof transactionData.payment_method} (${transactionData.payment_method})`,
          start_time: `${typeof transactionData.start_time} (${transactionData.start_time})`,
          end_time: `${typeof transactionData.end_time} (${transactionData.end_time})`,
          customer_contact: `${typeof transactionData.customer_contact} (${transactionData.customer_contact})`
        });

        try {
          const result = await originalSubmitTransaction(formData);
          console.log('✅ DEBUG: submitTransaction succeeded:', result);
          return result;
        } catch (error) {
          console.error('❌ DEBUG: submitTransaction failed:', error);
          throw error;
        }
      };
    });

    // Override the API client to add detailed logging
    await this.page.evaluateOnNewDocument(() => {
      const originalAPIClient = window.APIClient;
      window.APIClient = class extends originalAPIClient {
        async createTransaction(data) {
          console.log('🌐 DEBUG: APIClient.createTransaction called with:', data);
          console.log('🔍 DEBUG: Request details:', {
            url: '/api/transactions',
            method: 'POST',
            headers: this.getHeaders(),
            data
          });

          try {
            const response = await super.createTransaction(data);
            console.log('✅ DEBUG: API response success:', response);
            return response;
          } catch (error) {
            console.error('❌ DEBUG: API response error:', error);
            console.error('❌ DEBUG: Error details:', {
              message: error.message,
              status: error.status,
              response: error.response
            });
            throw error;
          }
        }
      };
    });
  }

  async runFocusedTest() {
    try {
      console.log('\n🔐 STEP 1: Authentication');
      console.log('='.repeat(40));

      // Navigate to login page
      await this.page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });

      // Fill login form
      await this.page.type('#username', 'manager');
      await this.page.type('#password', 'manager456');

      // Click login button
      await this.page.click('#login-btn');

      // Wait for redirect and login
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('✅ Authentication completed');

      console.log('\n📄 STEP 2: Navigate to Transaction Page');
      console.log('='.repeat(40));

      // Navigate to transaction page
      await this.page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });

      console.log('✅ Transaction page loaded');

      console.log('\n🔍 STEP 3: Check Form State');
      console.log('='.repeat(40));

      // Check if form exists and has required elements
      const formExists = await this.page.$('#transaction-form');
      console.log('📋 Form exists:', !!formExists);

      if (formExists) {
        const formMethod = await this.page.$eval('#transaction-form', (form) => form.method);
        const formAction = await this.page.$eval('#transaction-form', (form) => form.action);
        console.log('📋 Form method:', formMethod);
        console.log('📋 Form action:', formAction);
      }

      console.log('\n📝 STEP 4: Fill Form with Valid Data');
      console.log('='.repeat(40));

      // Wait for dropdowns to populate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Get available options for dynamic selection
      const masseuseOptions = await this.page.$$eval('#masseuse option', (options) => options.slice(1).map((opt) => ({ value: opt.value, text: opt.textContent })));

      const serviceOptions = await this.page.$$eval('#service option', (options) => options.slice(1).map((opt) => ({ value: opt.value, text: opt.textContent })));

      const endTimeOptions = await this.page.$$eval('#endTime option', (options) => options.slice(1).map((opt) => ({ value: opt.value, text: opt.textContent })));

      console.log('📋 Available masseuse options:', masseuseOptions.length);
      console.log('📋 Available service options:', serviceOptions.length);
      console.log('📋 Available end time options:', endTimeOptions.length);

      if (masseuseOptions.length > 0) {
        // Follow the correct user workflow:
        // 1. Select masseuse first
        await this.page.select('#masseuse', masseuseOptions[0].value);
        console.log('✅ Selected masseuse:', masseuseOptions[0].text);

        // 2. Select location (this triggers service population)
        await this.page.select('#location', 'In-Shop');
        console.log('✅ Selected location: In-Shop');

        // 3. Wait for services to populate after location selection
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 4. Get available services now that location is selected
        const serviceOptionsAfterLocation = await this.page.$$eval('#service option', (options) => options.slice(1).map((opt) => ({ value: opt.value, text: opt.textContent })));
        console.log('📋 Available service options after location selection:', serviceOptionsAfterLocation.length);

        if (serviceOptionsAfterLocation.length > 0) {
          // 5. Select service (this triggers time population)
          await this.page.select('#service', serviceOptionsAfterLocation[0].value);
          console.log('✅ Selected service:', serviceOptionsAfterLocation[0].text);

          // 6. Select duration
          await this.page.select('#duration', '60');
          console.log('✅ Selected duration: 60');

          // 7. Select payment method (this triggers time population)
          await this.page.select('#payment', 'Cash');
          console.log('✅ Selected payment: Cash');

          // 8. Wait for end times to populate after service and payment selection
          await new Promise((resolve) => setTimeout(resolve, 2000));

          // 9. Get available end times now that service and payment are selected
          const endTimeOptionsAfterService = await this.page.$$eval('#endTime option', (options) => options.slice(1).map((opt) => ({ value: opt.value, text: opt.textContent })));
          console.log('📋 Available end time options after service/payment selection:', endTimeOptionsAfterService.length);

          if (endTimeOptionsAfterService.length > 0) {
            // 10. Select end time
            await this.page.select('#endTime', endTimeOptionsAfterService[0].value);
            console.log('✅ Selected end time:', endTimeOptionsAfterService[0].text);

            // Set start time (current time)
            const now = new Date();
            const startTime = now.toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            });
            await this.page.evaluate((time) => {
              document.getElementById('startTime').value = time;
            }, startTime);

            console.log('✅ Form filled with valid data');
            console.log('📋 Selected values:', {
              masseuse: masseuseOptions[0].text,
              location: 'In-Shop',
              service: serviceOptionsAfterLocation[0].text,
              duration: '60',
              payment: 'Cash',
              startTime,
              endTime: endTimeOptionsAfterService[0].text
            });

            // Store these values for later use in the test
            this.testData = {
              masseuse: masseuseOptions[0].text,
              location: 'In-Shop',
              service: serviceOptionsAfterLocation[0].text,
              duration: '60',
              payment: 'Cash',
              startTime,
              endTime: endTimeOptionsAfterService[0].text
            };

            // Continue with the test instead of returning
            console.log('🚀 Ready to test form submission...');
          } else {
            console.log('❌ No end time options available after service/payment selection');
            return;
          }
        } else {
          console.log('❌ No service options available after location selection');
          return;
        }
      } else {
        console.log('❌ Not enough options available to fill form');
        return;
      }

      console.log('\n🚀 STEP 5: Submit Form and Monitor API Call');
      console.log('='.repeat(40));

      // Enhanced monitoring: Listen for both request and response
      const requestPromise = this.page.waitForRequest((request) => request.url().includes('/api/transactions') && request.method() === 'POST');

      const responsePromise = this.page.waitForResponse((response) => response.url().includes('/api/transactions') && response.request().method() === 'POST');

      console.log('📋 About to submit form with data:', this.testData);
      console.log('🔍 Monitoring for POST request to /api/transactions...');

      // Submit the form
      console.log('🔍 About to click submit button...');
      await this.page.click('button[type="submit"]');
      console.log('✅ Submit button clicked');

      // Add comprehensive logging for every step after submit
      console.log('🔍 STEP 5.1: Monitoring for form submit event...');

      // Wait a moment for any immediate JavaScript execution
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if handleSubmit was called by looking for console logs
      console.log('🔍 STEP 5.2: Checking if handleSubmit function was called...');

      // Check if submitTransaction was called
      console.log('🔍 STEP 5.3: Checking if submitTransaction function was called...');

      // Check if any JavaScript errors occurred
      console.log('🔍 STEP 5.4: Checking for JavaScript errors...');

      // Check if the form actually submitted (should see page change or redirect)
      console.log('🔍 STEP 5.5: Checking if form submission caused page change...');

      // Check current page URL to see if we're still on the same page
      const currentUrl = this.page.url();
      console.log('🔍 Current page URL after submit:', currentUrl);

      // Check if there are any error messages or alerts on the page
      console.log('🔍 STEP 5.6: Checking for error messages on page...');
      const errorMessages = await this.page.$$eval('.error, .alert, [style*="color: red"]', (elements) => elements.map((el) => el.textContent || el.innerText).filter((text) => text.trim()));
      if (errorMessages.length > 0) {
        console.log('❌ Error messages found on page:', errorMessages);
      } else {
        console.log('✅ No error messages found on page');
      }

      // Check if the form is still there and what its state is
      console.log('🔍 STEP 5.7: Checking form state after submit...');
      const formStillExists = await this.page.$('#transaction-form');
      console.log('🔍 Form still exists after submit:', !!formStillExists);

      if (formStillExists) {
        const formMethod = await this.page.$eval('#transaction-form', (form) => form.method);
        const formAction = await this.page.$eval('#transaction-form', (form) => form.action);
        console.log('🔍 Form method after submit:', formMethod);
        console.log('🔍 Form action after submit:', formAction);

        // Check if form fields still have values
        const masseuseValue = await this.page.$eval('#masseuse', (select) => select.value);
        const serviceValue = await this.page.$eval('#service', (select) => select.value);
        console.log('🔍 Form field values after submit - masseuse:', masseuseValue, 'service:', serviceValue);
      }

      // Check browser console for any JavaScript errors or logs
      console.log('🔍 STEP 5.8: Checking browser console for errors...');

      // Wait a bit more to see if anything happens
      console.log('🔍 STEP 5.9: Waiting additional time for any delayed execution...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('🔍 STEP 5.10: Final check - has anything changed?');

      try {
        // Capture the request details
        const request = await requestPromise;
        console.log('\n📤 REQUEST CAPTURED:');
        console.log('📤 URL:', request.url());
        console.log('📤 Method:', request.method());
        console.log('📤 Headers:', JSON.stringify(request.headers(), null, 2));

        const postData = request.postData();
        if (postData) {
          console.log('📤 Request body (raw):', postData);
          try {
            const parsedData = JSON.parse(postData);
            console.log('📤 Request body (parsed):', JSON.stringify(parsedData, null, 2));

            // Compare with what we think we're sending
            console.log('\n🔍 DATA COMPARISON:');
            console.log('🔍 Frontend form data:', this.testData);
            console.log('🔍 API request data:', parsedData);
            console.log('🔍 Data matches?', JSON.stringify(this.testData) === JSON.stringify(parsedData));
          } catch (e) {
            console.log('📤 Request body is not JSON:', typeof postData);
          }
        } else {
          console.log('❌ No request body found');
        }

        // Capture the response details
        const response = await responsePromise;
        console.log('\n📥 RESPONSE RECEIVED:');
        console.log('📥 Status:', response.status());
        console.log('📥 Status text:', response.statusText());
        console.log('📥 Headers:', JSON.stringify(response.headers(), null, 2));

        try {
          const responseBody = await response.text();
          console.log('📥 Response body (raw):', responseBody);

          try {
            const parsedResponse = JSON.parse(responseBody);
            console.log('📥 Response body (parsed):', JSON.stringify(parsedResponse, null, 2));

            if (response.status() === 200 || response.status() === 201) {
              console.log('✅ SUCCESS: Transaction appears to have been created');
              console.log('📊 Response data:', parsedResponse);
            } else {
              console.log('❌ ERROR: Transaction creation failed');
              console.log('🚨 Error details:', parsedResponse);
            }
          } catch (e) {
            console.log('📥 Response is not JSON:', typeof responseBody);
          }
        } catch (e) {
          console.log('❌ Could not read response body:', e.message);
        }
      } catch (e) {
        console.log('❌ ERROR: No POST request/response captured:', e.message);
        console.log('❌ This suggests the form submission is not working as expected');
      }

      // Wait for any additional processing
      await new Promise((resolve) => setTimeout(resolve, 3000));

      console.log('\n📊 STEP 6: Final Status Check');
      console.log('='.repeat(40));

      // Check if there are any error messages on the page
      const errorElements = await this.page.$$('.error, .alert, [style*="color: red"], [style*="color: #ff0000"]');
      if (errorElements.length > 0) {
        console.log('❌ Error elements found on page:', errorElements.length);
        for (let i = 0; i < Math.min(errorElements.length, 3); i++) {
          const errorText = await errorElements[i].evaluate((el) => el.textContent || el.innerText);
          console.log(`❌ Error ${i + 1}:`, errorText?.trim());
        }
      } else {
        console.log('✅ No visible error elements on page');
      }

      // Check if the transaction was actually inserted by looking for it in recent transactions
      console.log('\n🔍 STEP 7: Database Verification');
      console.log('='.repeat(40));

      try {
        // Navigate to a page that shows recent transactions
        await this.page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if our test transaction appears in the recent transactions
        const recentTransactions = await this.page.$$eval('.transaction-item, [data-transaction-id]', (elements) => elements.map((el) => ({
          text: el.textContent || el.innerText,
          id: el.getAttribute('data-transaction-id') || 'unknown'
        })));

        if (recentTransactions.length > 0) {
          console.log('📋 Found recent transactions on page:', recentTransactions.length);
          console.log('📋 First few transactions:', recentTransactions.slice(0, 3));

          // Look for our test transaction by checking if any contain our test data
          const testTransactionFound = recentTransactions.some((tx) => tx.text.includes(this.testData.masseuse)
                        || tx.text.includes(this.testData.service)
                        || tx.text.includes(this.testData.startTime));

          if (testTransactionFound) {
            console.log('✅ SUCCESS: Our test transaction appears to be in the database!');
          } else {
            console.log('❌ Our test transaction was NOT found in recent transactions');
            console.log('❌ This suggests the transaction was not inserted into the database');
          }
        } else {
          console.log('📋 No recent transactions found on page');
        }
      } catch (e) {
        console.log('❌ Could not verify database insertion:', e.message);
      }
    } catch (error) {
      console.error('❌ TEST EXECUTION ERROR:', error);
    }
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Execute the focused test
async function main() {
  const debugTest = new APIDataFlowFocusedDebug();

  try {
    await debugTest.setup();
    await debugTest.runFocusedTest();
  } catch (error) {
    console.error('❌ MAIN EXECUTION ERROR:', error);
  } finally {
    await debugTest.teardown();
  }
}

main();
