const { exec } = require('child_process');
const path = require('path');
const assert = require('assert');

// Test Suite: Lint Frontend API Script for Syntax Errors
function runLintTest() {
  console.log('--- Running Test Suite: Lint web-app/api.js ---');

  const eslintPath = path.join(__dirname, '../node_modules/.bin/eslint');
  const targetFile = path.join(__dirname, '../web-app/api.js');

  // Modern ESLint automatically finds eslint.config.js in the project root
  const command = `${eslintPath} ${targetFile}`;

  console.log(`Executing command: ${command}`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ FAILED: ESLint found errors.');
      console.error(`Exit Code: ${error.code}`);
      console.error('--- STDOUT ---');
      console.error(stdout);
      console.error('--- STDERR ---');
      console.error(stderr);
      assert.fail(`Test failed: ESLint process exited with code ${error.code}. The file contains syntax errors.`);
      process.exit(1);
    }

    if (stderr) {
        console.warn('ESLint produced warnings:');
        console.warn(stderr);
    }

    console.log('✅ PASSED: ESLint completed with no syntax errors.');
    console.log('--- Test Suite Finished ---');
    process.exit(0);
  });
}

// Execute the test runner
runLintTest();
