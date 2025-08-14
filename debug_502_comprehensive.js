#!/usr/bin/env node

/**
 * 502 BAD GATEWAY DEBUGGING SCRIPT
 * 
 * Implements Triage & Debugging Protocol for 502 errors:
 * 1. 5 Hypotheses for backend server failure
 * 2. Extensive logging at every step
 * 3. Simultaneous testing of all hypotheses
 * 
 * Current evidence: 
 * - Frontend shows 502 Bad Gateway
 * - Logs show "database.connect is not a function"
 * - Server keeps restarting (auto-restart loop)
 */

const { spawn } = require('child_process');

console.log('🔬 502 DEBUGGING PROTOCOL - Starting comprehensive analysis...\n');

// =============================================================================
// HYPOTHESIS DEFINITIONS
// =============================================================================

const HYPOTHESES = [
  {
    id: 'H1',
    name: 'Database Module Interface Change',
    description: 'database.js exports different interface in testing03 vs production',
    test: 'Compare database.js structure between branches and check export format',
    expectedEvidence: 'database.js exports object without connect method'
  },
  {
    id: 'H2', 
    name: 'Missing Database File Dependencies',
    description: 'Database module requires files that don\'t exist in testing03 branch',
    test: 'Check if required database files exist and have correct permissions',
    expectedEvidence: 'Missing .db file or database directory issues'
  },
  {
    id: 'H3',
    name: 'Node Module Version Mismatch', 
    description: 'SQLite or database dependencies incompatible after branch switch',
    test: 'Check package.json differences and node_modules integrity',
    expectedEvidence: 'Missing sqlite3 package or version conflicts'
  },
  {
    id: 'H4',
    name: 'Environment Configuration Mismatch',
    description: 'Production environment expects different database config than testing03',
    test: 'Check .env file and database path configuration between branches',
    expectedEvidence: 'Database path or NODE_ENV configuration issues'
  },
  {
    id: 'H5',
    name: 'File Permission or Path Issues',
    description: 'Database files not accessible due to permission/path changes',
    test: 'Check file permissions and database file accessibility',
    expectedEvidence: 'Permission denied or file not found errors'
  }
];

// =============================================================================
// LOGGING UTILITIES
// =============================================================================

function logHypothesis(hypothesis, status, evidence = '') {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '🔄';
  console.log(`${statusIcon} ${hypothesis.id}: ${hypothesis.name}`);
  console.log(`   Description: ${hypothesis.description}`);
  if (evidence) {
    console.log(`   Evidence: ${evidence}`);
  }
  console.log();
}

function logSection(title) {
  console.log('='.repeat(80));
  console.log(`📋 ${title}`);
  console.log('='.repeat(80));
}

function runSSHCommand(command) {
  return new Promise((resolve, reject) => {
    const process = spawn('ssh', ['massage', command], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let stdout = '';
    let stderr = '';
    
    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({ stdout, stderr, code });
    });
    
    process.on('error', (error) => {
      reject(error);
    });
  });
}

// =============================================================================
// HYPOTHESIS TESTING FUNCTIONS
// =============================================================================

