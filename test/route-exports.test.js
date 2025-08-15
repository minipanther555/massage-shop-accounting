const fs = require('fs');
const path = require('path');
const assert = require('assert');

// A simple test runner
function runTest() {
  console.log('--- Running Test Suite: Backend Route Exports ---');

  const routesDir = path.join(__dirname, '../backend/routes');
  let files;
  
  try {
    files = fs.readdirSync(routesDir);
  } catch (err) {
    console.error(`❌ FAILED: Could not read routes directory: ${routesDir}`);
    console.error(err);
    process.exit(1); // Exit with a failure code
  }
  
  const routeFiles = files.filter(file => file.endsWith('.js'));
  
  assert.ok(routeFiles.length > 0, 'No route files found to test.');
  console.log(`Found ${routeFiles.length} route files to test.`);

  let successCount = 0;
  let failureCount = 0;

  routeFiles.forEach(file => {
    const routePath = path.join(routesDir, file);
    try {
      const routeModule = require(routePath);
      
      assert.strictEqual(
        typeof routeModule, 
        'function', 
        `Route file '${file}' does not export a function (router). Found type: ${typeof routeModule}`
      );
      
      assert.ok(
        Array.isArray(routeModule.stack),
        `Route file '${file}' does not appear to be a valid Express router (missing 'stack' property).`
      );
      
      console.log(`✅ PASSED: ${file}`);
      successCount++;
    } catch (error) {
      console.error(`❌ FAILED: ${file}`);
      console.error(error.message);
      failureCount++;
    }
  });

  console.log('--- Test Suite Finished ---');
  console.log(`Summary: ${successCount} passed, ${failureCount} failed.`);
  
  if (failureCount > 0) {
    process.exit(1); // Exit with a failure code
  }
}

// Execute the test runner
runTest();
