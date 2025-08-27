const puppeteer = require('puppeteer');

async function debugAllHypotheses() {
  console.log('🔍 COMPREHENSIVE HYPOTHESIS TESTING');
  console.log('=====================================');

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
    await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });

    console.log('\n[STEP 2] Logging in as manager...');
    await page.type('#username', 'manager');
    await page.type('#password', 'manager456');
    await page.click('#login-btn');

    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 3] Navigating to transaction page...');
    await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    console.log('\n[STEP 4] COMPREHENSIVE HYPOTHESIS TESTING...');

    // TEST ALL 5 HYPOTHESES SIMULTANEOUSLY

    const results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS TESTING STARTED');

      // HYPOTHESIS 1: Function Definition Syntax Error
      console.log('🔍 HYPOTHESIS 1: Checking function definition syntax...');
      try {
        console.log('🔍 HYPOTHESIS 1a: typeof updateTimeDropdowns:', typeof updateTimeDropdowns);
        console.log('🔍 HYPOTHESIS 1b: updateTimeDropdowns.toString():', updateTimeDropdowns.toString());
        console.log('🔍 HYPOTHESIS 1c: Function length:', updateTimeDropdowns.length);
        console.log('🔍 HYPOTHESIS 1d: Function name:', updateTimeDropdowns.name);
        console.log('✅ HYPOTHESIS 1: Function definition appears valid');
      } catch (error) {
        console.log('❌ HYPOTHESIS 1: Function definition error:', error.message);
      }

      // HYPOTHESIS 2: Function Scope/Context Issue
      console.log('🔍 HYPOTHESIS 2: Checking function scope and context...');
      try {
        console.log('🔍 HYPOTHESIS 2a: window.updateTimeDropdowns exists:', typeof window.updateTimeDropdowns);
        console.log('🔍 HYPOTHESIS 2b: this.updateTimeDropdowns exists:', typeof this.updateTimeDropdowns);
        console.log('🔍 HYPOTHESIS 2c: Global scope check:', typeof globalThis.updateTimeDropdowns);
        console.log('🔍 HYPOTHESIS 2d: Direct function call test...');

        // Try to call the function directly
        const result = updateTimeDropdowns();
        console.log('🔍 HYPOTHESIS 2e: Direct function call result:', result);
        console.log('✅ HYPOTHESIS 2: Function is accessible and callable');
      } catch (error) {
        console.log('❌ HYPOTHESIS 2: Function scope/context error:', error.message);
      }

      // HYPOTHESIS 3: Duplicate Function Definitions
      console.log('🔍 HYPOTHESIS 3: Checking for duplicate function definitions...');
      try {
        // Count how many times the function appears in the page
        const scriptTags = document.querySelectorAll('script');
        console.log('🔍 HYPOTHESIS 3a: Total script tags found:', scriptTags.length);

        let functionCount = 0;
        scriptTags.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          if (content.includes('function updateTimeDropdowns')) {
            functionCount++;
            console.log(`🔍 HYPOTHESIS 3b: Function found in script tag ${index}`);
          }
        });
        console.log('🔍 HYPOTHESIS 3c: Total function definitions found:', functionCount);

        if (functionCount > 1) {
          console.log('❌ HYPOTHESIS 3: Multiple function definitions detected!');
        } else if (functionCount === 1) {
          console.log('✅ HYPOTHESIS 3: Single function definition found');
        } else {
          console.log('❌ HYPOTHESIS 3: No function definitions found!');
        }
      } catch (error) {
        console.log('❌ HYPOTHESIS 3: Duplicate check error:', error.message);
      }

      // HYPOTHESIS 4: Function Override/Shadowing
      console.log('🔍 HYPOTHESIS 4: Checking for function override/shadowing...');
      try {
        // Store original function
        const originalFunction = updateTimeDropdowns;
        console.log('🔍 HYPOTHESIS 4a: Original function stored');

        // Try to redefine the function
        window.updateTimeDropdowns = function () {
          console.log('🔍 HYPOTHESIS 4b: Override function called');
          return 'OVERRIDE_TEST';
        };
        console.log('🔍 HYPOTHESIS 4c: Function overridden');

        // Test the override
        const overrideResult = updateTimeDropdowns();
        console.log('🔍 HYPOTHESIS 4d: Override function result:', overrideResult);

        // Restore original function
        window.updateTimeDropdowns = originalFunction;
        console.log('🔍 HYPOTHESIS 4e: Original function restored');

        console.log('✅ HYPOTHESIS 4: Function can be overridden and restored');
      } catch (error) {
        console.log('❌ HYPOTHESIS 4: Function override test error:', error.message);
      }

      // HYPOTHESIS 5: HTML Parsing/Encoding Issue
      console.log('🔍 HYPOTHESIS 5: Checking HTML parsing and encoding...');
      try {
        // Check if the function is actually in the DOM
        const bodyText = document.body.textContent;
        const hasFunction = bodyText.includes('updateTimeDropdowns');
        console.log('🔍 HYPOTHESIS 5a: Function name found in body text:', hasFunction);

        // Check script content for corruption
        const scripts = Array.from(document.querySelectorAll('script')).map((s) => s.textContent || s.innerHTML);
        const functionScripts = scripts.filter((s) => s.includes('updateTimeDropdowns'));
        console.log('🔍 HYPOTHESIS 5b: Scripts containing function:', functionScripts.length);

        if (functionScripts.length > 0) {
          const firstScript = functionScripts[0];
          console.log('🔍 HYPOTHESIS 5c: First script content length:', firstScript.length);
          console.log('🔍 HYPOTHESIS 5d: Script contains console.log:', firstScript.includes('console.log'));
          console.log('🔍 HYPOTHESIS 5e: Script contains alert:', firstScript.includes('alert'));
        }

        console.log('✅ HYPOTHESIS 5: HTML parsing appears normal');
      } catch (error) {
        console.log('❌ HYPOTHESIS 5: HTML parsing check error:', error.message);
      }

      // FINAL COMPREHENSIVE TEST
      console.log('🔍 FINAL TEST: Calling function with extensive logging...');
      try {
        console.log('🔍 FINAL TEST 1: About to call updateTimeDropdowns()');
        const finalResult = updateTimeDropdowns();
        console.log('🔍 FINAL TEST 2: Function call completed, result:', finalResult);
        console.log('🔍 FINAL TEST 3: Checking DOM state after function call...');

        const startTime = document.getElementById('startTime');
        const endTime = document.getElementById('endTime');
        const duration = document.getElementById('duration');

        console.log('🔍 FINAL TEST 4: startTime element:', !!startTime);
        console.log('🔍 FINAL TEST 5: endTime element:', !!endTime);
        console.log('🔍 FINAL TEST 6: duration element:', !!duration);

        if (startTime) console.log('🔍 FINAL TEST 7: startTime value:', startTime.value);
        if (endTime) console.log('🔍 FINAL TEST 8: endTime value:', endTime.value);
        if (duration) console.log('🔍 FINAL TEST 9: duration value:', duration.value);

        if (endTime) {
          const options = Array.from(endTime.options);
          console.log('🔍 FINAL TEST 10: endTime options count:', options.length);
          options.forEach((opt, index) => {
            console.log(`🔍 FINAL TEST 11: Option ${index}:`, opt.value, opt.text, opt.selected);
          });
        }

        console.log('✅ FINAL TEST: Function execution completed successfully');
        return 'SUCCESS';
      } catch (error) {
        console.log('❌ FINAL TEST: Function execution failed:', error.message);
        console.log('❌ FINAL TEST: Error stack:', error.stack);
        return `FAILED: ${error.message}`;
      }
    });

    console.log('📋 COMPREHENSIVE TEST RESULTS:', results);

    // Wait for all console messages to be processed
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('\n🧪 COMPREHENSIVE HYPOTHESIS TESTING COMPLETE');
    console.log('================================================');
    console.log('Check the console output above for detailed results');
  } catch (error) {
    console.error('❌ TEST FAILED:', error);
  } finally {
    await browser.close();
  }
}

debugAllHypotheses().catch(console.error);
