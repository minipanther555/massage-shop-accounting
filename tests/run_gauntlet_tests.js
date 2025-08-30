const { execSync } = require('child_process');
const path = require('path');

// S5_Gauntlet Test Runner - Regression & Side-Effects
console.log('🧪 Running S5_Gauntlet Tests - Regression & Side-Effects...');

const testFiles = [
  'tests/integration/homepage.revenue.absent.test.js',
  'tests/integration/nav.bilingual.present.test.js',
  'tests/integration/nav.bilingual.keys-coverage.test.js',
  'tests/integration/revenue.card.regression.test.js'
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

testFiles.forEach(testFile => {
  console.log(`\n📋 Running: ${testFile}`);
  try {
    const result = execSync(`npx jest ${testFile} --testEnvironment=node --verbose --json`, { 
      stdio: 'pipe',
      cwd: __dirname + '/..'
    });
    
    const testResult = JSON.parse(result.toString());
    const filePassed = testResult.numPassedTests;
    const fileTotal = testResult.numTotalTests;
    
    totalTests += fileTotal;
    passedTests += filePassed;
    
    if (filePassed === fileTotal) {
      console.log(`✅ ${testFile}: ${filePassed}/${fileTotal} tests passed`);
    } else {
      console.log(`❌ ${testFile}: ${filePassed}/${fileTotal} tests passed`);
      failedTests += (fileTotal - filePassed);
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${testFile}`);
    failedTests += 1;
  }
});

console.log(`\n📊 GAUNTLET RESULTS:`);
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (failedTests === 0) {
  console.log(`\n🎯 S5_Gauntlet COMPLETE - All tests passing`);
  console.log(`Ready for S6_RCA_Cleanup phase`);
} else {
  console.log(`\n⚠️  S5_Gauntlet INCOMPLETE - ${failedTests} tests failing`);
  console.log(`Investigation required before proceeding`);
}
