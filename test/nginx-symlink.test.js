const { exec } = require('child_process');
const assert = require('assert');

// Test Suite: Verify Nginx Symlink Configuration
async function runNginxSymlinkTest() {
  console.log('--- Running Test Suite: Nginx Symlink Configuration Verification ---');
  
  // Command to list the contents of the sites-enabled directory in detail
  const command = `ssh massage "ls -l /etc/nginx/sites-enabled/"`;

  try {
    const stdout = await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(`Failed to list /etc/nginx/sites-enabled/: ${stderr}`);
        }
        resolve(stdout);
      });
    });

    console.log('--- Fetched /etc/nginx/sites-enabled/ Listing ---');
    console.log(stdout.trim());
    console.log('----------------------------------------------------');

    // The strict contract: Is 'default' a symlink pointing to the correct file?
    const expectedSymlink = 'massage-shop -> /etc/nginx/sites-available/massage-shop';
    
    assert.ok(
      stdout.includes(expectedSymlink),
      `Test FAILED: The symlink is incorrect.
       Expected to find a line containing: "${expectedSymlink}"
       Full output: \n${stdout}`
    );

    // Also check that it's a symlink, allowing for other files in the directory
    const symlinkLineRegex = /^lrwxrwxrwx.*massage-shop -> \/etc\/nginx\/sites-available\/massage-shop/;
    assert.ok(
      symlinkLineRegex.test(stdout),
      `Test FAILED: 'massage-shop' is not a correctly formatted symbolic link.`
    );

    console.log('\n--- Test Suite Finished: Nginx symlink configuration is correct! ---');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ FAILED: A critical Nginx symlink test failed.');
    console.error(error.message);
    process.exit(1);
  }
}

runNginxSymlinkTest();
