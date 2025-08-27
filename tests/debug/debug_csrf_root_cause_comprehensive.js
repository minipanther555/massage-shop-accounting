#!/usr/bin/env node

/**
 * Comprehensive CSRF Token Regeneration Root Cause Analysis
 * Tests all 5 hypotheses simultaneously with extensive logging
 * Implements automated test suite for definitive proof
 */

const http = require('http');

// Test all 5 hypotheses for WHY CSRF tokens are regenerated
const CSRF_ROOT_CAUSE_TESTS = [
  {
    name: 'HYPOTHESIS 1: Token Storage Not Persisting Between Requests',
    description: 'csrfTokens Map is being reset/cleared between requests',
    logPatterns: [
      'Generated new token',
      'Added token to response headers',
      'Map size',
      'Token storage'
    ]
  },
  {
    name: 'HYPOTHESIS 2: Session ID Mismatch Between Storage and Retrieval',
    description: 'Session ID format inconsistencies between auth and CSRF middleware',
    logPatterns: [
      'Session ID:',
      'Bearer',
      'authorization',
      'sessionId'
    ]
  },
  {
    name: 'HYPOTHESIS 3: Multiple Middleware Instances Creating Race Conditions',
    description: 'addCSRFToken middleware called multiple times for same request',
    logPatterns: [
      'addCSRFToken',
      'middleware',
      'multiple',
      'race'
    ]
  },
  {
    name: 'HYPOTHESIS 4: Token Expiration Logic is Faulty',
    description: 'Expiration check incorrectly evaluating valid tokens as expired',
    logPatterns: [
      'expiresAt',
      'expired',
      'Date',
      'timing'
    ]
  },
  {
    name: 'HYPOTHESIS 5: Middleware Execution Timing Issues',
    description: 'CSRF middleware runs before session properly established',
    logPatterns: [
      'middleware order',
      'session',
      'timing',
      'execution'
    ]
  }
];

// Test suite for automated verification
class CSRFTokenTest {
  constructor() {
    this.tests = [];
    this.results = [];
    this.tokens = [];
    this.session = null;
  }

