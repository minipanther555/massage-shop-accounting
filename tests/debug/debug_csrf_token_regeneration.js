#!/usr/bin/env node

/**
 * Comprehensive CSRF Token Regeneration Debugging
 * Tests the complete authentication flow: login -> get CSRF token -> use token -> check if regenerated
 * Tests all 5 hypotheses for excessive CSRF token generation with extensive logging
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

// Test the complete CSRF token workflow with extensive logging
const CSRF_WORKFLOW_TESTS = [
  {
    name: 'HYPOTHESIS 1: Server-Side CSRF Token Generation Bug',
    description: 'Test if server generates new CSRF tokens on every request instead of reusing existing ones',
    steps: [
      {
        name: 'Step 1: Login and get initial CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken']
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
        compareWith: 'previous_csrf_token'
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
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 4: Try API call with original CSRF token',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'CSRF_TOKEN_PLACEHOLDER'
        },
        expected: 'Should work if CSRF token is still valid',
        logResponse: true
      }
    ]
  },
  {
    name: 'HYPOTHESIS 2: Frontend CSRF Token Request Bug',
    description: 'Test if frontend is requesting new CSRF tokens on every page load or API call',
    steps: [
      {
        name: 'Step 1: Login and get initial CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken']
      },
      {
        name: 'Step 2: Simulate page load by requesting HTML page',
        path: '/admin-staff.html',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 HTML page',
        logResponse: false
      },
      {
        name: 'Step 3: Check if CSRF token changed after page load',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200, check if CSRF token is different (indicating frontend regeneration)',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token'
      }
    ]
  },
  {
    name: 'HYPOTHESIS 3: Session Storage Mismatch',
    description: 'Test if server stores CSRF tokens in one place but retrieves them from another',
    steps: [
      {
        name: 'Step 1: Login and get initial CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken']
      },
      {
        name: 'Step 2: Check session status immediately',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 3: Check session status with slight delay',
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
        delay: 1000
      }
    ]
  },
  {
    name: 'HYPOTHESIS 4: CSRF Token Validation Logic Error',
    description: "Test if server's CSRF validation logic is incorrectly rejecting valid tokens",
    steps: [
      {
        name: 'Step 1: Login and get initial CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken']
      },
      {
        name: 'Step 2: Try API call with valid CSRF token immediately',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'CSRF_TOKEN_PLACEHOLDER'
        },
        expected: 'Should work if CSRF validation logic is correct',
        logResponse: true
      },
      {
        name: 'Step 3: Try API call with same CSRF token after delay',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'CSRF_TOKEN_PLACEHOLDER'
        },
        expected: "Should work if CSRF validation logic is correct and tokens don't expire",
        logResponse: true,
        delay: 2000
      }
    ]
  },
  {
    name: 'HYPOTHESIS 5: CSRF Token Storage Corruption',
    description: 'Test if CSRF tokens are being corrupted or overwritten between requests',
    steps: [
      {
        name: 'Step 1: Login and get initial CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with session token and CSRF token',
        logResponse: true,
        extractData: ['sessionId', 'csrfToken']
      },
      {
        name: 'Step 2: Check session status multiple times rapidly',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with consistent CSRF token',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 3: Check session status again (consistency test)',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200 with same CSRF token if no corruption',
        logResponse: true,
        extractData: ['csrfToken'],
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 4: Try API call with original CSRF token',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'CSRF_TOKEN_PLACEHOLDER'
        },
        expected: "Should work if CSRF token wasn't corrupted",
        logResponse: true
      }
    ]
  }
];

// Global variables to track session state between tests
let currentSession = null;
let currentCSRFToken = null;
let previousCSRFToken = null;

async function executeCSRFWorkflowStep(step, testName) {
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

    if (currentCSRFToken && finalHeaders['X-CSRF-Token'] && finalHeaders['X-CSRF-Token'].includes('CSRF_TOKEN_PLACEHOLDER')) {
      finalHeaders['X-CSRF-Token'] = finalHeaders['X-CSRF-Token'].replace('CSRF_TOKEN_PLACEHOLDER', currentCSRFToken);
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
          csrfTokenChanged: false
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
            }
            if (responseData.token) {
              previousCSRFToken = currentCSRFToken;
              currentCSRFToken = responseData.token;
              console.log(`🛡️ Token extracted: ${currentCSRFToken.substring(0, 20)}...`);
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
              } else if (previousCSRFToken && newToken === previousCSRFToken) {
                console.log(`✅ CSRF Token consistent: ${newToken.substring(0, 20)}...`);
              }
              previousCSRFToken = newToken;
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
        csrfTokenChanged: false
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
        csrfTokenChanged: false
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

async function runComprehensiveCSRFDebugging() {
  console.log('🚀 COMPREHENSIVE CSRF TOKEN REGENERATION DEBUGGING');
  console.log('==================================================');
  console.log('Testing complete CSRF token workflow with extensive logging\n');

  const allResults = [];

  for (const workflow of CSRF_WORKFLOW_TESTS) {
    console.log(`\n${workflow.name}`);
    console.log(`${workflow.description}`);
    console.log('='.repeat(workflow.name.length));

    for (const step of workflow.steps) {
      const result = await executeCSRFWorkflowStep(step, workflow.name);
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
  console.log('\n\n📊 COMPREHENSIVE CSRF DEBUGGING RESULTS');
  console.log('==========================================');

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

  console.log('\n🎯 NEXT STEPS:');
  if (stepsWithCSRFTokenChanged > 0) {
    console.log('1. 🎯 ROOT CAUSE IDENTIFIED: CSRF tokens are being regenerated too frequently');
    console.log('2. Focus debugging efforts on the specific hypothesis that produced token changes');
    console.log('3. Check server logs for detailed information about token generation');
    console.log('4. Investigate the specific code path that causes token regeneration');
  } else if (stepsWith500Error > 0) {
    console.log('1. The 500 errors above reveal the root cause');
    console.log('2. Focus debugging efforts on that specific workflow step');
    console.log('3. Check server logs for detailed error information');
  } else if (stepsWithCSRFError > 0) {
    console.log('1. CSRF errors detected - token validation is the issue');
    console.log('2. Focus on CSRF token generation, storage, and validation');
    console.log('3. Check if tokens are being regenerated or expired');
  } else {
    console.log('1. No CSRF token changes, 500 errors, or CSRF errors detected');
    console.log('2. The issue may be in browser-side session management');
    console.log('3. Check browser developer tools for session/cookie issues');
  }
}

// Run the comprehensive CSRF debugging
runComprehensiveCSRFDebugging().catch(console.error);
