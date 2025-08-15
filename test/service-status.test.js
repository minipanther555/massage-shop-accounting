const { exec } = require('child_process');
const assert = require('assert');

// Test Suite: Verify Systemd Service Status
async function runServiceStatusTest() {
  console.log('--- Running Test Suite: Systemd Service Status Verification ---');
  
  // Commands to check the service and the listening port
  const serviceStatusCommand = `ssh massage "sudo systemctl is-active massage-shop"`;
  const portListenCommand = `ssh massage "sudo lsof -i :3000 | grep LISTEN"`;

  const tests = {
    // Test 1: Is the systemd service active?
    async verifyServiceIsActive() {
      const stdout = await new Promise((resolve, reject) => {
        exec(serviceStatusCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('--- RAW ERROR (service check) ---', error);
            console.error('--- RAW STDERR (service check) ---', stderr);
            return reject(`Service status check failed: ${stderr}`);
          }
          resolve(stdout.trim());
        });
      });
      assert.strictEqual(stdout, 'active', `Test 1 FAILED: The 'massage-shop' service is not active. Status: ${stdout}`);
      console.log('✅ PASSED: Test 1 - The systemd service "massage-shop" is active.');
    },

    // Test 2: Is the Node.js process listening on port 3000?
    async verifyProcessIsListening() {
      const stdout = await new Promise((resolve, reject) => {
        exec(portListenCommand, (error, stdout, stderr) => {
          if (error) {
            console.error('--- RAW ERROR (port check) ---', error);
            console.error('--- RAW STDERR (port check) ---', stderr);
            return reject(`Port listening check failed: ${stderr}`);
          }
          resolve(stdout);
        });
      });
      assert.ok(stdout.includes('node'), 'Test 2 FAILED: No "node" process is listening on port 3000.');
      assert.ok(stdout.includes('LISTEN'), 'Test 2 FAILED: The process on port 3000 is not in a LISTEN state.');
      console.log('✅ PASSED: Test 2 - A Node.js process is correctly listening on port 3000.');
    },
  };

  try {
    await tests.verifyServiceIsActive();
    await tests.verifyProcessIsListening();

    console.log('\n--- Test Suite Finished: The application service is running correctly! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED: A critical service status test failed.');
    console.error(error.message);
    process.exit(1);
  }
}

runServiceStatusTest();
