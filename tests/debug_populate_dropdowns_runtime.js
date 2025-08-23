const puppeteer = require('puppeteer');

async function debugPopulateDropdownsRuntime() {
  console.log('🔍 COMPREHENSIVE POPULATE DROPDOWNS RUNTIME DEBUGGING');
  console.log('=====================================================');

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
    });

    // Enable request failed logging
    page.on('requestfailed', (request) => {
      console.log(`❌ REQUEST FAILED: ${request.url()}`);
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

    console.log('\n[STEP 4] COMPREHENSIVE HYPOTHESIS TESTING...');

    // Test all 5 hypotheses simultaneously with extensive logging
    const results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS TESTING STARTED');

      // HYPOTHESIS 1: CONFIG.settings object is undefined or null
      console.log('🔍 HYPOTHESIS 1: Testing CONFIG.settings object...');
      try {
        console.log('🔍 HYPOTHESIS 1a: Checking if CONFIG exists:', typeof CONFIG);
        console.log('🔍 HYPOTHESIS 1b: CONFIG value:', CONFIG);

        if (typeof CONFIG === 'undefined') {
          console.log('❌ HYPOTHESIS 1c: CONFIG is undefined');
          return { hypothesis1: 'FAILED - CONFIG undefined', error: 'CONFIG is undefined' };
        }

        if (!CONFIG) {
          console.log('❌ HYPOTHESIS 1d: CONFIG is null or falsy');
          return { hypothesis1: 'FAILED - CONFIG null/falsy', error: 'CONFIG is null or falsy' };
        }

        console.log('🔍 HYPOTHESIS 1e: CONFIG exists, checking settings property');
        console.log('🔍 HYPOTHESIS 1f: CONFIG.settings type:', typeof CONFIG.settings);
        console.log('🔍 HYPOTHESIS 1g: CONFIG.settings value:', CONFIG.settings);

        if (typeof CONFIG.settings === 'undefined') {
          console.log('❌ HYPOTHESIS 1h: CONFIG.settings is undefined');
          return { hypothesis1: 'FAILED - CONFIG.settings undefined', error: 'CONFIG.settings is undefined' };
        }

        if (!CONFIG.settings) {
          console.log('❌ HYPOTHESIS 1i: CONFIG.settings is null or falsy');
          return { hypothesis1: 'FAILED - CONFIG.settings null/falsy', error: 'CONFIG.settings is null or falsy' };
        }

        console.log('🔍 HYPOTHESIS 1j: CONFIG.settings exists, checking individual properties');
        console.log('🔍 HYPOTHESIS 1k: CONFIG.settings.masseuses type:', typeof CONFIG.settings.masseuses);
        console.log('🔍 HYPOTHESIS 1l: CONFIG.settings.masseuses value:', CONFIG.settings.masseuses);
        console.log('🔍 HYPOTHESIS 1m: CONFIG.settings.services type:', typeof CONFIG.settings.services);
        console.log('🔍 HYPOTHESIS 1n: CONFIG.settings.services value:', CONFIG.settings.services);
        console.log('🔍 HYPOTHESIS 1o: CONFIG.settings.paymentMethods type:', typeof CONFIG.settings.paymentMethods);
        console.log('🔍 HYPOTHESIS 1p: CONFIG.settings.paymentMethods value:', CONFIG.settings.paymentMethods);

        const hypothesis1Result = 'PASSED - CONFIG.settings is properly defined';
        console.log('✅ HYPOTHESIS 1q:', hypothesis1Result);

        return { hypothesis1: hypothesis1Result, config: CONFIG.settings };
      } catch (error) {
        console.log('❌ HYPOTHESIS 1 ERROR:', error.message);
        return { hypothesis1: 'FAILED - Exception occurred', error: error.message };
      }
    });

    console.log('\n[STEP 5] HYPOTHESIS 2: Testing appData.roster object...');
    const hypothesis2Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 2: Testing appData.roster object...');

      try {
        console.log('🔍 HYPOTHESIS 2a: Checking if appData exists:', typeof appData);
        console.log('🔍 HYPOTHESIS 2b: appData value:', appData);

        if (typeof appData === 'undefined') {
          console.log('❌ HYPOTHESIS 2c: appData is undefined');
          return { hypothesis2: 'FAILED - appData undefined', error: 'appData is undefined' };
        }

        if (!appData) {
          console.log('❌ HYPOTHESIS 2d: appData is null or falsy');
          return { hypothesis2: 'FAILED - appData null/falsy', error: 'appData is null or falsy' };
        }

        console.log('🔍 HYPOTHESIS 2e: appData exists, checking roster property');
        console.log('🔍 HYPOTHESIS 2f: appData.roster type:', typeof appData.roster);
        console.log('🔍 HYPOTHESIS 2g: appData.roster value:', appData.roster);

        if (typeof appData.roster === 'undefined') {
          console.log('❌ HYPOTHESIS 2h: appData.roster is undefined');
          return { hypothesis2: 'FAILED - appData.roster undefined', error: 'appData.roster is undefined' };
        }

        if (!appData.roster) {
          console.log('❌ HYPOTHESIS 2i: appData.roster is null or falsy');
          return { hypothesis2: 'FAILED - appData.roster null/falsy', error: 'appData.roster is null or falsy' };
        }

        console.log('🔍 HYPOTHESIS 2j: appData.roster exists, checking if it\'s an array');
        console.log('🔍 HYPOTHESIS 2k: appData.roster isArray:', Array.isArray(appData.roster));
        console.log('🔍 HYPOTHESIS 2l: appData.roster length:', appData.roster.length);

        if (!Array.isArray(appData.roster)) {
          console.log('❌ HYPOTHESIS 2m: appData.roster is not an array');
          return { hypothesis2: 'FAILED - appData.roster not array', error: 'appData.roster is not an array' };
        }

        const hypothesis2Result = 'PASSED - appData.roster is properly defined array';
        console.log('✅ HYPOTHESIS 2n:', hypothesis2Result);

        return { hypothesis2: hypothesis2Result, roster: appData.roster };
      } catch (error) {
        console.log('❌ HYPOTHESIS 2 ERROR:', error.message);
        return { hypothesis2: 'FAILED - Exception occurred', error: error.message };
      }
    });

    console.log('\n[STEP 6] HYPOTHESIS 3: Testing getNextInLineFromStaff function...');
    const hypothesis3Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 3: Testing getNextInLineFromStaff function...');

      try {
        console.log('🔍 HYPOTHESIS 3a: Checking if getNextInLineFromStaff exists:', typeof getNextInLineFromStaff);

        if (typeof getNextInLineFromStaff === 'undefined') {
          console.log('❌ HYPOTHESIS 3b: getNextInLineFromStaff is undefined');
          return { hypothesis3: 'FAILED - getNextInLineFromStaff undefined', error: 'getNextInLineFromStaff is undefined' };
        }

        if (typeof getNextInLineFromStaff !== 'function') {
          console.log('❌ HYPOTHESIS 3c: getNextInLineFromStaff is not a function');
          return { hypothesis3: 'FAILED - getNextInLineFromStaff not function', error: 'getNextInLineFromStaff is not a function' };
        }

        console.log('🔍 HYPOTHESIS 3d: getNextInLineFromStaff is a function, testing execution');
        console.log('🔍 HYPOTHESIS 3e: About to call getNextInLineFromStaff()');

        try {
          const result = getNextInLineFromStaff();
          console.log('🔍 HYPOTHESIS 3f: getNextInLineFromStaff() returned:', result);
          console.log('🔍 HYPOTHESIS 3g: Result type:', typeof result);

          const hypothesis3Result = 'PASSED - getNextInLineFromStaff function works correctly';
          console.log('✅ HYPOTHESIS 3h:', hypothesis3Result);

          return { hypothesis3: hypothesis3Result, result };
        } catch (execError) {
          console.log('❌ HYPOTHESIS 3i: getNextInLineFromStaff() execution failed:', execError.message);
          return { hypothesis3: 'FAILED - Execution error', error: execError.message };
        }
      } catch (error) {
        console.log('❌ HYPOTHESIS 3 ERROR:', error.message);
        return { hypothesis3: 'FAILED - Exception occurred', error: error.message };
      }
    });

    console.log('\n[STEP 7] HYPOTHESIS 4: Testing DOM element access...');
    const hypothesis4Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 4: Testing DOM element access...');

      try {
        console.log('🔍 HYPOTHESIS 4a: Testing all required DOM elements...');

        const elements = {
          masseuse: document.getElementById('masseuse'),
          service: document.getElementById('service'),
          duration: document.getElementById('duration'),
          payment: document.getElementById('payment'),
          location: document.getElementById('location')
        };

        console.log('🔍 HYPOTHESIS 4b: DOM elements found:');
        Object.entries(elements).forEach(([name, element]) => {
          console.log(`🔍 HYPOTHESIS 4c: ${name}:`, !!element, element ? element.tagName : 'N/A');
        });

        const missingElements = Object.entries(elements).filter(([name, element]) => !element);

        if (missingElements.length > 0) {
          console.log('❌ HYPOTHESIS 4d: Missing DOM elements:', missingElements.map(([name]) => name));
          return { hypothesis4: 'FAILED - Missing DOM elements', missingElements: missingElements.map(([name]) => name) };
        }

        console.log('🔍 HYPOTHESIS 4e: All DOM elements found, testing innerHTML access');

        // Test if we can access innerHTML property
        try {
          elements.masseuse.innerHTML = '<option value="">Test</option>';
          console.log('🔍 HYPOTHESIS 4f: innerHTML write test successful');

          // Restore original content
          elements.masseuse.innerHTML = '<option value="">Select Masseuse</option>';
          console.log('🔍 HYPOTHESIS 4g: innerHTML restore successful');
        } catch (innerHTMLError) {
          console.log('❌ HYPOTHESIS 4h: innerHTML access failed:', innerHTMLError.message);
          return { hypothesis4: 'FAILED - innerHTML access error', error: innerHTMLError.message };
        }

        const hypothesis4Result = 'PASSED - All DOM elements accessible and writable';
        console.log('✅ HYPOTHESIS 4i:', hypothesis4Result);

        return { hypothesis4: hypothesis4Result, elements: Object.keys(elements) };
      } catch (error) {
        console.log('❌ HYPOTHESIS 4 ERROR:', error.message);
        return { hypothesis4: 'FAILED - Exception occurred', error: error.message };
      }
    });

    console.log('\n[STEP 8] HYPOTHESIS 5: Testing JavaScript execution in loops and event listeners...');
    const hypothesis5Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 5: Testing JavaScript execution in loops and event listeners...');

      try {
        console.log('🔍 HYPOTHESIS 5a: Testing forEach loop execution...');

        // Test if forEach works
        const testArray = ['test1', 'test2'];
        let forEachTestPassed = false;

        try {
          testArray.forEach((item, index) => {
            console.log(`🔍 HYPOTHESIS 5b: forEach test item ${index}:`, item);
            forEachTestPassed = true;
          });

          if (forEachTestPassed) {
            console.log('✅ HYPOTHESIS 5c: forEach loop execution successful');
          } else {
            console.log('❌ HYPOTHESIS 5d: forEach loop execution failed');
            return { hypothesis5: 'FAILED - forEach execution failed', error: 'forEach loop did not execute' };
          }
        } catch (forEachError) {
          console.log('❌ HYPOTHESIS 5e: forEach execution error:', forEachError.message);
          return { hypothesis5: 'FAILED - forEach execution error', error: forEachError.message };
        }

        console.log('🔍 HYPOTHESIS 5f: Testing addEventListener functionality...');

        // Test if addEventListener works
        const testElement = document.createElement('div');
        let eventListenerTestPassed = false;

        try {
          testElement.addEventListener('click', () => {
            console.log('🔍 HYPOTHESIS 5g: Event listener test successful');
            eventListenerTestPassed = true;
          });

          console.log('🔍 HYPOTHESIS 5h: addEventListener attached successfully');

          // Trigger the event
          testElement.click();

          if (eventListenerTestPassed) {
            console.log('✅ HYPOTHESIS 5i: Event listener execution successful');
          } else {
            console.log('❌ HYPOTHESIS 5j: Event listener execution failed');
            return { hypothesis5: 'FAILED - Event listener execution failed', error: 'Event listener did not execute' };
          }
        } catch (eventListenerError) {
          console.log('❌ HYPOTHESIS 5k: Event listener error:', eventListenerError.message);
          return { hypothesis5: 'FAILED - Event listener error', error: eventListenerError.message };
        }

        const hypothesis5Result = 'PASSED - JavaScript execution in loops and event listeners works correctly';
        console.log('✅ HYPOTHESIS 5l:', hypothesis5Result);

        return { hypothesis5: hypothesis5Result, forEachTest: forEachTestPassed, eventListenerTest: eventListenerTestPassed };
      } catch (error) {
        console.log('❌ HYPOTHESIS 5 ERROR:', error.message);
        return { hypothesis5: 'FAILED - Exception occurred', error: error.message };
      }
    });

    console.log('\n[STEP 9] FINAL COMPREHENSIVE ANALYSIS...');
    const finalResults = await page.evaluate(() => {
      console.log('🔍 FINAL COMPREHENSIVE ANALYSIS STARTED');

      try {
        // Try to call populateDropdowns directly to see what happens
        console.log('🔍 FINAL TEST 1: About to call populateDropdowns() directly...');

        if (typeof populateDropdowns === 'undefined') {
          console.log('❌ FINAL TEST 1a: populateDropdowns function is not defined');
          return {
            basicJS: false,
            error: 'populateDropdowns function is not defined',
            functionStatus: 'UNDEFINED'
          };
        }

        if (typeof populateDropdowns !== 'function') {
          console.log('❌ FINAL TEST 1b: populateDropdowns is not a function');
          return {
            basicJS: false,
            error: 'populateDropdowns is not a function',
            functionStatus: 'NOT_FUNCTION'
          };
        }

        console.log('🔍 FINAL TEST 1c: populateDropdowns is a function, attempting to call it...');

        try {
          const result = populateDropdowns();
          console.log('🔍 FINAL TEST 1d: populateDropdowns() executed successfully, result:', result);

          // Check if functions are now defined
          const functionNames = ['updateTimeDropdowns', 'handleSubmit', 'updateServiceOptions'];
          const functionStatus = {};

          functionNames.forEach((name) => {
            try {
              const func = eval(name);
              functionStatus[name] = typeof func === 'function';
              console.log(`🔍 FINAL TEST 1e: Function ${name} exists:`, functionStatus[name]);
            } catch (error) {
              functionStatus[name] = false;
              console.log(`🔍 FINAL TEST 1f: Function ${name} error:`, error.message);
            }
          });

          console.log('🔍 FINAL TEST 1g: All function status:', functionStatus);

          return {
            basicJS: true,
            populateDropdownsResult: result,
            functionStatus
          };
        } catch (execError) {
          console.log('❌ FINAL TEST 1h: populateDropdowns() execution failed:', execError.message);
          console.log('❌ FINAL TEST 1i: Error stack:', execError.stack);
          return {
            basicJS: false,
            error: execError.message,
            functionStatus: 'EXECUTION_FAILED',
            stack: execError.stack
          };
        }
      } catch (error) {
        console.log('❌ FINAL TEST ERROR:', error.message);
        return { basicJS: false, error: error.message };
      }
    });

    // Compile all results
    console.log('\n📋 COMPREHENSIVE TEST RESULTS:');
    console.log('=====================================');
    console.log('HYPOTHESIS 1 (CONFIG.settings):', results.hypothesis1);
    console.log('HYPOTHESIS 2 (appData.roster):', hypothesis2Results.hypothesis2);
    console.log('HYPOTHESIS 3 (getNextInLineFromStaff):', hypothesis3Results.hypothesis3);
    console.log('HYPOTHESIS 4 (DOM element access):', hypothesis4Results.hypothesis4);
    console.log('HYPOTHESIS 5 (JavaScript execution):', hypothesis5Results.hypothesis5);
    console.log('FINAL TEST (populateDropdowns execution):', finalResults.basicJS);

    // Determine the root cause
    let rootCause = 'Unknown';
    if (results.hypothesis1 && results.hypothesis1.includes('FAILED')) rootCause = 'CONFIG.settings issue';
    else if (hypothesis2Results.hypothesis2 && hypothesis2Results.hypothesis2.includes('FAILED')) rootCause = 'appData.roster issue';
    else if (hypothesis3Results.hypothesis3 && hypothesis3Results.hypothesis3.includes('FAILED')) rootCause = 'getNextInLineFromStaff function issue';
    else if (hypothesis4Results.hypothesis4 && hypothesis4Results.hypothesis4.includes('FAILED')) rootCause = 'DOM element access issue';
    else if (hypothesis5Results.hypothesis5 && hypothesis5Results.hypothesis5.includes('FAILED')) rootCause = 'JavaScript execution issue';
    else if (!finalResults.basicJS) rootCause = 'populateDropdowns execution issue';
    else rootCause = 'All hypotheses passed - issue elsewhere';

    console.log(`\n🎯 ROOT CAUSE IDENTIFIED: ${rootCause}`);

    // Show detailed results for debugging
    if (results.error) console.log('HYPOTHESIS 1 ERROR:', results.error);
    if (hypothesis2Results.error) console.log('HYPOTHESIS 2 ERROR:', hypothesis2Results.error);
    if (hypothesis3Results.error) console.log('HYPOTHESIS 3 ERROR:', hypothesis3Results.error);
    if (hypothesis4Results.error) console.log('HYPOTHESIS 4 ERROR:', hypothesis4Results.error);
    if (hypothesis5Results.error) console.log('HYPOTHESIS 5 ERROR:', hypothesis5Results.error);
    if (finalResults.error) console.log('FINAL TEST ERROR:', finalResults.error);
  } catch (error) {
    console.error('❌ SCRIPT ERROR:', error);
  } finally {
    await browser.close();
  }
}

debugPopulateDropdownsRuntime().catch(console.error);