async function testH1_DatabaseModuleInterface() {
  logSection('HYPOTHESIS 1: Database Module Interface Change');
  
  try {
    console.log('🔍 CHECKING DATABASE MODULE STRUCTURE ON PRODUCTION:');
    
    // Check current database.js content and structure
    const result = await runSSHCommand(`
      cd /opt/massage-shop/backend && 
      echo "=== DATABASE.JS CONTENT ===" && 
      cat models/database.js && 
      echo "=== DATABASE.JS FILE INFO ===" && 
      ls -la models/database.js && 
      echo "=== CHECKING EXPORTS ===" && 
      node -e "
        try {
          const db = require('./models/database.js');
          console.log('Database exports:', Object.keys(db));
          console.log('Connect method exists:', typeof db.connect);
          console.log('Database type:', typeof db);
          if (db.connect) console.log('Connect function:', db.connect.toString().substring(0, 100));
        } catch(e) {
          console.log('Error loading database:', e.message);
        }
      "
    `);
    
    console.log('📥 PRODUCTION DATABASE MODULE ANALYSIS:');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('🚨 STDERR:', result.stderr);
    }
    
    const hasConnectMethod = result.stdout.includes('Connect method exists: function');
    const evidence = hasConnectMethod ? 
      'Database module has connect method' : 
      'Database module missing connect method or has errors';
    
    logHypothesis(HYPOTHESES[0], hasConnectMethod ? 'PASS' : 'FAIL', evidence);
    
    return { hasConnectMethod, output: result.stdout, evidence };
    
  } catch (error) {
    console.error('❌ H1 Test Error:', error.message);
    logHypothesis(HYPOTHESES[0], 'FAIL', `Test error: ${error.message}`);
    return { hasConnectMethod: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH2_DatabaseFileDependencies() {
  logSection('HYPOTHESIS 2: Missing Database File Dependencies');
  
  try {
    console.log('🔍 CHECKING DATABASE FILES AND DEPENDENCIES:');
    
    const result = await runSSHCommand(`
      cd /opt/massage-shop && 
      echo "=== DATABASE FILE STRUCTURE ===" && 
      find . -name "*.db" -o -name "*database*" | head -20 && 
      echo "=== DATA DIRECTORY ===" && 
      ls -la data/ && 
      echo "=== BACKEND DATA DIRECTORY ===" && 
      ls -la backend/data/ && 
      echo "=== SQLITE3 INSTALLATION ===" && 
      which sqlite3 && 
      echo "=== NODE SQLITE3 MODULE ===" && 
      cd backend && npm list sqlite3 && 
      echo "=== PACKAGE.JSON DEPENDENCIES ===" && 
      grep -A 5 -B 5 sqlite package.json
    `);
    
    console.log('📥 DATABASE FILES AND DEPENDENCIES:');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('🚨 STDERR:', result.stderr);
    }
    
    const hasDatabaseFile = result.stdout.includes('.db');
    const hasSqliteModule = result.stdout.includes('sqlite3@');
    const evidence = `Database file found: ${hasDatabaseFile}, SQLite3 module: ${hasSqliteModule}`;
    
    logHypothesis(HYPOTHESES[1], (hasDatabaseFile && hasSqliteModule) ? 'PASS' : 'FAIL', evidence);
    
    return { hasDatabaseFile, hasSqliteModule, evidence };
    
  } catch (error) {
    console.error('❌ H2 Test Error:', error.message);
    logHypothesis(HYPOTHESES[1], 'FAIL', `Test error: ${error.message}`);
    return { hasDatabaseFile: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH3_NodeModuleVersions() {
  logSection('HYPOTHESIS 3: Node Module Version Mismatch');
  
  try {
    console.log('🔍 CHECKING NODE MODULES AND PACKAGE VERSIONS:');
    
    const result = await runSSHCommand(`
      cd /opt/massage-shop/backend && 
      echo "=== NODE VERSION ===" && 
      node --version && 
      echo "=== NPM VERSION ===" && 
      npm --version && 
      echo "=== PACKAGE.JSON DEPENDENCIES ===" && 
      cat package.json && 
      echo "=== INSTALLED PACKAGES ===" && 
      npm list --depth=0 && 
      echo "=== NODE_MODULES INTEGRITY ===" && 
      ls -la node_modules/ | head -10 && 
      echo "=== SQLITE3 SPECIFIC ===" && 
      ls -la node_modules/sqlite3/ 2>/dev/null || echo "sqlite3 not found"
    `);
    
    console.log('📥 NODE MODULES AND VERSIONS:');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('🚨 STDERR:', result.stderr);
    }
    
    const hasNodeModules = result.stdout.includes('node_modules');
    const hasValidPackages = !result.stdout.includes('UNMET DEPENDENCY');
    const evidence = `Node modules exist: ${hasNodeModules}, No unmet dependencies: ${hasValidPackages}`;
    
    logHypothesis(HYPOTHESES[2], (hasNodeModules && hasValidPackages) ? 'PASS' : 'FAIL', evidence);
    
    return { hasNodeModules, hasValidPackages, evidence };
    
  } catch (error) {
    console.error('❌ H3 Test Error:', error.message);
    logHypothesis(HYPOTHESES[2], 'FAIL', `Test error: ${error.message}`);
    return { hasNodeModules: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH4_EnvironmentConfiguration() {
  logSection('HYPOTHESIS 4: Environment Configuration Mismatch');
  
  try {
    console.log('🔍 CHECKING ENVIRONMENT CONFIGURATION:');
    
    const result = await runSSHCommand(`
      cd /opt/massage-shop/backend && 
      echo "=== ENVIRONMENT VARIABLES ===" && 
      env | grep -E "(NODE_ENV|DB_|DATABASE)" && 
      echo "=== .ENV FILE ===" && 
      cat .env 2>/dev/null || echo "No .env file found" && 
      echo "=== CONFIG DIRECTORY ===" && 
      ls -la config/ && 
      echo "=== ENVIRONMENT CONFIG CONTENT ===" && 
      head -50 config/environment.js && 
      echo "=== TESTING CONFIG LOAD ===" && 
      node -e "
        try {
          process.env.NODE_ENV = 'production';
          const config = require('./config/environment.js');
          console.log('Config loaded successfully');
          console.log('Database config:', JSON.stringify(config.database, null, 2));
        } catch(e) {
          console.log('Config load error:', e.message);
        }
      "
    `);
    
    console.log('📥 ENVIRONMENT CONFIGURATION:');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('🚨 STDERR:', result.stderr);
    }
    
    const hasEnvConfig = result.stdout.includes('Config loaded successfully');
    const hasDbConfig = result.stdout.includes('Database config:');
    const evidence = `Environment config loads: ${hasEnvConfig}, Database config exists: ${hasDbConfig}`;
    
    logHypothesis(HYPOTHESES[3], (hasEnvConfig && hasDbConfig) ? 'PASS' : 'FAIL', evidence);
    
    return { hasEnvConfig, hasDbConfig, evidence };
    
  } catch (error) {
    console.error('❌ H4 Test Error:', error.message);
    logHypothesis(HYPOTHESES[3], 'FAIL', `Test error: ${error.message}`);
    return { hasEnvConfig: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH5_FilePermissions() {
  logSection('HYPOTHESIS 5: File Permission or Path Issues');
  
  try {
    console.log('🔍 CHECKING FILE PERMISSIONS AND PATHS:');
    
    const result = await runSSHCommand(`
      cd /opt/massage-shop && 
      echo "=== DIRECTORY PERMISSIONS ===" && 
      ls -la . && 
      echo "=== BACKEND PERMISSIONS ===" && 
      ls -la backend/ && 
      echo "=== DATA DIRECTORY PERMISSIONS ===" && 
      ls -la data/ && 
      ls -la backend/data/ && 
      echo "=== DATABASE FILE PERMISSIONS ===" && 
      find . -name "*.db" -exec ls -la {} \\; && 
      echo "=== OWNERSHIP ===" && 
      whoami && 
      echo "=== TESTING FILE ACCESS ===" && 
      cd backend && 
      node -e "
        const fs = require('fs');
        const path = require('path');
        console.log('Current working directory:', process.cwd());
        console.log('Testing file access...');
        try {
          fs.accessSync('../data/massage_shop.db', fs.constants.F_OK);
          console.log('Database file accessible at ../data/massage_shop.db');
        } catch(e) {
          console.log('Cannot access ../data/massage_shop.db:', e.message);
        }
        try {
          fs.accessSync('./data/massage_shop.db', fs.constants.F_OK);
          console.log('Database file accessible at ./data/massage_shop.db');
        } catch(e) {
          console.log('Cannot access ./data/massage_shop.db:', e.message);
        }
      "
    `);
    
    console.log('📥 FILE PERMISSIONS AND ACCESS:');
    console.log(result.stdout);
    if (result.stderr) {
      console.log('🚨 STDERR:', result.stderr);
    }
    
    const hasDbAccess = result.stdout.includes('Database file accessible');
    const hasProperPermissions = !result.stdout.includes('Permission denied');
    const evidence = `Database file accessible: ${hasDbAccess}, No permission errors: ${hasProperPermissions}`;
    
    logHypothesis(HYPOTHESES[4], (hasDbAccess && hasProperPermissions) ? 'PASS' : 'FAIL', evidence);
    
    return { hasDbAccess, hasProperPermissions, evidence };
    
  } catch (error) {
    console.error('❌ H5 Test Error:', error.message);
    logHypothesis(HYPOTHESES[4], 'FAIL', `Test error: ${error.message}`);
    return { hasDbAccess: false, evidence: `Test failed: ${error.message}` };
  }
}

// =============================================================================
// MAIN TESTING ORCHESTRATOR
// =============================================================================

async function runComprehensive502Debugging() {
  console.log('🚀 Starting 502 debugging with 5-hypothesis protocol...\n');
  
  const results = {
    hypotheses: {},
    recommendations: [],
    conclusion: ''
  };
  
  try {
    // Run all hypotheses in parallel for faster diagnosis
    console.log('🔄 Running all hypothesis tests simultaneously...\n');
    
    const [h1Result, h2Result, h3Result, h4Result, h5Result] = await Promise.all([
      testH1_DatabaseModuleInterface(),
      testH2_DatabaseFileDependencies(), 
      testH3_NodeModuleVersions(),
      testH4_EnvironmentConfiguration(),
      testH5_FilePermissions()
    ]);
    
    results.hypotheses = { 
      H1: h1Result, 
      H2: h2Result, 
      H3: h3Result, 
      H4: h4Result, 
      H5: h5Result 
    };
    
    // =============================================================================
    // ANALYSIS AND RECOMMENDATIONS
    // =============================================================================
    
    logSection('COMPREHENSIVE ANALYSIS RESULTS');
    
    console.log('📊 HYPOTHESIS TEST RESULTS:');
    Object.entries(results.hypotheses).forEach(([key, result]) => {
      const hypothesis = HYPOTHESES.find(h => h.id === key);
      console.log(`   ${key}: ${hypothesis.name}`);
      console.log(`       Evidence: ${result.evidence}`);
    });
    
    console.log('\n🎯 ROOT CAUSE ANALYSIS:');
    
    // Determine most likely root cause based on evidence
    if (!h1Result.hasConnectMethod) {
      results.conclusion = 'H1 CONFIRMED: Database module interface has changed';
      results.recommendations.push('IMMEDIATE: Fix database.js exports to include connect method');
      results.recommendations.push('VALIDATION: Check database module structure between branches');
      console.log('   ✅ PRIMARY ROOT CAUSE: Database module missing connect method');
      console.log('   📝 EVIDENCE: database.connect is not a function error in logs');
    }
    
    if (!h2Result.hasDatabaseFile || !h2Result.hasSqliteModule) {
      results.conclusion += ' + H2 CONFIRMED: Missing database dependencies';
      results.recommendations.push('SECONDARY: Install missing database dependencies');
      console.log('   ✅ SECONDARY ISSUE: Missing database files or SQLite3 module');
    }
    
    if (!h4Result.hasEnvConfig) {
      results.conclusion += ' + H4 CONFIRMED: Environment configuration issues';
      results.recommendations.push('TERTIARY: Fix environment configuration');
      console.log('   ✅ TERTIARY ISSUE: Environment configuration problems');
    }
    
    console.log('\n🔧 RECOMMENDED FIX SEQUENCE:');
    results.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    // Add immediate fix command
    console.log('\n🚨 IMMEDIATE ACTION REQUIRED:');
    console.log('   Run: ssh massage "cd /opt/massage-shop/backend && cp models/database.js models/database.js.backup && nano models/database.js"');
    console.log('   Fix: Ensure database.js exports { connect: ... } function');
    
    return results;
    
  } catch (error) {
    console.error('\n💥 DEBUGGING FAILED:', error);
    return { error: error.message };
  }
}

// =============================================================================
// EXECUTION
// =============================================================================

if (require.main === module) {
  runComprehensive502Debugging()
    .then((results) => {
      console.log('\n🏁 502 DEBUGGING COMPLETED');
      console.log('Results analyzed - check output above for fix recommendations');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 DEBUGGING FAILED:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensive502Debugging };
