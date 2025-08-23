#!/usr/bin/env node

/**
 * Comprehensive CSRF Token Regeneration Root Cause Debugging
 * Tests the complete authentication flow: login -> extract CSRF token -> navigate -> check token changes
 * Tests all 5 hypotheses for WHY CSRF tokens are being regenerated with extensive logging
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

// Test the complete CSRF token workflow with extensive logging
const CSRF_ROOT_CAUSE_TESTS = [
  {
    name: 'HYPOTHESIS 1: Server-Side CSRF Token Generation on Every Request',
    description: "Test if server's CSRF middleware generates new tokens on every API call instead of reusing existing ones",
    steps: [
      {
        name: 'Step 1: Login and extract CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken'],
        logExtraction: true
      },
      {
        name: 'Step 2: Check session status (should return same CSRF token)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if server reuses tokens',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      },
      {
        name: 'Step 3: Check session status again (should return same CSRF token)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if server reuses tokens',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      },
      {
        name: 'Step 4: Try API call with original CSRF token',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: 'Should work if CSRF token is still valid and not regenerated',
        logResponse: true,
        logHeaders: true
      }
    ]
  },
  {
    name: 'HYPOTHESIS 2: Frontend JavaScript CSRF Token Refresh',
    description: 'Test if frontend JavaScript automatically requests new CSRF tokens on every page load or API call',
    steps: [
      {
        name: 'Step 1: Login and extract CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken'],
        logExtraction: true
      },
      {
        name: 'Step 2: Simulate page load by requesting HTML page (this might trigger frontend CSRF refresh)',
        path: '/admin-staff.html',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 HTML page, but might trigger CSRF token refresh',
        logResponse: false,
        logNote: 'This simulates what happens when user navigates to staff admin page'
      },
      {
        name: 'Step 3: Check if CSRF token changed after page load (indicating frontend regeneration)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200, check if CSRF token is different (indicating frontend regeneration)',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      },
      {
        name: 'Step 4: Try API call with original CSRF token (should fail if frontend regenerated)',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: "Should fail if frontend regenerated CSRF token, succeed if it didn't",
        logResponse: true,
        logHeaders: true
      }
    ]
  },
  {
    name: 'HYPOTHESIS 3: CSRF Token Storage Location Mismatch',
    description: 'Test if server stores CSRF tokens in one place but retrieves them from another',
    steps: [
      {
        name: 'Step 1: Login and extract CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken'],
        logExtraction: true
      },
      {
        name: 'Step 2: Check session status immediately (should return same CSRF token)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if storage is consistent',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      },
      {
        name: 'Step 3: Check session status with slight delay (tests storage persistence)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if storage is consistent across time',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true,
        delay: 2000
      },
      {
        name: 'Step 4: Try API call with original CSRF token (tests if storage mismatch affects validation)',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: "Should work if storage is consistent, fail if there's a mismatch",
        logResponse: true,
        logHeaders: true
      }
    ]
  },
  {
    name: 'HYPOTHESIS 4: CSRF Token Expiration Logic Bug',
    description: "Test if server's CSRF token expiration logic incorrectly marks tokens as expired immediately",
    steps: [
      {
        name: 'Step 1: Login and extract CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken'],
        logExtraction: true
      },
      {
        name: 'Step 2: Try API call with valid CSRF token immediately (should work if no expiration bug)',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: 'Should work if CSRF expiration logic is correct',
        logResponse: true,
        logHeaders: true
      },
      {
        name: 'Step 3: Try API call with same CSRF token after short delay (tests expiration timing)',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: "Should work if expiration logic is correct and tokens don't expire too quickly",
        logResponse: true,
        logHeaders: true,
        delay: 1000
      },
      {
        name: 'Step 4: Check if CSRF token changed due to expiration (should be same if no expiration bug)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if no expiration bug',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      }
    ]
  },
  {
    name: 'HYPOTHESIS 5: CSRF Token Validation Failure',
    description: "Test if server's CSRF validation incorrectly rejects valid tokens, causing regeneration",
    steps: [
      {
        name: 'Step 1: Login and extract CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken'],
        logExtraction: true
      },
      {
        name: 'Step 2: Check session status multiple times rapidly (tests validation consistency)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with consistent CSRF token if validation is working',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      },
      {
        name: 'Step 3: Check session status again (consistency test)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if validation is consistent',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token',
        logComparison: true
      },
      {
        name: 'Step 4: Try API call with original CSRF token (tests if validation accepts valid tokens)',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: 'Should work if CSRF validation logic is correct',
        logResponse: true,
        logHeaders: true
      }
    ]
  }
];

// Global variables to track session state between tests
let currentSession = null;
let currentCSRFToken = null;
let previousCSRFToken = null;
const extractedTokens = [];

async function executeCSRFRootCauseStep(step, testName) {
  return new Promise((resolve) => {
    console.log(`\n🔍 ${testName}: ${step.name}`);
    console.log(`📋 Path: ${step.path}`);
    console.log(`📋 Method: ${step.method}`);
    console.log(`📋 Headers: ${JSON.stringify(step.headers, null, 2)}`);
    if (step.body) {
      console.log(`📋 Body: ${step.body}`);
    }

    // Replace placeholders with actual values
    const finalHeaders = { ...step.headers };
    const finalBody = step.body;

    if (currentSession && finalHeaders.Authorization && finalHeaders.Authorization.includes('SESSION_PLACEHOLDER')) {
      finalHeaders.Authorization = finalHeaders.Authorization.replace('SESSION_PLACEHOLDER', currentSession);
    }

    if (currentCSRFToken && finalHeaders['X-CSRF-Token'] && finalHeaders['X-CSRF-Token'].includes('EXTRACTED_CSRF_TOKEN')) {
      finalHeaders['X-CSRF-Token'] = finalHeaders['X-CSRF-Token'].replace('EXTRACTED_CSRF_TOKEN', currentCSRFToken);
    }

    console.log(`🔧 Final Headers: ${JSON.stringify(finalHeaders, null, 2)}`);

    const options = {
      hostname: '109.123.238.197',
      port: 80,
      path: step.path,
      method: step.method,
      headers: finalHeaders
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const result = {
          testName,
          stepName: step.name,
          path: step.path,
          method: step.method,
          status: res.statusCode,
          statusText: res.statusMessage,
          success: res.statusCode >= 200 && res.statusCode < 300,
          error: res.statusCode >= 400 ? data : null,
          headers: res.headers,
          body: data,
          is500Error: res.statusCode === 500,
          is401Error: res.statusCode === 401,
          isCSRFError: data.includes('CSRF') || data.includes('csrf'),
          csrfTokenChanged: false,
          extractedData: {}
        };

        console.log(`📊 Result: ${res.statusCode} ${res.statusMessage}`);

        // Extract session and CSRF token from successful login
        if (step.path === '/api/auth/login' && res.statusCode === 200) {
          try {
            const responseData = JSON.parse(data);
            if (responseData.sessionId) {
              currentSession = responseData.sessionId;
              console.log(`🔑 Session extracted: ${currentSession.substring(0, 20)}...`);
            }
            if (responseData.csrfToken) {
              previousCSRFToken = currentCSRFToken;
              currentCSRFToken = responseData.csrfToken;
              console.log(`🛡️ CSRF Token extracted: ${currentCSRFToken.substring(0, 20)}...`);
              extractedTokens.push({
                step: step.name,
                token: currentCSRFToken,
                timestamp: new Date().toISOString()
              });
            }
            if (responseData.token) {
              previousCSRFToken = currentCSRFToken;
              currentCSRFToken = responseData.token;
              console.log(`🛡️ Token extracted: ${currentCSRFToken.substring(0, 20)}...`);
              extractedTokens.push({
                step: step.name,
                token: currentCSRFToken,
                timestamp: new Date().toISOString()
              });
            }

            if (step.logExtraction) {
              console.log(`📝 EXTRACTION LOG: Session=${currentSession ? 'YES' : 'NO'}, CSRF=${currentCSRFToken ? 'YES' : 'NO'}`);
            }
          } catch (e) {
            console.log(`⚠️ Could not parse login response: ${e.message}`);
          }
        }

        // Check if CSRF token changed during session checks
        if (step.path === '/api/auth/session' && res.statusCode === 200 && step.compareWith === 'previous_csrf_token') {
          try {
            const responseData = JSON.parse(data);
            if (responseData.csrfToken) {
              const newToken = responseData.csrfToken;
              if (previousCSRFToken && newToken !== previousCSRFToken) {
                result.csrfTokenChanged = true;
                console.log(`🚨 CSRF TOKEN CHANGED! Previous: ${previousCSRFToken.substring(0, 20)}... New: ${newToken.substring(0, 20)}...`);
                console.log(`🔍 This confirms the hypothesis: ${testName}`);
                console.log(`🔍 ROOT CAUSE IDENTIFIED: ${step.name}`);
              } else if (previousCSRFToken && newToken === previousCSRFToken) {
                console.log(`✅ CSRF Token consistent: ${newToken.substring(0, 20)}...`);
              }
              previousCSRFToken = newToken;

              if (step.logComparison) {
                console.log(`📊 COMPARISON LOG: Token changed=${result.csrfTokenChanged}, Previous=${previousCSRFToken ? `${previousCSRFToken.substring(0, 20)}...` : 'None'}, Current=${`${newToken.substring(0, 20)}...`}`);
              }
            }
          } catch (e) {
            console.log(`⚠️ Could not parse session response: ${e.message}`);
          }
        }

        if (result.error) {
          console.log(`❌ Error Response: ${result.error.substring(0, 300)}${result.error.length > 300 ? '...' : ''}`);
        }

        if (result.is500Error) {
          console.log('🚨 500 ERROR DETECTED - This matches your browser experience!');
        }

        if (result.isCSRFError) {
          console.log('🛡️ CSRF ERROR DETECTED - Token validation issue confirmed!');
        }

        if (result.csrfTokenChanged) {
          console.log('🔄 CSRF TOKEN REGENERATION CONFIRMED - This is the root cause!');
        }

        if (step.logResponse) {
          console.log(`📄 Full Response: ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}`);
        }

        if (step.logHeaders) {
          console.log(`📋 REQUEST HEADERS LOG: ${JSON.stringify(finalHeaders, null, 2)}`);
        }

        if (step.logNote) {
          console.log(`📝 NOTE: ${step.logNote}`);
        }

        resolve(result);
      });
    });

    req.on('error', (err) => {
      const result = {
        testName,
        stepName: step.name,
        path: step.path,
        method: step.method,
        status: 'ERROR',
        statusText: err.message,
        success: false,
        error: err.message,
        headers: {},
        body: '',
        is500Error: false,
        is401Error: false,
        isCSRFError: false,
        csrfTokenChanged: false,
        extractedData: {}
      };

      console.log(`❌ Request Error: ${err.message}`);
      resolve(result);
    });

    req.setTimeout(15000, () => {
      req.destroy();
      const result = {
        testName,
        stepName: step.name,
        path: step.path,
        method: step.method,
        status: 'TIMEOUT',
        statusText: 'Request timeout',
        success: false,
        error: 'Request timeout after 15 seconds',
        headers: {},
        body: '',
        is500Error: false,
        is401Error: false,
        isCSRFError: false,
        csrfTokenChanged: false,
        extractedData: {}
      };

      console.log('⏰ Request Timeout');
      resolve(result);
    });

    if (finalBody) {
      req.write(finalBody);
    }
    req.end();
  });
}

async function runComprehensiveCSRFRootCauseDebugging() {
  console.log('🚀 COMPREHENSIVE CSRF TOKEN REGENERATION ROOT CAUSE DEBUGGING');
  console.log('================================================================');
  console.log('Testing complete CSRF token workflow with extensive logging to diagnose WHY tokens regenerate\n');

  const allResults = [];

  for (const workflow of CSRF_ROOT_CAUSE_TESTS) {
    console.log(`\n${workflow.name}`);
    console.log(`${workflow.description}`);
    console.log('='.repeat(workflow.name.length));

    for (const step of workflow.steps) {
      const result = await executeCSRFRootCauseStep(step, workflow.name);
      allResults.push(result);

      // Add delay if specified
      if (step.delay) {
        console.log(`⏳ Waiting ${step.delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, step.delay));
      }

      // Add delay between all steps to avoid overwhelming server
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Comprehensive Analysis
  console.log('\n\n📊 COMPREHENSIVE CSRF ROOT CAUSE DEBUGGING RESULTS');
  console.log('========================================================');

  const totalSteps = allResults.length;
  const successfulSteps = allResults.filter((r) => r.success).length;
  const failedSteps = allResults.filter((r) => !r.success).length;
  const stepsWith500Error = allResults.filter((r) => r.is500Error).length;
  const stepsWithCSRFError = allResults.filter((r) => r.isCSRFError).length;
  const stepsWithCSRFTokenChanged = allResults.filter((r) => r.csrfTokenChanged).length;

  console.log(`Total Steps: ${totalSteps}`);
  console.log(`✅ Successful: ${successfulSteps}`);
  console.log(`❌ Failed: ${failedSteps}`);
  console.log(`🚨 500 Errors: ${stepsWith500Error}`);
  console.log(`🛡️ CSRF Errors: ${stepsWithCSRFError}`);
  console.log(`🔄 CSRF Token Changes: ${stepsWithCSRFTokenChanged}`);

  if (stepsWith500Error > 0) {
    console.log('\n🔴 STEPS THAT PRODUCED 500 ERRORS (Matching Your Browser):');
    allResults.filter((r) => r.is500Error).forEach((result) => {
      console.log(`• ${result.testName}: ${result.stepName} - ${result.path}`);
    });
  }

  if (stepsWithCSRFError > 0) {
    console.log('\n🛡️ STEPS THAT PRODUCED CSRF ERRORS:');
    allResults.filter((r) => r.isCSRFError).forEach((result) => {
      console.log(`• ${result.testName}: ${result.stepName} - ${result.path}`);
    });
  }

  if (stepsWithCSRFTokenChanged > 0) {
    console.log('\n🔄 STEPS WHERE CSRF TOKENS CHANGED (ROOT CAUSE IDENTIFIED):');
    allResults.filter((r) => r.csrfTokenChanged).forEach((result) => {
      console.log(`• ${result.testName}: ${result.stepName} - ${result.path}`);
    });
  }

  console.log('\n🔍 SESSION STATE TRACKING:');
  console.log(`Session: ${currentSession ? `${currentSession.substring(0, 20)}...` : 'None'}`);
  console.log(`Current CSRF Token: ${currentCSRFToken ? `${currentCSRFToken.substring(0, 20)}...` : 'None'}`);
  console.log(`Previous CSRF Token: ${previousCSRFToken ? `${previousCSRFToken.substring(0, 20)}...` : 'None'}`);

  console.log('\n📝 CSRF TOKEN EXTRACTION LOG:');
  extractedTokens.forEach((token, index) => {
    console.log(`${index + 1}. ${token.step}: ${token.token.substring(0, 20)}... (${token.timestamp})`);
  });

  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  if (stepsWithCSRFTokenChanged > 0) {
    console.log('1. 🎯 ROOT CAUSE IDENTIFIED: CSRF tokens are being regenerated too frequently');
    console.log('2. The specific hypothesis that produced token changes reveals the architectural issue');
    console.log('3. Focus debugging efforts on that specific code path');
    console.log('4. Check server logs for detailed information about token generation');
    console.log('5. Investigate the specific middleware or logic that causes token regeneration');
  } else if (stepsWith500Error > 0) {
    console.log('1. The 500 errors above reveal the root cause');
    console.log('2. Focus debugging efforts on that specific workflow step');
    console.log('3. Check server logs for detailed error information');
    console.log('4. The issue may not be CSRF token regeneration but something else');
  } else if (stepsWithCSRFError > 0) {
    console.log('1. CSRF errors detected - token validation is the issue');
    console.log('2. Focus on CSRF token generation, storage, and validation');
    console.log('3. Check if tokens are being regenerated or expired');
  } else {
    console.log('1. No CSRF token changes, 500 errors, or CSRF errors detected');
    console.log('2. The issue may be in browser-side session management');
    console.log('3. Check browser developer tools for session/cookie issues');
    console.log('4. The test may not have reproduced the real browser workflow');
  }

  console.log('\n🔧 NEXT STEPS FOR FIXING:');
  if (stepsWithCSRFTokenChanged > 0) {
    console.log('1. Identify the specific code path that causes token regeneration');
    console.log('2. Check server-side CSRF middleware implementation');
    console.log('3. Verify CSRF token storage and retrieval logic');
    console.log('4. Check if there are multiple CSRF token generation points');
    console.log('5. Implement fix to reuse existing tokens instead of generating new ones');
  } else {
    console.log('1. The test did not reproduce the CSRF token regeneration issue');
    console.log('2. Check if the issue is browser-specific or requires different test conditions');
    console.log('3. Verify the test accurately simulates the browser workflow');
    console.log('4. Check server logs for additional clues about token behavior');
  }
}

// Run the comprehensive CSRF root cause debugging
runComprehensiveCSRFRootCauseDebugging().catch(console.error);