  async makeRequest(path, method = 'GET', headers = {}, body = null) {
    return new Promise((resolve) => {
      console.log(`\n🔍 Making ${method} request to ${path}`);
      console.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);

      const options = {
        hostname: '109.123.238.197',
        port: 80,
        path,
        method,
        headers
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          const result = {
            path,
            method,
            status: res.statusCode,
            headers: res.headers,
            body: data,
            csrfToken: res.headers['x-csrf-token'] || null,
            timestamp: new Date().toISOString()
          };

          console.log(`📊 Result: ${res.statusCode} ${res.statusMessage}`);
          console.log(`🛡️ CSRF Token: ${result.csrfToken ? `${result.csrfToken.substring(0, 20)}...` : 'NONE'}`);
          console.log(`⏰ Timestamp: ${result.timestamp}`);

          if (result.csrfToken) {
            this.tokens.push({
              token: result.csrfToken,
              timestamp: result.timestamp,
              step: `${method} ${path}`,
              status: res.statusCode
            });
          }

          resolve(result);
        });
      });

      req.on('error', (err) => {
        console.log(`❌ Request Error: ${err.message}`);
        resolve({
          path,
          method,
          status: 'ERROR',
          error: err.message,
          csrfToken: null,
          timestamp: new Date().toISOString()
        });
      });

      if (body) req.write(body);
      req.end();
    });
  }

  // Test 1: Verify token storage persistence
  async testTokenStoragePersistence() {
    console.log('\n🧪 TEST 1: Token Storage Persistence');
    console.log('Testing if tokens persist between requests or get cleared');

    const results = [];

    // Make 3 rapid requests to same endpoint
    for (let i = 1; i <= 3; i++) {
      console.log(`\n📋 Request ${i}/3 to test storage persistence`);
      const result = await this.makeRequest('/api/auth/session', 'GET', {
        Authorization: `Bearer ${this.session}`,
        'User-Agent': 'CSRF-Test-Client'
      });
      results.push(result);

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return {
      testName: 'Token Storage Persistence',
      passed: results.every((r) => r.csrfToken !== null),
      tokens: results.map((r) => r.csrfToken),
      allSame: new Set(results.map((r) => r.csrfToken)).size === 1,
      details: results
    };
  }

  // Test 2: Verify session ID consistency
  async testSessionIdConsistency() {
    console.log('\n🧪 TEST 2: Session ID Consistency');
    console.log('Testing if session ID format is consistent between requests');

    const testSessionIds = [
      this.session,
      this.session.trim(),
      this.session.toLowerCase(),
      this.session.toUpperCase()
    ];

    const results = [];

    for (const sessionId of testSessionIds) {
      console.log(`\n📋 Testing session ID: ${sessionId.substring(0, 10)}...`);
      const result = await this.makeRequest('/api/auth/session', 'GET', {
        Authorization: `Bearer ${sessionId}`,
        'User-Agent': 'CSRF-SessionID-Test'
      });
      results.push({ sessionId, result });
    }

    return {
      testName: 'Session ID Consistency',
      passed: results.filter((r) => r.result.status === 200).length > 0,
      sessionIdVariations: results.length,
      successfulVariations: results.filter((r) => r.result.status === 200).length,
      details: results
    };
  }

  // Test 3: Verify single middleware execution
  async testSingleMiddlewareExecution() {
    console.log('\n🧪 TEST 3: Single Middleware Execution');
    console.log('Testing if CSRF middleware runs only once per request');

    // Make request and check response headers for duplicate CSRF tokens
    const result = await this.makeRequest('/api/admin/staff', 'GET', {
      Authorization: `Bearer ${this.session}`,
      'User-Agent': 'CSRF-Middleware-Test'
    });

    // Check for multiple CSRF token headers (shouldn't happen)
    const csrfHeaders = Object.keys(result.headers).filter((h) => h.toLowerCase().includes('csrf') || h.toLowerCase().includes('x-csrf'));

    return {
      testName: 'Single Middleware Execution',
      passed: csrfHeaders.length <= 1,
      csrfHeaderCount: csrfHeaders.length,
      csrfHeaders,
      details: result
    };
  }

  // Test 4: Verify token expiration logic
  async testTokenExpirationLogic() {
    console.log('\n🧪 TEST 4: Token Expiration Logic');
    console.log('Testing if token expiration logic works correctly');

    // Get initial token
    const result1 = await this.makeRequest('/api/auth/session', 'GET', {
      Authorization: `Bearer ${this.session}`,
      'User-Agent': 'CSRF-Expiration-Test-1'
    });

    // Wait 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get second token (should be same if expiration logic correct)
    const result2 = await this.makeRequest('/api/auth/session', 'GET', {
      Authorization: `Bearer ${this.session}`,
      'User-Agent': 'CSRF-Expiration-Test-2'
    });

    return {
      testName: 'Token Expiration Logic',
      passed: result1.csrfToken === result2.csrfToken,
      token1: result1.csrfToken,
      token2: result2.csrfToken,
      tokensMatch: result1.csrfToken === result2.csrfToken,
      details: { result1, result2 }
    };
  }

  // Test 5: Verify middleware execution order
  async testMiddlewareExecutionOrder() {
    console.log('\n🧪 TEST 5: Middleware Execution Order');
    console.log('Testing if CSRF middleware runs at correct time in pipeline');

    // Test with different endpoints to see middleware behavior
    const endpoints = [
      '/api/auth/session',
      '/api/admin/staff',
      '/api/services'
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(`\n📋 Testing middleware order for: ${endpoint}`);
      const result = await this.makeRequest(endpoint, 'GET', {
        Authorization: `Bearer ${this.session}`,
        'User-Agent': 'CSRF-Order-Test'
      });
      results.push({ endpoint, result });
    }

    // All should have CSRF tokens if middleware order is correct
    const allHaveTokens = results.every((r) => r.result.csrfToken !== null);

    return {
      testName: 'Middleware Execution Order',
      passed: allHaveTokens,
      endpointsTested: endpoints.length,
      endpointsWithTokens: results.filter((r) => r.result.csrfToken).length,
      details: results
    };
  }

  // Main test runner
  async runComprehensiveCSRFTests() {
    console.log('🚀 COMPREHENSIVE CSRF ROOT CAUSE ANALYSIS');
    console.log('==========================================');
    console.log('Testing all 5 hypotheses with automated test suite\n');

    // Step 1: Login to get session
    console.log('🔐 STEP 1: LOGIN AND ESTABLISH SESSION');
    const loginResult = await this.makeRequest('/api/auth/login', 'POST', {
      'Content-Type': 'application/json',
      'User-Agent': 'CSRF-Comprehensive-Test'
    }, '{"username":"manager","password":"manager456"}');

    if (loginResult.status !== 200) {
      console.log('❌ LOGIN FAILED - Cannot proceed with tests');
      return;
    }

    this.session = JSON.parse(loginResult.body).sessionId;
    console.log(`✅ Session established: ${this.session.substring(0, 20)}...`);

    // Step 2: Run all automated tests
    console.log('\n🧪 STEP 2: RUNNING AUTOMATED TEST SUITE');
    console.log('==========================================');

    const testResults = [];

    // Run all 5 tests
    testResults.push(await this.testTokenStoragePersistence());
    testResults.push(await this.testSessionIdConsistency());
    testResults.push(await this.testSingleMiddlewareExecution());
    testResults.push(await this.testTokenExpirationLogic());
    testResults.push(await this.testMiddlewareExecutionOrder());

    // Step 3: Analyze token patterns
    console.log('\n📊 STEP 3: TOKEN REGENERATION ANALYSIS');
    console.log('======================================');

    console.log(`📋 Total CSRF tokens collected: ${this.tokens.length}`);
    const uniqueTokens = [...new Set(this.tokens.map((t) => t.token))];
    console.log(`📋 Unique CSRF tokens: ${uniqueTokens.length}`);

    console.log('\n🛡️ CSRF TOKEN TIMELINE:');
    this.tokens.forEach((token, index) => {
      console.log(`  ${index + 1}. ${token.step}: ${token.token.substring(0, 20)}... (${token.timestamp})`);
    });

    // Step 4: Root cause determination
    console.log('\n🎯 ROOT CAUSE ANALYSIS');
    console.log('======================');

    if (uniqueTokens.length > 1) {
      console.log('🚨 CSRF TOKEN REGENERATION CONFIRMED!');
      console.log(`🔍 ${uniqueTokens.length} different tokens generated across ${this.tokens.length} requests`);
      console.log('🔍 This confirms the CSRF token regeneration issue');

      // Analyze which hypothesis failed
      const failedTests = testResults.filter((t) => !t.passed);
      if (failedTests.length > 0) {
        console.log('\n❌ FAILED TESTS (Root Cause Indicators):');
        failedTests.forEach((test) => {
          console.log(`  • ${test.testName}: Failed`);
        });
      }
    } else if (uniqueTokens.length === 1) {
      console.log('✅ CSRF TOKENS ARE CONSISTENT');
      console.log('🔍 All requests returned the same CSRF token');
      console.log('🔍 CSRF token regeneration is NOT happening in this test');
    } else {
      console.log('❓ NO CSRF TOKENS FOUND');
      console.log('🔍 No CSRF tokens were returned in any response');
    }

    // Step 5: Test results summary
    console.log('\n📋 TEST SUITE RESULTS');
    console.log('=====================');

    testResults.forEach((test, index) => {
      const status = test.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${index + 1}. ${test.testName}: ${status}`);
    });

    const passedTests = testResults.filter((t) => t.passed).length;
    const totalTests = testResults.length;
    console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);

    // Step 6: Recommendations
    console.log('\n🔧 RECOMMENDATIONS');
    console.log('==================');

    if (uniqueTokens.length > 1) {
      console.log('1. 🎯 CSRF token regeneration confirmed - need to fix middleware');
      console.log('2. 🔍 Focus on failed test areas for specific root cause');
      console.log('3. 🛠️ Modify CSRF middleware to reuse tokens within session');
    } else {
      console.log('1. ❓ CSRF regeneration not reproduced in this test');
      console.log('2. 🔍 Issue may be browser-specific or require different conditions');
      console.log('3. 📊 Check server logs for additional clues');
    }

    return {
      tokenRegenerationConfirmed: uniqueTokens.length > 1,
      testResults,
      tokenTimeline: this.tokens,
      uniqueTokenCount: uniqueTokens.length,
      totalRequests: this.tokens.length
    };
  }
}

// Additional comprehensive logging script
async function addComprehensiveLoggingToCSRFMiddleware() {
  console.log('\n🔧 COMPREHENSIVE LOGGING ENHANCEMENT');
  console.log('====================================');
  console.log('Adding extensive logging to CSRF middleware for root cause analysis');

  // This would modify the CSRF middleware file to add comprehensive logging
  console.log('📋 Logging points to add:');
  console.log('  1. Token storage operations (set/get)');
  console.log('  2. Session ID extraction and formatting');
  console.log('  3. Middleware execution entry/exit');
  console.log('  4. Token expiration calculations');
  console.log('  5. Map size and contents');
  console.log('  6. Request/response timing');
  console.log('  7. Header inspection');
  console.log('  8. Memory usage and persistence');

  // Return the enhanced middleware code with logging
  return `
// Enhanced CSRF middleware with comprehensive logging
function addCSRFToken(req, res, next) {
    console.log('🔐 [CSRF-START] addCSRFToken middleware entry');
    console.log('🔐 [CSRF-REQUEST] Method:', req.method, 'Path:', req.path);
    console.log('🔐 [CSRF-HEADERS] Authorization:', req.headers.authorization?.substring(0, 20) + '...');
    
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    console.log('🔐 [CSRF-SESSION] Extracted sessionId:', sessionId?.substring(0, 10) + '...');
    
    if (!sessionId) {
        console.log('🔐 [CSRF-SKIP] No session ID found, skipping CSRF token generation');
        return next();
    }
    
    console.log('🔐 [CSRF-MAP] Current Map size:', csrfTokens.size);
    console.log('🔐 [CSRF-MAP] Map keys:', Array.from(csrfTokens.keys()).map(k => k.substring(0, 8) + '...'));
    
    let tokenData = csrfTokens.get(sessionId);
    console.log('🔐 [CSRF-GET] Retrieved tokenData:', tokenData ? 'EXISTS' : 'NULL');
    
    if (tokenData) {
        console.log('🔐 [CSRF-EXPIRY] Token expires at:', tokenData.expiresAt);
        console.log('🔐 [CSRF-EXPIRY] Current time:', new Date());
        console.log('🔐 [CSRF-EXPIRY] Is expired?', new Date() > tokenData.expiresAt);
    }
    
    if (!tokenData || new Date() > tokenData.expiresAt) {
        console.log('🔐 [CSRF-GENERATE] Generating NEW token for session:', sessionId.substring(0, 8) + '...');
        const token = generateCSRFToken(sessionId);
        tokenData = csrfTokens.get(sessionId);
        console.log('🔐 [CSRF-GENERATED] New token created:', token.substring(0, 20) + '...');
    } else {
        console.log('🔐 [CSRF-REUSE] Reusing existing token:', tokenData.token.substring(0, 20) + '...');
    }
    
    res.setHeader('X-CSRF-Token', tokenData.token);
    console.log('🔐 [CSRF-RESPONSE] Token added to response headers');
    console.log('🔐 [CSRF-END] addCSRFToken middleware exit');
    
    next();
}`;
}

// Run the comprehensive test suite
const testSuite = new CSRFTokenTest();
testSuite.runComprehensiveCSRFTests()
  .then((results) => {
    console.log('\n🎉 COMPREHENSIVE CSRF ANALYSIS COMPLETED');
    console.log('========================================');
    console.log('Results available for analysis and next steps');
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error);
  });
