const { exec } = require('child_process');
const assert = require('assert');

// Test Suite: Verify Live Nginx Configuration
async function runNginxConfigTest() {
  console.log('--- Running Test Suite: Live Nginx Configuration Verification ---');
  
  // Command to securely fetch the Nginx configuration from the server
  const command = `ssh massage "sudo cat /etc/nginx/sites-available/default"`;

  const tests = {
    // Test 1: The Strict Contract - Verify the /api/ proxy block exists and is correct
    async verifyApiProxyConfiguration(config) {
      const locationRegex = /location\s+\/api\/\s+\{([\s\S]*?)\}/;
      const locationMatch = config.match(locationRegex);
      
      assert.ok(locationMatch, 'Test 1 FAILED: Nginx config is missing the "location /api/" block.');
      
      const locationBlock = locationMatch[1];
      
      const proxyPassRegex = /proxy_pass\s+http:\/\/127\.0\.0\.1:3000\/;/;
      const proxyPassMatch = locationBlock.match(proxyPassRegex);

      assert.ok(proxyPassMatch, 
        `Test 1 FAILED: The "location /api/" block has an incorrect proxy_pass directive.
         It must be exactly "proxy_pass http://127.0.0.1:3000/;" (including the trailing slash).
         Found block: \n${locationBlock.trim()}`
      );
      
      console.log('✅ PASSED: Test 1 - Nginx config has a correct "location /api/" block with the required trailing slash.');
    },

    // Test 2: Verify the root directive for static files is correct
    async verifyRootConfiguration(config) {
      const rootRegex = /root\s+\/opt\/massage-shop\/web-app;/;
      const rootMatch = config.match(rootRegex);
      assert.ok(rootMatch, 'Test 2 FAILED: Nginx config has an incorrect "root" directive for static files.');
      console.log('✅ PASSED: Test 2 - Nginx config has the correct "root" directive.');
    },
  };

  try {
    const nginxConfig = await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(`Failed to fetch Nginx config: ${stderr}`);
        }
        resolve(stdout);
      });
    });

    console.log('--- Fetched Nginx Config ---');
    console.log(nginxConfig.trim());
    console.log('--------------------------');

    await tests.verifyApiProxyConfiguration(nginxConfig);
    await tests.verifyRootConfiguration(nginxConfig);

    console.log('\n--- Test Suite Finished: Nginx configuration is correct! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED: A critical Nginx configuration test failed.');
    console.error(error.message);
    process.exit(1);
  }
}

runNginxConfigTest();
