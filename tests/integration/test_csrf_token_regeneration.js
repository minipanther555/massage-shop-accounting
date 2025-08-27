#!/usr/bin/env node

/**
 * Test CSRF Token Regeneration
 * Tests if CSRF tokens change between multiple authenticated requests
 * This is the core issue the user suspected
 */

const http = require('http');

async function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve) => {
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
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data,
          csrfToken: res.headers['x-csrf-token'] || null
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        path, status: 'ERROR', error: err.message, csrfToken: null
      });
    });

    if (body) req.write(body);
    req.end();
  });
}

async function testCSRFTokenRegeneration() {
  console.log('🔍 TESTING CSRF TOKEN REGENERATION');
  console.log('===================================');
  console.log('Goal: Determine if CSRF tokens change between authenticated requests\n');

  // Step 1: Login
  console.log('🔐 STEP 1: LOGIN');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    'Content-Type': 'application/json'
  }, '{"username":"manager","password":"manager456"}');

  if (loginResult.status !== 200) {
    console.log('❌ Login failed:', loginResult.body);
    return;
  }

  const { sessionId } = JSON.parse(loginResult.body);
  console.log(`✅ Login successful, session: ${sessionId.substring(0, 20)}...`);
  console.log(`🛡️ CSRF token from login: ${loginResult.csrfToken || 'NONE'}\n`);

  // Step 2: First authenticated request
  console.log('📄 STEP 2: FIRST AUTHENTICATED REQUEST (/api/auth/session)');
  const firstRequest = await makeRequest('/api/auth/session', 'GET', {
    Authorization: `Bearer ${sessionId}`
  });

  console.log(`📊 Status: ${firstRequest.status}`);
  console.log(`🛡️ CSRF token from first request: ${firstRequest.csrfToken || 'NONE'}`);

  const firstCSRF = firstRequest.csrfToken;

  // Step 3: Second authenticated request (same endpoint)
  console.log('\n📄 STEP 3: SECOND AUTHENTICATED REQUEST (same endpoint)');
  const secondRequest = await makeRequest('/api/auth/session', 'GET', {
    Authorization: `Bearer ${sessionId}`
  });

  console.log(`📊 Status: ${secondRequest.status}`);
  console.log(`🛡️ CSRF token from second request: ${secondRequest.csrfToken || 'NONE'}`);

  const secondCSRF = secondRequest.csrfToken;

  // Step 4: Third authenticated request (different endpoint)
  console.log('\n📄 STEP 4: THIRD AUTHENTICATED REQUEST (different endpoint /api/admin/staff)');
  const thirdRequest = await makeRequest('/api/admin/staff', 'GET', {
    Authorization: `Bearer ${sessionId}`
  });

  console.log(`📊 Status: ${thirdRequest.status}`);
  console.log(`🛡️ CSRF token from third request: ${thirdRequest.csrfToken || 'NONE'}`);

  const thirdCSRF = thirdRequest.csrfToken;

  // Step 5: Analysis
  console.log('\n\n🎯 CSRF TOKEN REGENERATION ANALYSIS');
  console.log('====================================');

  const tokens = [
    { step: 'Login', token: loginResult.csrfToken },
    { step: 'First Request (/api/auth/session)', token: firstCSRF },
    { step: 'Second Request (/api/auth/session)', token: secondCSRF },
    { step: 'Third Request (/api/admin/staff)', token: thirdCSRF }
  ];

  console.log('📋 CSRF Token Timeline:');
  tokens.forEach((item, index) => {
    const tokenDisplay = item.token ? `${item.token.substring(0, 20)}...` : 'NONE';
    console.log(`  ${index + 1}. ${item.step}: ${tokenDisplay}`);
  });

  // Check for token changes
  const csrfTokens = tokens.filter((t) => t.token !== null).map((t) => t.token);
  const uniqueTokens = [...new Set(csrfTokens)];

  console.log(`\n📊 Total CSRF tokens received: ${csrfTokens.length}`);
  console.log(`📊 Unique CSRF tokens: ${uniqueTokens.length}`);

  if (uniqueTokens.length > 1) {
    console.log('\n🚨 CSRF TOKEN REGENERATION CONFIRMED!');
    console.log('🔍 The system generates NEW CSRF tokens on every request');
    console.log('🔍 This explains why your browser authentication fails:');
    console.log('   1. Login → no token needed');
    console.log('   2. Navigate to page → get token A');
    console.log('   3. Submit form/navigate → get token B, but browser tries to use token A');
    console.log('   4. Server rejects token A because it expects token B → authentication fails');

    console.log('\n🔧 ROOT CAUSE: CSRF middleware configured to regenerate tokens too frequently');
    console.log('🔧 FIX NEEDED: Configure CSRF middleware to reuse tokens within same session');
  } else if (uniqueTokens.length === 1) {
    console.log('\n✅ CSRF TOKENS ARE CONSISTENT');
    console.log('🔍 All requests returned the same CSRF token');
    console.log('🔍 CSRF token regeneration is NOT the issue');
    console.log('🔍 The problem must be elsewhere (e.g., SQL query, data format, etc.)');
  } else {
    console.log('\n❓ NO CSRF TOKENS FOUND');
    console.log('🔍 No CSRF tokens were returned in any response');
    console.log('🔍 CSRF middleware may not be properly configured');
  }

  // Also check if any requests had errors
  const errorRequests = [firstRequest, secondRequest, thirdRequest].filter((r) => r.status >= 400);
  if (errorRequests.length > 0) {
    console.log('\n⚠️ REQUESTS WITH ERRORS:');
    errorRequests.forEach((req) => {
      console.log(`  • ${req.path}: ${req.status} - ${req.body}`);
    });
  }
}

testCSRFTokenRegeneration().catch(console.error);
