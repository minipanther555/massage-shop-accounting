#!/usr/bin/env node

/**
 * Comprehensive CSRF Middleware Root Cause Debugging
 * Tests all 5 hypotheses for why CSRF tokens are regenerated on every request
 * Tests CSRF token persistence and middleware behavior with extensive logging
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

// Test all 5 hypotheses for CSRF token regeneration
const CSRF_MIDDLEWARE_TESTS = [
  {
    name: 'HYPOTHESIS 1: CSRF Middleware Always Generates New Tokens',
    description: 'Test if CSRF middleware is incorrectly configured to generate new tokens on every request',
    steps: [
      {
        name: 'Step 1: Make request to any endpoint to get initial CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with CSRF token in response headers',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true
      },
      {
        name: 'Step 2: Make another request to same endpoint - check if CSRF token changed',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200, check if CSRF token in headers is different (indicating always-new generation)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 3: Make third request to same endpoint - check if CSRF token changed again',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200, check if CSRF token in headers is different again',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      }
    ]
  },
  {
    name: 'HYPOTHESIS 2: CSRF Token Storage Not Persisted',
    description: "Test if CSRF middleware generates tokens but doesn't store them properly",
    steps: [
      {
        name: 'Step 1: Make request to get CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with CSRF token in headers',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true
      },
      {
        name: 'Step 2: Make request to different endpoint - check if CSRF token persists',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200, check if CSRF token in headers is same (indicating storage works) or different (indicating storage failure)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 3: Make request to third endpoint - check if CSRF token persists',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 401 (unauthorized), but check if CSRF token in headers is same or different',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      }
    ]
  },
  {
    name: 'HYPOTHESIS 3: CSRF Token Expiration Set to 0',
    description: 'Test if CSRF middleware has expiration logic set to 0 or negative values',
    steps: [
      {
        name: 'Step 1: Make request to get CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with CSRF token in headers',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true
      },
      {
        name: 'Step 2: Wait 1 second then make request - check if token expired',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200, check if CSRF token changed (indicating immediate expiration)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token',
        delay: 1000
      },
      {
        name: 'Step 3: Wait 2 more seconds then make request - check if token expired again',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200, check if CSRF token changed again (confirming immediate expiration)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token',
        delay: 2000
      }
    ]
  },
  {
    name: 'HYPOTHESIS 4: CSRF Token Validation Always Fails',
    description: 'Test if CSRF validation logic incorrectly rejects all tokens, causing regeneration',
    steps: [
      {
        name: 'Step 1: Make request to get CSRF token',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with CSRF token in headers',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true
      },
      {
        name: 'Step 2: Make request with valid session but no CSRF token - check if validation fails',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
          // No X-CSRF-Token header
        },
        expected: 'Should return 200 or CSRF error, check response and headers',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true
      },
      {
        name: 'Step 3: Make request with valid session and CSRF token - check if validation works',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER',
          'X-CSRF-Token': 'EXTRACTED_CSRF_TOKEN'
        },
        expected: 'Should return 200, check if CSRF token in headers is same (validation works) or different (validation failed)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      }
    ]
  },
  {
    name: 'HYPOTHESIS 5: Multiple CSRF Middleware Instances',
    description: 'Test if there are multiple CSRF middleware instances running, each generating its own tokens',
    steps: [
      {
        name: 'Step 1: Make request to get CSRF token from login endpoint',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)'
        },
        body: '{"username":"manager","password":"manager456"}',
        expected: 'Should return 200 with CSRF token in headers',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true
      },
      {
        name: 'Step 2: Make request to different endpoint - check if different middleware generates different token',
        path: '/api/auth/session',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 200, check if CSRF token is different (indicating different middleware instance)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      },
      {
        name: 'Step 3: Make request to third endpoint - check if third middleware instance generates different token',
        path: '/api/admin/staff',
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Test-Browser)',
          Authorization: 'Bearer SESSION_PLACEHOLDER'
        },
        expected: 'Should return 401, but check if CSRF token is different again (indicating third middleware instance)',
        logResponse: true,
        logHeaders: true,
        extractCSRFFromHeaders: true,
        compareWith: 'previous_csrf_token'
      }
    ]
  }
];

// Global variables to track CSRF tokens between tests
let currentSession = null;
let currentCSRFToken = null;
let previousCSRFToken = null;
const extractedCSRFTokens = [];
const csrfTokenChanges = [];

async function executeCSRFMiddlewareTest(step, testName) {
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
          extractedCSRFToken: null
        };

        console.log(`📊 Result: ${res.statusCode} ${res.statusMessage}`);

        // Extract session from successful login
        if (step.path === '/api/auth/login' && res.statusCode === 200) {
          try {
            const responseData = JSON.parse(data);
            if (responseData.sessionId) {
              currentSession = responseData.sessionId;
              console.log(`🔑 Session extracted: ${currentSession.substring(0, 20)}...`);
            }
          } catch (e) {
            console.log(`⚠️ Could not parse login response: ${e.message}`);
          }
        }

        // Extract CSRF token from response headers
        if (step.extractCSRFFromHeaders && res.headers['x-csrf-token']) {
          const newCSRFToken = res.headers['x-csrf-token'];
          previousCSRFToken = currentCSRFToken;
          currentCSRFToken = newCSRFToken;
          result.extractedCSRFToken = newCSRFToken;

          console.log(`🛡️ CSRF Token extracted from headers: ${newCSRFToken.substring(0, 20)}...`);

          extractedCSRFTokens.push({
            testName,
            stepName: step.name,
            path: step.path,
            token: newCSRFToken,
            timestamp: new Date().toISOString()
          });

          // Check if CSRF token changed
          if (step.compareWith === 'previous_csrf_token' && previousCSRFToken && newCSRFToken !== previousCSRFToken) {
            result.csrfTokenChanged = true;
            console.log(`🚨 CSRF TOKEN CHANGED! Previous: ${previousCSRFToken.substring(0, 20)}... New: ${newCSRFToken.substring(0, 20)}...`);
            console.log(`🔍 This confirms the hypothesis: ${testName}`);
            console.log(`🔍 ROOT CAUSE IDENTIFIED: ${step.name}`);

            csrfTokenChanges.push({
              testName,
              stepName: step.name,
              previousToken: previousCSRFToken,
              newToken: newCSRFToken,
              path: step.path
            });
          } else if (step.compareWith === 'previous_csrf_token' && previousCSRFToken && newCSRFToken === previousCSRFToken) {
            console.log(`✅ CSRF Token consistent: ${newCSRFToken.substring(0, 20)}...`);
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
          console.log(`📋 RESPONSE HEADERS LOG: ${JSON.stringify(res.headers, null, 2)}`);
          if (res.headers['x-csrf-token']) {
            console.log(`🛡️ CSRF TOKEN IN HEADERS: ${res.headers['x-csrf-token']}`);
          } else {
            console.log('⚠️ NO CSRF TOKEN IN HEADERS');
          }
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
        extractedCSRFToken: null
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
        extractedCSRFToken: null
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

async function runComprehensiveCSRFMiddlewareDebugging() {
  console.log('🚀 COMPREHENSIVE CSRF MIDDLEWARE ROOT CAUSE DEBUGGING');
  console.log('================================================================');
  console.log('Testing all 5 hypotheses for why CSRF tokens are regenerated on every request\n');

  const allResults = [];

  for (const workflow of CSRF_MIDDLEWARE_TESTS) {
    console.log(`\n${workflow.name}`);
    console.log(`${workflow.description}`);
    console.log('='.repeat(workflow.name.length));

    for (const step of workflow.steps) {
      const result = await executeCSRFMiddlewareTest(step, workflow.name);
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
  console.log('\n\n📊 COMPREHENSIVE CSRF MIDDLEWARE DEBUGGING RESULTS');
  console.log('==========================================================');

  const totalSteps = allResults.length;
  const successfulSteps = allResults.filter((r) => r.success).length;
  const failedSteps = allResults.filter((r) => !r.success).length;
  const stepsWith500Error = allResults.filter((r) => r.is500Error).length;
  const stepsWithCSRFError = allResults.filter((r) => r.isCSRFError).length;
  const stepsWithCSRFTokenChanged = allResults.filter((r) => r.csrfTokenChanged).length;
  const stepsWithCSRFTokenExtracted = allResults.filter((r) => r.extractedCSRFToken).length;

  console.log(`Total Steps: ${totalSteps}`);
  console.log(`✅ Successful: ${successfulSteps}`);
  console.log(`❌ Failed: ${failedSteps}`);
  console.log(`🚨 500 Errors: ${stepsWith500Error}`);
  console.log(`🛡️ CSRF Errors: ${stepsWithCSRFError}`);
  console.log(`🔄 CSRF Token Changes: ${stepsWithCSRFTokenChanged}`);
  console.log(`🛡️ CSRF Tokens Extracted: ${stepsWithCSRFTokenExtracted}`);

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

  console.log('\n🔍 CSRF TOKEN EXTRACTION LOG:');
  extractedCSRFTokens.forEach((token, index) => {
    console.log(`${index + 1}. ${token.testName}: ${token.stepName} - ${token.token.substring(0, 20)}... (${token.timestamp})`);
  });

  if (csrfTokenChanges.length > 0) {
    console.log('\n🔄 CSRF TOKEN CHANGE LOG (ROOT CAUSE EVIDENCE):');
    csrfTokenChanges.forEach((change, index) => {
      console.log(`${index + 1}. ${change.testName}: ${change.stepName}`);
      console.log(`   Previous: ${change.previousToken.substring(0, 20)}...`);
      console.log(`   New: ${change.newToken.substring(0, 20)}...`);
      console.log(`   Path: ${change.path}`);
    });
  }

  console.log('\n🎯 ROOT CAUSE ANALYSIS:');
  if (stepsWithCSRFTokenChanged > 0) {
    console.log('1. 🎯 ROOT CAUSE IDENTIFIED: CSRF tokens are being regenerated too frequently');
    console.log('2. The specific hypothesis that produced token changes reveals the middleware issue');
    console.log('3. Focus debugging efforts on that specific middleware code path');
    console.log('4. Check CSRF middleware configuration and implementation');
    console.log('5. Investigate the specific logic that causes token regeneration');
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
    console.log('1. Identify the specific middleware code path that causes token regeneration');
    console.log('2. Check CSRF middleware configuration and implementation');
    console.log('3. Verify CSRF token storage and retrieval logic');
    console.log('4. Check if there are multiple CSRF middleware instances');
    console.log('5. Implement fix to reuse existing tokens instead of generating new ones');
  } else {
    console.log('1. The test did not reproduce the CSRF token regeneration issue');
    console.log('2. Check if the issue is browser-specific or requires different test conditions');
    console.log('3. Verify the test accurately simulates the browser workflow');
    console.log('4. Check server logs for additional clues about token behavior');
  }
}

// Run the comprehensive CSRF middleware debugging
runComprehensiveCSRFMiddlewareDebugging().catch(console.error);
