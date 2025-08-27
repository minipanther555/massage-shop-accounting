#!/usr/bin/env node

/**
 * Exact Browser Workflow Replication Test
 * Tests the exact sequence: Login → Navigate to Staff Admin Page
 * This definitively determines if CSRF tokens change AND if 500 error occurs
 */

const http = require('http');

const BASE_URL = 'http://109.123.238.197';

async function makeRequest(path, method = 'GET', headers = {}, body = null) {
  return new Promise((resolve) => {
    console.log(`\n🔍 Making ${method} request to ${path}`);
    console.log(`📋 Headers: ${JSON.stringify(headers, null, 2)}`);
    if (body) console.log(`📋 Body: ${body}`);

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
          statusText: res.statusMessage,
          headers: res.headers,
          body: data,
          csrfToken: res.headers['x-csrf-token'] || null,
          sessionId: null
        };

        console.log(`📊 Result: ${res.statusCode} ${res.statusMessage}`);
        console.log(`🛡️ CSRF Token: ${result.csrfToken ? `${result.csrfToken.substring(0, 20)}...` : 'NONE'}`);

        // Extract session from login response
        if (path === '/api/auth/login' && res.statusCode === 200) {
          try {
            const responseData = JSON.parse(data);
            result.sessionId = responseData.sessionId;
            console.log(`🔑 Session ID: ${result.sessionId ? `${result.sessionId.substring(0, 20)}...` : 'NONE'}`);
          } catch (e) {
            console.log(`⚠️ Could not parse login response: ${e.message}`);
          }
        }

        if (res.statusCode >= 400) {
          console.log(`❌ Error Response: ${data}`);
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
        statusText: err.message,
        headers: {},
        body: '',
        csrfToken: null,
        sessionId: null
      });
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function testExactBrowserWorkflow() {
  console.log('🚀 EXACT BROWSER WORKFLOW REPLICATION TEST');
  console.log('===========================================');
  console.log('Testing: Login → Load HTML Page → API Call (like browser does)');
  console.log('Goal: Determine if CSRF tokens change during actual browser navigation\n');

  // Step 1: Login (exactly like your browser)
  console.log('🔐 STEP 1: LOGIN (Simulating your browser login)');
  const loginResult = await makeRequest('/api/auth/login', 'POST', {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; Browser-Test)',
    Cookie: '' // Start with no cookies like a real browser
  }, '{"username":"manager","password":"manager456"}');

  if (loginResult.status !== 200) {
    console.log('🚨 LOGIN FAILED - Cannot proceed with test');
    console.log(`Error: ${loginResult.body}`);
    return;
  }

  const { sessionId } = loginResult;
  const loginCSRF = loginResult.csrfToken;

  console.log('✅ Login successful');
  console.log(`🔑 Session: ${sessionId}`);
  console.log(`🛡️ CSRF after login: ${loginCSRF || 'NONE'}`);

  // Step 2: Navigate to homepage (what browser actually does after login)
  console.log('\n🏠 STEP 2: NAVIGATE TO HOMEPAGE (Browser redirects after login)');
  const homepageResult = await makeRequest('/', 'GET', {
    'User-Agent': 'Mozilla/5.0 (compatible; Browser-Test)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    Cookie: `sessionId=${sessionId}`
  });

  console.log(`📊 Homepage load: ${homepageResult.status}`);
  console.log(`🛡️ CSRF token from homepage: ${homepageResult.csrfToken || 'NONE'}`);

  const homepageCSRF = homepageResult.csrfToken;

  // Step 3: Click "Staff Administration" link (navigate to staff admin page)
  console.log('\n📄 STEP 3: CLICK STAFF ADMINISTRATION (Browser navigates from homepage)');
  const htmlPageResult = await makeRequest('/admin-staff.html', 'GET', {
    'User-Agent': 'Mozilla/5.0 (compatible; Browser-Test)',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    Cookie: `sessionId=${sessionId}`,
    Referer: 'http://109.123.238.197/' // Coming from homepage
  });

  console.log(`📊 Staff admin page load: ${htmlPageResult.status}`);
  console.log(`🛡️ CSRF token from staff admin page: ${htmlPageResult.csrfToken || 'NONE'}`);

  const htmlPageCSRF = htmlPageResult.csrfToken;

  // Step 4: Make API call (exactly like the JavaScript on the page does)
  console.log('\n📄 STEP 4: API CALL FROM STAFF PAGE (JavaScript makes API request)');
  const staffResult = await makeRequest('/api/admin/staff', 'GET', {
    Authorization: `Bearer ${sessionId}`,
    'User-Agent': 'Mozilla/5.0 (compatible; Browser-Test)',
    'X-CSRF-Token': htmlPageCSRF || '', // Use CSRF token from staff admin page
    Cookie: `sessionId=${sessionId}`,
    Referer: 'http://109.123.238.197/admin-staff.html'
  });

  const staffCSRF = staffResult.csrfToken;

  console.log(`📊 Staff API response: ${staffResult.status} ${staffResult.statusText}`);
  console.log(`🛡️ CSRF after API call: ${staffCSRF || 'NONE'}`);

  // Step 5: Definitive Analysis
  console.log('\n🎯 DEFINITIVE ANALYSIS - CSRF TOKEN REGENERATION');
  console.log('================================================');

  // Check CSRF token behavior across all 4 steps
  const tokens = [
    { step: 'Login', token: loginCSRF },
    { step: 'Homepage Load', token: homepageCSRF },
    { step: 'Staff Admin Page Load', token: htmlPageCSRF },
    { step: 'API Call', token: staffCSRF }
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
    console.log('🔍 The system generates NEW CSRF tokens during browser navigation');
    console.log('🔍 This explains the authentication failure:');
    console.log('   1. Login → establish session');
    console.log('   2. Load HTML page → get CSRF token A');
    console.log('   3. JavaScript makes API call → server generates CSRF token B');
    console.log('   4. Browser still has token A, but server expects token B → FAIL');

    console.log('\n🎯 ROOT CAUSE: CSRF middleware regenerates tokens between page load and API calls');
  } else if (uniqueTokens.length === 1) {
    console.log('\n✅ CSRF TOKENS ARE CONSISTENT');
    console.log('🔍 All steps returned the same CSRF token');
    console.log('🔍 CSRF token regeneration is NOT the issue');
  } else {
    console.log('\n❓ NO CSRF TOKENS FOUND');
    console.log('🔍 No CSRF tokens in any response - CSRF middleware may not be working');
  }

  // Check 500 error behavior
  if (staffResult.status === 500) {
    console.log('\n🚨 500 ERROR CONFIRMED - This matches your browser experience!');
    console.log('🔍 Conclusion: The issue is NOT CSRF - it\'s a server-side error in /api/admin/staff');
    console.log('📝 Error message:', staffResult.body);
    console.log('🎯 ROOT CAUSE: Likely database schema issue with existing staff records');
  } else if (staffResult.status === 401) {
    console.log('\n🔐 401 UNAUTHORIZED - Authentication failed');
    console.log('🔍 This suggests session or CSRF validation is failing');
  } else if (staffResult.status === 200) {
    console.log('\n✅ 200 SUCCESS - Staff endpoint is working correctly');
    console.log('🔍 This suggests the issue may be browser-specific or already fixed');
  } else {
    console.log(`\n❓ Unexpected status: ${staffResult.status}`);
    console.log('🔍 This requires further investigation');
  }

  // Final recommendation
  console.log('\n🔧 RECOMMENDED NEXT STEP:');
  if (staffResult.status === 500) {
    console.log('1. ✅ Issue confirmed: 500 error in /api/admin/staff');
    console.log('2. 🎯 Skip CSRF debugging - focus on database schema');
    console.log('3. 📊 Check database for missing hire_date values in existing staff');
    console.log('4. 🔧 Update existing staff records with default values');
  } else if (loginCSRF !== staffCSRF && loginCSRF && staffCSRF) {
    console.log('1. ✅ Issue confirmed: CSRF token regeneration');
    console.log('2. 🎯 Focus on CSRF middleware configuration');
    console.log('3. 📊 Check why tokens are regenerated between requests');
  } else {
    console.log('1. ❓ Issue not reproduced by this test');
    console.log('2. 🔍 Check if browser-specific conditions are required');
    console.log('3. 📊 Verify test accurately simulates browser behavior');
  }
}

// Run the definitive test
testExactBrowserWorkflow().catch(console.error);
