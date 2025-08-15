const http = require('http');
const assert = require('assert');

// Test Suite: Verify Live Login Endpoint (Dependency-Free)
async function runLoginEndpointTest() {
  console.log('--- Running Test Suite: Live Login Endpoint Verification (Dependency-Free) ---');
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
    // Test 1: Health Check
    async healthCheck() {
      const { statusCode } = await request({ host: BASE_URL, port: 80, path: '/health' });
      assert.strictEqual(statusCode, 200, 'Test 1 FAILED: Server health check failed.');
      console.log('✅ PASSED: Test 1 - Server is running and reachable.');
    },

    // Test 2: The Strict Contract
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
      console.log('✅ PASSED: Test 2 - POST to /api/auth/login was successful.');
    },

    // Test 3: Method Rejection
    async loginGetRequest() {
        const { statusCode } = await request({ host: BASE_URL, port: 80, path: '/api/auth/login' });
        assert.strictEqual(statusCode, 404, `Test 3 FAILED: GET to /api/auth/login did not return 404. Got ${statusCode}.`);
        console.log('✅ PASSED: Test 3 - GET to /api/auth/login was correctly rejected with 404.');
    },

    // Test 4: Global POST Blocking
    async adminPostRequest() {
      const postData = JSON.stringify({ masseuse_name: 'test' });
      const options = {
        host: BASE_URL, port: 80, path: '/api/admin/staff', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
      };
      const { statusCode } = await request(options, postData);
      assert.strictEqual(statusCode, 401, `Test 4 FAILED: POST to /api/admin/staff was rejected with an unexpected code. Expected 401, got ${statusCode}.`);
      console.log('✅ PASSED: Test 4 - POST to another endpoint is not blocked (correctly returned 401).');
    },
    
    // Test 5: 404 Handling
    async nonExistentRoute() {
        const { statusCode } = await request({ host: BASE_URL, port: 80, path: '/api/auth/does-not-exist', method: 'POST' });
        assert.strictEqual(statusCode, 404, `Test 5 FAILED: POST to non-existent auth route did not return 404. Got ${statusCode}.`);
        console.log('✅ PASSED: Test 5 - Non-existent auth route correctly returned 404.');
    }
  };

  try {
    await tests.healthCheck();
    await tests.loginGetRequest();
    await tests.adminPostRequest();
    await tests.nonExistentRoute();
    await tests.loginPostRequest(); 
    
    console.log('\n--- Test Suite Finished: All tests passed! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED: A critical test failed.');
    console.error(error.message);
    process.exit(1);
  }
}

runLoginEndpointTest();
