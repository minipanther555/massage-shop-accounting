#!/usr/bin/env node

/**
 * Comprehensive Backend Connectivity Debug Script
 * Tests all 5 hypotheses for the connectivity issue simultaneously
 */

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 COMPREHENSIVE BACKEND CONNECTIVITY DEBUG STARTING...\n');

// Configuration
const PRODUCTION_IP = '109.123.238.197';
const LOCAL_IP = 'localhost';
const PORT = 3000;

// Test results storage
const results = {
  hypothesis1: { name: 'Frontend API URL Mismatch', status: 'PENDING', details: [] },
  hypothesis2: { name: 'CORS Configuration Issue', status: 'PENDING', details: [] },
  hypothesis3: { name: 'Network/Firewall Blocking', status: 'PENDING', details: [] },
  hypothesis4: { name: 'Nginx Reverse Proxy Misconfiguration', status: 'PENDING', details: [] },
  hypothesis5: { name: 'Environment Variable Loading', status: 'PENDING', details: [] }
};

// Utility function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy());

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test 1: Frontend API URL Mismatch
async function testHypothesis1() {
  console.log('🧪 Testing Hypothesis 1: Frontend API URL Mismatch');

  try {
    // Check if api.js exists and read its content
    const apiJsPath = path.join(__dirname, 'web-app', 'api.js');
    if (fs.existsSync(apiJsPath)) {
      const content = fs.readFileSync(apiJsPath, 'utf8');
      const localhostMatch = content.match(/localhost:3000/g);
      const apiBaseUrlMatch = content.match(/API_BASE_URL\s*=\s*['"`]([^'"`]+)['"`]/);

      results.hypothesis1.details.push(`API_BASE_URL found: ${apiBaseUrlMatch ? apiBaseUrlMatch[1] : 'NOT FOUND'}`);
      results.hypothesis1.details.push(`localhost:3000 references: ${localhostMatch ? localhostMatch.length : 0}`);

      if (localhostMatch && localhostMatch.length > 0) {
        results.hypothesis1.status = 'CONFIRMED';
        results.hypothesis1.details.push('❌ Frontend is hardcoded to localhost:3000');
      } else {
        results.hypothesis1.status = 'INVALIDATED';
        results.hypothesis1.details.push('✅ No localhost:3000 hardcoding found');
      }
    } else {
      results.hypothesis1.status = 'ERROR';
      results.hypothesis1.details.push('❌ api.js file not found');
    }
  } catch (error) {
    results.hypothesis1.status = 'ERROR';
    results.hypothesis1.details.push(`❌ Error reading api.js: ${error.message}`);
  }
}

// Test 2: CORS Configuration Issue
async function testHypothesis2() {
  console.log('🧪 Testing Hypothesis 2: CORS Configuration Issue');

  try {
    // Test CORS preflight request
    const corsTest = await makeRequest(`http://${PRODUCTION_IP}/api/auth/login`, {
      method: 'OPTIONS',
      headers: {
        Origin: `http://${PRODUCTION_IP}`,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    results.hypothesis2.details.push(`CORS preflight status: ${corsTest.status}`);
    results.hypothesis2.details.push(`CORS headers: ${JSON.stringify(corsTest.headers)}`);

    if (corsTest.status === 200 && corsTest.headers['access-control-allow-origin']) {
      results.hypothesis2.status = 'INVALIDATED';
      results.hypothesis2.details.push('✅ CORS is properly configured');
    } else {
      results.hypothesis2.status = 'CONFIRMED';
      results.hypothesis2.details.push('❌ CORS configuration issue detected');
    }
  } catch (error) {
    results.hypothesis2.status = 'CONFIRMED';
    results.hypothesis2.details.push(`❌ CORS test failed: ${error.message}`);
  }
}

// Test 3: Network/Firewall Blocking
async function testHypothesis3() {
  console.log('🧪 Testing Hypothesis 3: Network/Firewall Blocking');

  try {
    // Test direct connection to port 3000
    const directTest = await makeRequest(`http://${PRODUCTION_IP}:3000/health`, {
      timeout: 5000
    });

    results.hypothesis3.details.push(`Direct port 3000 test status: ${directTest.status}`);

    if (directTest.status === 200) {
      results.hypothesis3.status = 'INVALIDATED';
      results.hypothesis3.details.push('✅ Direct port 3000 access works');
    } else {
      results.hypothesis3.status = 'CONFIRMED';
      results.hypothesis3.details.push('❌ Direct port 3000 access blocked');
    }
  } catch (error) {
    results.hypothesis3.status = 'CONFIRMED';
    results.hypothesis3.details.push(`❌ Direct port 3000 test failed: ${error.message}`);
  }
}

// Test 4: Nginx Reverse Proxy Misconfiguration
async function testHypothesis4() {
  console.log('🧪 Testing Hypothesis 4: Nginx Reverse Proxy Misconfiguration');

  try {
    // Test health endpoint through Nginx
    const nginxHealthTest = await makeRequest(`http://${PRODUCTION_IP}/health`);
    results.hypothesis4.details.push(`Nginx health endpoint status: ${nginxHealthTest.status}`);

    // Test API endpoint through Nginx
    const nginxApiTest = await makeRequest(`http://${PRODUCTION_IP}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test', password: 'test' })
    });

    results.hypothesis4.details.push(`Nginx API endpoint status: ${nginxApiTest.status}`);

    if (nginxHealthTest.status === 200 && nginxApiTest.status !== 502 && nginxApiTest.status !== 504) {
      results.hypothesis4.status = 'INVALIDATED';
      results.hypothesis4.details.push('✅ Nginx reverse proxy is working');
    } else {
      results.hypothesis4.status = 'CONFIRMED';
      results.hypothesis4.details.push('❌ Nginx reverse proxy issue detected');
    }
  } catch (error) {
    results.hypothesis4.status = 'CONFIRMED';
    results.hypothesis4.details.push(`❌ Nginx test failed: ${error.message}`);
  }
}

// Test 5: Environment Variable Loading
async function testHypothesis5() {
  console.log('🧪 Testing Hypothesis 5: Environment Variable Loading');

  try {
    // Check if .env file exists and has correct values
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const portMatch = envContent.match(/PORT=(\d+)/);
      const nodeEnvMatch = envContent.match(/NODE_ENV=(\w+)/);

      results.hypothesis5.details.push(`PORT found: ${portMatch ? portMatch[1] : 'NOT FOUND'}`);
      results.hypothesis5.details.push(`NODE_ENV found: ${nodeEnvMatch ? nodeEnvMatch[1] : 'NOT FOUND'}`);

      if (portMatch && portMatch[1] === '3000' && nodeEnvMatch && nodeEnvMatch[1] === 'production') {
        results.hypothesis5.status = 'INVALIDATED';
        results.hypothesis5.details.push('✅ Environment variables are correctly configured');
      } else {
        results.hypothesis5.status = 'CONFIRMED';
        results.hypothesis5.details.push('❌ Environment variable configuration issue');
      }
    } else {
      results.hypothesis5.status = 'ERROR';
      results.hypothesis5.details.push('❌ .env file not found');
    }
  } catch (error) {
    results.hypothesis5.status = 'ERROR';
    results.hypothesis5.details.push(`❌ Error reading .env: ${error.message}`);
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting comprehensive testing of all 5 hypotheses...\n');

  await testHypothesis1();
  await testHypothesis2();
  await testHypothesis3();
  await testHypothesis4();
  await testHypothesis5();

  // Print results
  console.log('\n📊 TEST RESULTS SUMMARY:\n');
  console.log('='.repeat(80));

  Object.entries(results).forEach(([key, result]) => {
    console.log(`\n🔍 ${result.name}: ${result.status}`);
    console.log('─'.repeat(40));
    result.details.forEach((detail) => console.log(`  ${detail}`));
  });

  console.log(`\n${'='.repeat(80)}`);

  // Identify the most likely root cause
  const confirmedHypotheses = Object.entries(results).filter(([key, result]) => result.status === 'CONFIRMED');
  const errorHypotheses = Object.entries(results).filter(([key, result]) => result.status === 'ERROR');

  if (confirmedHypotheses.length > 0) {
    console.log('\n🎯 MOST LIKELY ROOT CAUSE(S):');
    confirmedHypotheses.forEach(([key, result]) => {
      console.log(`  • ${result.name}`);
    });
  }

  if (errorHypotheses.length > 0) {
    console.log('\n⚠️  TESTS WITH ERRORS:');
    errorHypotheses.forEach(([key, result]) => {
      console.log(`  • ${result.name}`);
    });
  }

  console.log('\n✅ Debugging complete! Check the results above to identify the root cause.');
}

// Run the tests
runAllTests().catch(console.error);
