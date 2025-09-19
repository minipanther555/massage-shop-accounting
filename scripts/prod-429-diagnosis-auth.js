#!/usr/bin/env node

/**
 * Production 429 Diagnosis Script (Authenticated)
 * 
 * This script authenticates with production and reproduces the exact 429 scenario
 * that users experience when adding staff to the roster.
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Configuration - UPDATE THESE FOR YOUR PRODUCTION
const BASE_URL = 'https://109.123.238.197.sslip.io';
const USERNAME = 'manager';
const PASSWORD = 'manager456';

console.log('🔍 Production 429 Diagnosis (Authenticated) Starting...');
console.log('🌐 Target:', BASE_URL);
console.log('👤 Username:', USERNAME);
console.log('');

async function runDiagnosis() {
  try {
    // Step 1: Create authenticated client
    console.log('=== STEP 1: Authentication ===');
    const jar = new CookieJar();
    const client = wrapper(axios.create({ 
      jar, 
      baseURL: BASE_URL,
      timeout: 30000,
      validateStatus: () => true // Don't throw on 4xx/5xx
    }));

    // Get CSRF token first
    console.log('🔑 Getting CSRF token...');
    const csrfResponse = await client.get('/csrf');
    
    if (csrfResponse.status !== 200) {
      throw new Error(`CSRF fetch failed: ${csrfResponse.status} - ${JSON.stringify(csrfResponse.data)}`);
    }

    const csrfToken = csrfResponse.data.token;
    if (!csrfToken) {
      throw new Error('No CSRF token in response');
    }

    console.log('✅ CSRF token received:', csrfToken.substring(0, 20) + '...');

    // Set CSRF token for all requests
    client.defaults.headers.common['X-CSRF-Token'] = csrfToken;

    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await client.post('/api/auth/login', {
      username: USERNAME,
      password: PASSWORD
    });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`);
    }

    console.log('✅ Login successful');

    // Check initial rate limit status
    console.log('');
    console.log('📊 Initial rate limit status:');
    const initialHeaders = csrfResponse.headers;
    console.log('  RateLimit-Limit:', initialHeaders['ratelimit-limit'] || 'N/A');
    console.log('  RateLimit-Remaining:', initialHeaders['ratelimit-remaining'] || 'N/A');
    console.log('  RateLimit-Reset:', initialHeaders['ratelimit-reset'] || 'N/A');

    // Step 2: Staff Roster Add Sequence
    console.log('');
    console.log('=== STEP 2: Staff Roster Add Sequence (10 attempts) ===');

    let saw429 = false;
    let last429Request = null;
    const requestLog = [];

    for (let i = 1; i <= 10; i++) {
      console.log('');
      console.log(`---- ADD ${i} (PUT /api/main/staff-roster/${i}) ----`);

      // PUT request to add staff
      const putResponse = await client.put(`/api/main/staff-roster/${i}`, {
        masseuse_name: `TestUser_${i}`,
        status: null
      });

      const putHeaders = putResponse.headers;
      const putRemaining = putHeaders['ratelimit-remaining'];
      const putLimit = putHeaders['ratelimit-limit'];

      console.log(`PUT Status: ${putResponse.status}`);
      console.log(`Rate Limit: ${putRemaining}/${putLimit} remaining`);

      requestLog.push({
        step: i,
        type: 'PUT',
        status: putResponse.status,
        remaining: putRemaining,
        limit: putLimit,
        timestamp: new Date().toISOString()
      });

      if (putResponse.status === 429) {
        console.log('🚨 429 DETECTED on PUT request!');
        saw429 = true;
        last429Request = { step: i, type: 'PUT', status: putResponse.status };
        break;
      }

      // GET request to refresh roster
      console.log(`---- REFRESH (GET /api/main/staff-roster) ----`);
      const getResponse = await client.get('/api/main/staff-roster');

      const getHeaders = getResponse.headers;
      const getRemaining = getHeaders['ratelimit-remaining'];
      const getLimit = getHeaders['ratelimit-limit'];

      console.log(`GET Status: ${getResponse.status}`);
      console.log(`Rate Limit: ${getRemaining}/${getLimit} remaining`);

      requestLog.push({
        step: i,
        type: 'GET',
        status: getResponse.status,
        remaining: getRemaining,
        limit: getLimit,
        timestamp: new Date().toISOString()
      });

      if (getResponse.status === 429) {
        console.log('🚨 429 DETECTED on GET request!');
        saw429 = true;
        last429Request = { step: i, type: 'GET', status: getResponse.status };
        break;
      }

      // Small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Step 3: Analysis
    console.log('');
    console.log('=== STEP 3: Analysis ===');
    console.log(`Total requests made: ${requestLog.length}`);
    console.log(`429 detected: ${saw429 ? 'YES' : 'NO'}`);
    
    if (last429Request) {
      console.log(`First 429 at: Step ${last429Request.step}, ${last429Request.type} request`);
    }

    // Show rate limit progression
    console.log('');
    console.log('📈 Rate Limit Progression:');
    requestLog.forEach((req, index) => {
      console.log(`  ${index + 1}. ${req.type} (Step ${req.step}): ${req.remaining}/${req.limit} remaining (${req.status})`);
    });

    // Step 4: Proxy IP Key Test
    console.log('');
    console.log('=== STEP 4: Proxy IP Key Test ===');
    
    // Test with different X-Forwarded-For headers
    const testIPs = ['1.1.1.1', '2.2.2.2'];
    const ipResults = [];

    for (const ip of testIPs) {
      console.log(`Testing with X-Forwarded-For: ${ip}`);
      
      const testResponse = await client.get('/api/main/staff-roster', {
        headers: {
          'X-Forwarded-For': ip
        }
      });

      const remaining = testResponse.headers['ratelimit-remaining'];
      console.log(`  Remaining: ${remaining}`);
      
      ipResults.push({ ip, remaining });
    }

    // Check if proxy IP keying is working
    if (ipResults[0].remaining === ipResults[1].remaining) {
      console.log('⚠️  WARNING: Same remaining count for different X-Forwarded-For IPs');
      console.log('   This suggests proxy IP keying issue - all clients share same bucket');
    } else {
      console.log('✅ Different remaining counts - proxy IP keying is working correctly');
    }

    // Step 5: Summary and Recommendations
    console.log('');
    console.log('=== STEP 5: Summary and Recommendations ===');
    
    if (saw429) {
      console.log('🚨 429 ERRORS FOUND - Root cause identified!');
      console.log('');
      console.log('DIAGNOSIS:');
      console.log(`- 429 occurred after ${last429Request.step} staff adds`);
      console.log(`- 429 occurred on ${last429Request.type} request`);
      console.log(`- Rate limit appears to be ${requestLog[0].limit} requests per window`);
      console.log(`- Each add consumes ${requestLog.length / last429Request.step} requests on average`);
      
      console.log('');
      console.log('RECOMMENDATIONS:');
      console.log('1. Increase rate limit for staff roster operations');
      console.log('2. Optimize request pattern to reduce requests per add');
      console.log('3. Consider separate rate limits for different operation types');
    } else {
      console.log('ℹ️  No 429s detected in 10 attempts');
      console.log('   This suggests the rate limit is sufficient for normal usage');
      console.log('   The 429s you experienced might be due to:');
      console.log('   - Higher concurrent usage');
      console.log('   - Different request patterns');
      console.log('   - Background requests consuming the budget');
    }

    // Save detailed log
    const fs = require('fs');
    const path = require('path');
    const runDir = 'diagnostics/mystery-429__20250919-083514__TRC4/S2_MRE';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    if (!fs.existsSync(runDir)) {
      fs.mkdirSync(runDir, { recursive: true });
    }
    
    const detailedLog = {
      baseUrl: BASE_URL,
      username: USERNAME,
      timestamp: new Date().toISOString(),
      saw429,
      last429Request,
      requestLog,
      ipResults,
      summary: {
        totalRequests: requestLog.length,
        successfulAdds: saw429 ? last429Request.step - 1 : 10,
        rateLimitWorking: ipResults[0].remaining !== ipResults[1].remaining
      }
    };
    
    fs.writeFileSync(
      path.join(runDir, `prod-diagnosis-auth__${timestamp}__TRC4.json`),
      JSON.stringify(detailedLog, null, 2)
    );
    
    console.log('');
    console.log('✅ Diagnosis complete! Detailed log saved.');
    console.log(`📁 Saved to: ${runDir}/prod-diagnosis-auth__${timestamp}__TRC4.json`);

  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the diagnosis
runDiagnosis();
