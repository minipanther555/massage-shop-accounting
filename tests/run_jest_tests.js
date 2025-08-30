const { execSync } = require('child_process');
const path = require('path');

// Simple Jest test runner
console.log('🧪 Running Jest tests for revenue removal and bilingual navigation...');

try {
  // Run Jest directly with our test files
  const testFiles = [
    'tests/integration/homepage.revenue.absent.test.js',
    'tests/integration/nav.bilingual.present.test.js'
  ];
  
  testFiles.forEach(testFile => {
    console.log(`\n📋 Running: ${testFile}`);
    try {
      execSync(`npx jest ${testFile} --testEnvironment=node --verbose`, { 
        stdio: 'inherit',
        cwd: __dirname + '/..'
      });
    } catch (error) {
      console.log(`❌ Test failed (expected for MRE): ${testFile}`);
    }
  });
  
} catch (error) {
  console.error('❌ Jest test runner failed:', error.message);
  process.exit(1);
}
