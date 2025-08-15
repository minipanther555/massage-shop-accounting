const http = require('http');
const assert = require('assert');

// Test Suite: Verify Critical Endpoint Registration
async function runEndpointRegistrationTest() {
  console.log('--- Running Test Suite: Critical Endpoint Registration ---');
  const BASE_URL = '127.0.0.1';

  // Helper to perform HTTP requests
  const request = (options, postData = null) => new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });

  const tests = {
    // Test 1: Verify a previously MISSING endpoint is now registered
    async servicesGetRequest() {
      // This endpoint is currently public. The test verifies it exists and returns a success status.
      // A 404 would be a failure.
      const { statusCode } = await request({ host: BASE_URL, port: 80, path: '/api/services' });
      assert.strictEqual(statusCode, 200, `Test 1 FAILED: GET to /api/services failed. Expected 200 (OK), got ${statusCode}.`);
      console.log('✅ PASSED: Test 1 - /api/services endpoint is correctly registered and public (returned 200).');
    },

    // Test 2: The Strict Contract - Verify the login endpoint is STILL working
    async loginPostRequest() {
      const postData = JSON.stringify({ username: 'manager', password: 'manager456' });
      const options = {
        host: BASE_URL, port: 80, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
      };
      const { statusCode, body } = await request(options, postData);
      assert.strictEqual(statusCode, 200, `Test 2 FAILED: POST to /api/auth/login was rejected. Expected 200, got ${statusCode}.`);
      const jsonBody = JSON.parse(body);
      assert.strictEqual(jsonBody.success, true, 'Test 2 FAILED: Login response did not indicate success.');
      console.log('✅ PASSED: Test 2 - POST to /api/auth/login remains successful.');
    },
  };

  try {
    await tests.servicesGetRequest();
    await tests.loginPostRequest(); 
    
    console.log('\n--- Test Suite Finished: All critical endpoints are correctly registered! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED: A critical endpoint registration test failed.');
    console.error(error.message);
    process.exit(1);
  }
}

runEndpointRegistrationTest();
