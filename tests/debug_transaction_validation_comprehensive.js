const puppeteer = require('puppeteer');

async function debugTransactionValidationComprehensive() {
  console.log('🚀 STARTING COMPREHENSIVE TRANSACTION VALIDATION DEBUGGING');
  console.log('🔍 TESTING ALL 5 HYPOTHESES SIMULTANEOUSLY');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
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

    // Enable extensive logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
      } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
        console.log(`📝 PAGE LOG: ${msg.text()}`);
      }
    });

    page.on('pageerror', (error) => console.log('❌ BROWSER ERROR:', error.message));
    page.on('request', (request) => console.log('📤 REQUEST:', request.method(), request.url()));
    page.on('response', (response) => console.log('📥 RESPONSE:', response.status(), response.url()));

    console.log('\n[STEP 1] Navigating to login page...');
    await page.goto('https://109.123.238.197.sslip.io/login.html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Login as manager
    console.log('\n[STEP 2] Logging in as manager...');
    await page.type('#username', 'manager');
    await page.type('#password', 'manager456');
    await page.click('#login-btn');

    // Wait for redirect and login
    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 3] Navigating to transaction page...');
    await page.goto('https://109.123.238.197.sslip.io/transaction.html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('\n[STEP 4] Waiting for page to load completely...');
    await page.waitForSelector('#transaction-form', { timeout: 10000 });
    await page.waitForSelector('#masseuse', { timeout: 10000 });
    await page.waitForSelector('#service', { timeout: 10000 });

    // Wait for dropdowns to populate
    console.log('\n[STEP 5] Waiting for dropdowns to populate...');
    await page.waitForFunction(() => {
      const masseuseSelect = document.querySelector('#masseuse');
      const serviceSelect = document.querySelector('#service');
      return masseuseSelect?.options?.length > 0 && serviceSelect?.options?.length > 0;
    }, { timeout: 10000 });

    console.log('\n[STEP 6] Checking initial form state and dropdown data...');
    const initialState = await page.evaluate(() => {
      console.log('🔍 CLIENT-SIDE: Checking initial form state...');

      const form = document.querySelector('#transaction-form');
      const masseuseSelect = document.querySelector('#masseuse');
      const serviceSelect = document.querySelector('#service');
      const paymentSelect = document.querySelector('#payment');

      console.log('🔍 CLIENT-SIDE: Form found:', !!form);
      console.log('🔍 CLIENT-SIDE: Masseuse options:', masseuseSelect?.options?.length || 0);
      console.log('🔍 CLIENT-SIDE: Service options:', serviceSelect?.options?.length || 0);
      console.log('🔍 CLIENT-SIDE: Payment options:', paymentSelect?.options?.length || 0);

      // Log all available options
      const masseuseOptions = Array.from(masseuseSelect?.options || []).map((opt) => opt.value);
      const serviceOptions = Array.from(serviceSelect?.options || []).map((opt) => opt.value);
      const paymentOptions = Array.from(paymentSelect?.options || []).map((opt) => opt.value);

      console.log('🔍 CLIENT-SIDE: Masseuse options:', masseuseOptions);
      console.log('🔍 CLIENT-SIDE: Service options:', serviceOptions);
      console.log('🔍 CLIENT-SIDE: Payment options:', paymentOptions);

      return {
        formExists: !!form,
        masseuseCount: masseuseSelect?.options?.length || 0,
        serviceCount: serviceSelect?.options?.length || 0,
        paymentCount: paymentSelect?.options?.length || 0,
        masseuseOptions,
        serviceOptions,
        paymentOptions
      };
    });

    console.log('📋 INITIAL FORM STATE:', initialState);

    console.log('\n[STEP 7] Selecting form values for testing...');
    await page.select('#masseuse', initialState.masseuseOptions[0] || 'สา');
    await page.select('#service', initialState.serviceOptions[0] || 'Aroma massage');
    await page.select('#payment', initialState.paymentOptions[0] || 'Cash');

    // Set time values
    await page.type('#startTime', '8:00 PM');
    await page.type('#endTime', '9:00 PM');

    console.log('\n[STEP 8] Capturing form data before submission...');
    const formDataBeforeSubmit = await page.evaluate(() => {
      console.log('🔍 CLIENT-SIDE: Capturing form data before submission...');

      const form = document.querySelector('#transaction-form');
      const formData = new FormData(form);

      // Log all form field values
      const allFields = {};
      for (const [key, value] of formData.entries()) {
        allFields[key] = value;
        console.log(`🔍 CLIENT-SIDE: Form field ${key}: ${value}`);
      }

      // Also check individual element values
      const individualValues = {
        masseuse: document.querySelector('#masseuse')?.value,
        service: document.querySelector('#service')?.value,
        payment: document.querySelector('#payment')?.value,
        startTime: document.querySelector('#startTime')?.value,
        endTime: document.querySelector('#endTime')?.value,
        customerContact: document.querySelector('#customerContact')?.value
      };

      console.log('🔍 CLIENT-SIDE: Individual field values:', individualValues);

      return { formData: allFields, individualValues };
    });

    console.log('📋 FORM DATA BEFORE SUBMIT:', formDataBeforeSubmit);

    console.log('\n[STEP 9] Intercepting network requests to see exact payload...');
    const requestPayloads = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/transactions') && request.method() === 'POST') {
        console.log('🔍 INTERCEPTING TRANSACTION REQUEST...');
        const postData = request.postData();
        console.log('🔍 REQUEST PAYLOAD:', postData);
        requestPayloads.push(postData);
      }
    });

    console.log('\n[STEP 10] Submitting form and monitoring response...');

    // Click submit and wait for response
    await Promise.all([
      page.waitForResponse((response) => response.url().includes('/api/transactions')),
      page.click('button[type="submit"]')
    ]);

    console.log('\n[STEP 11] Analyzing response and any errors...');
    const responseAnalysis = await page.evaluate(() => {
      console.log('🔍 CLIENT-SIDE: Analyzing response and errors...');

      // Check for any error messages on page
      const errorElements = document.querySelectorAll('.error, .alert, [style*="red"], [style*="error"]');
      const errorMessages = Array.from(errorElements).map((el) => el.textContent);

      console.log('🔍 CLIENT-SIDE: Error elements found:', errorElements.length);
      console.log('🔍 CLIENT-SIDE: Error messages:', errorMessages);

      // Check if form was cleared (success indicator)
      const formCleared = !document.querySelector('#masseuse')?.value;

      return {
        errorCount: errorElements.length,
        errorMessages,
        formCleared,
        currentUrl: window.location.href
      };
    });

    console.log('📋 RESPONSE ANALYSIS:', responseAnalysis);

    console.log('\n[STEP 12] Testing Hypothesis 1: Field Name Mismatch');
    console.log('🔍 HYPOTHESIS 1: Frontend sends payment_method but backend expects payment_amount and masseuse_fee');
    console.log('📋 Frontend sends:', formDataBeforeSubmit.formData);
    console.log('📋 Backend expects (from validation middleware): payment_amount, masseuse_fee');

    console.log('\n[STEP 13] Testing Hypothesis 2: Missing Required Fields');
    console.log('🔍 HYPOTHESIS 2: Backend validation requires fields that frontend doesn\'t send');
    const requiredBackendFields = ['masseuse_name', 'service_type', 'payment_amount', 'masseuse_fee', 'start_time', 'end_time'];
    const sentFrontendFields = Object.keys(formDataBeforeSubmit.formData);
    const missingFields = requiredBackendFields.filter((field) => !sentFrontendFields.includes(field));
    console.log('📋 Missing required fields:', missingFields);

    console.log('\n[STEP 14] Testing Hypothesis 3: Data Type Mismatch');
    console.log('🔍 HYPOTHESIS 3: Frontend sends string values but backend expects numeric for amounts');
    console.log('📋 Frontend payment value type:', typeof formDataBeforeSubmit.formData.payment);
    console.log('📋 Backend expects: payment_amount (decimal), masseuse_fee (decimal)');

    console.log('\n[STEP 15] Testing Hypothesis 4: Service Lookup Failure');
    console.log('🔍 HYPOTHESIS 4: Service name in dropdown doesn\'t match database exactly');
    console.log('📋 Selected service:', formDataBeforeSubmit.individualValues.service);
    console.log('📋 Available services:', initialState.serviceOptions);

    console.log('\n[STEP 16] Testing Hypothesis 5: Validation Middleware Conflict');
    console.log('🔍 HYPOTHESIS 5: Input validation middleware rejecting data before it reaches transaction route');
    console.log('📋 Request was made to /api/transactions');
    console.log('📋 Response status:', responseAnalysis);

    console.log('\n[STEP 17] Final Analysis and Root Cause Identification');
    console.log('🔍 COMPREHENSIVE TESTING COMPLETE');
    console.log('📋 All 5 hypotheses tested simultaneously');
    console.log('📋 Extensive logging captured at every step');

    // Summary of findings
    const findings = {
      hypothesis1: {
        description: 'Field Name Mismatch',
        status: missingFields.length > 0 ? 'CONFIRMED' : 'ELIMINATED',
        details: `Missing fields: ${missingFields.join(', ')}`
      },
      hypothesis2: {
        description: 'Missing Required Fields',
        status: missingFields.length > 0 ? 'CONFIRMED' : 'ELIMINATED',
        details: `Required: ${requiredBackendFields.join(', ')}, Sent: ${sentFrontendFields.join(', ')}`
      },
      hypothesis3: {
        description: 'Data Type Mismatch',
        status: 'NEEDS_VERIFICATION',
        details: 'Frontend sends strings, backend expects decimals for amounts'
      },
      hypothesis4: {
        description: 'Service Lookup Failure',
        status: 'NEEDS_VERIFICATION',
        details: `Selected: ${formDataBeforeSubmit.individualValues.service}`
      },
      hypothesis5: {
        description: 'Validation Middleware Conflict',
        status: 'NEEDS_VERIFICATION',
        details: 'Request reached /api/transactions endpoint'
      }
    };

    console.log('📋 FINDINGS SUMMARY:', JSON.stringify(findings, null, 2));

    // Wait a moment to see any delayed console output
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error('❌ ERROR DURING DEBUGGING:', error);
  } finally {
    await browser.close();
    console.log('🔍 COMPREHENSIVE DEBUGGING COMPLETE');
  }
}

// Run the comprehensive debugging
debugTransactionValidationComprehensive().catch(console.error);
