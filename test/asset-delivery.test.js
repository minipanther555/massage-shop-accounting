const http = require('http');
const assert = require('assert');

// Test Suite: Verify Live Asset Delivery
function runAssetDeliveryTest() {
  console.log('--- Running Test Suite: Live Asset Delivery Verification ---');

  const options = {
    hostname: '127.0.0.1',
    port: 80,
    path: '/api.js',
    method: 'GET',
  };
  
  const expectedContent = "return this.request(`/admin/staff/${staffId}/payments`, 'POST', paymentData);";

  const req = http.request(options, (res) => {
    console.log(`Fetching asset from: http://${options.hostname}:${options.port}${options.path}`);
    console.log(`Server responded with status code: ${res.statusCode}`);
    
    assert.strictEqual(res.statusCode, 200, `Failed to fetch asset. Status: ${res.statusCode}`);
    
    let body = '';
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      try {
        assert.ok(
          body.includes(expectedContent),
          `Asset content mismatch! The served api.js is stale and does not contain the fix.
           Expected to find: "${expectedContent}"`
        );
        console.log('✅ PASSED: The web server is delivering the correct, updated version of api.js.');
        console.log('--- Test Suite Finished ---');
        process.exit(0);
      } catch (error) {
        console.error('❌ FAILED: The asset delivery test encountered an assertion error.');
        console.error(error.message);
        process.exit(1);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ FAILED: The asset delivery test encountered a network error.');
    console.error(error.message);
    process.exit(1);
  });

  req.end();
}

// Execute the test runner
runAssetDeliveryTest();
