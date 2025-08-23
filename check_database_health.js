#!/usr/bin/env node

/**
 * Comprehensive Database Health Check Script
 * Checks for all known database issues and their recurrence
 * Based on /00-project-docs/database/database-issues-and-solutions.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`🔍 ${title}`, 'cyan');
  log('='.repeat(60), 'cyan');
}

function logSection(title) {
  log(`\n📋 ${title}`, 'blue');
  log('-'.repeat(40), 'blue');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'white');
}

function runCommand(command, description) {
  try {
    logInfo(`Running: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    return { success: true, output: result.trim() };
  } catch (error) {
    return { success: false, output: error.message };
  }
}

function checkFileExists(filePath, description) {
  try {
    const exists = fs.existsSync(filePath);
    if (exists) {
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024).toFixed(2);
      logSuccess(`${description}: EXISTS (${size} KB)`);
      return { exists: true, size, stats };
    }
    logWarning(`${description}: NOT FOUND`);
    return { exists: false };
  } catch (error) {
    logError(`${description}: ERROR - ${error.message}`);
    return { exists: false, error: error.message };
  }
}

function checkFilePermissions(filePath, description) {
  try {
    const stats = fs.statSync(filePath);
    const mode = stats.mode.toString(8);
    const { uid } = stats;
    const { gid } = stats;

    // Get user and group names
    let username = 'unknown';
    let groupname = 'unknown';

    try {
      username = execSync(`id -un ${uid}`, { encoding: 'utf8' }).trim();
    } catch (e) {}

    try {
      groupname = execSync(`id -gn ${gid}`, { encoding: 'utf8' }).trim();
    } catch (e) {}

    const permissions = {
      owner: (mode & 0o400) ? 'r' : '-',
      owner: (mode & 0o200) ? 'w' : '-',
      owner: (mode & 0o100) ? 'x' : '-',
      group: (mode & 0o040) ? 'r' : '-',
      group: (mode & 0o020) ? 'w' : '-',
      group: (mode & 0o010) ? 'x' : '-',
      other: (mode & 0o004) ? 'r' : '-',
      other: (mode & 0o002) ? 'w' : '-',
      other: (mode & 0o001) ? 'x' : '-'
    };

    const permString = `${permissions.owner}${permissions.group}${permissions.other}`;

    logInfo(`${description}: ${username}:${groupname} ${permString} (${mode})`);

    // Check if permissions are correct for database
    if (description.includes('database') || description.includes('massage_shop.db')) {
      if (username === 'massage-shop' && groupname === 'massage-shop') {
        logSuccess('  → Ownership is correct (massage-shop:massage-shop)');
      } else {
        logError(`  → Ownership is WRONG (${username}:${groupname}) - should be massage-shop:massage-shop`);
      }

      if (mode & 0o666) {
        logSuccess('  → Permissions allow read/write (666)');
      } else {
        logWarning(`  → Permissions may be too restrictive (${mode})`);
      }
    }

    return {
      exists: true, mode, uid, gid, username, groupname
    };
  } catch (error) {
    logError(`${description}: ERROR - ${error.message}`);
    return { exists: false, error: error.message };
  }
}

function checkDatabaseSchema(dbPath, description) {
  try {
    // Check if SQLite3 is available
    const sqliteCheck = runCommand('which sqlite3', 'SQLite3 availability check');
    if (!sqliteCheck.success) {
      logWarning(`SQLite3 not available - cannot check schema for ${description}`);
      return { success: false, reason: 'sqlite3_not_available' };
    }

    // Check payment methods count (indicator of correct database)
    const paymentMethodsQuery = `sqlite3 "${dbPath}" "SELECT COUNT(*) FROM payment_methods;" 2>/dev/null || echo 'ERROR'`;
    const paymentMethodsResult = runCommand(paymentMethodsQuery, `Payment methods count in ${description}`);

    if (paymentMethodsResult.success && paymentMethodsResult.output !== 'ERROR') {
      const count = parseInt(paymentMethodsResult.output);
      if (count >= 8) {
        logSuccess(`  → Payment methods: ${count} (appears to be correct database)`);
      } else if (count > 0) {
        logWarning(`  → Payment methods: ${count} (may be incomplete database)`);
      } else {
        logError(`  → Payment methods: ${count} (appears to be empty database)`);
      }
    } else {
      logError('  → Cannot read payment methods table');
    }

    // Check staff table schema
    const staffSchemaQuery = `sqlite3 "${dbPath}" ".schema staff" 2>/dev/null || echo 'ERROR'`;
    const staffSchemaResult = runCommand(staffSchemaQuery, `Staff table schema in ${description}`);

    if (staffSchemaResult.success && staffSchemaResult.output !== 'ERROR') {
      const hasPaymentFields = staffSchemaResult.output.includes('total_fees_earned')
                                   && staffSchemaResult.output.includes('total_fees_paid');
      if (hasPaymentFields) {
        logSuccess('  → Staff table has payment tracking fields');
      } else {
        logWarning('  → Staff table missing payment tracking fields');
      }
    }

    // Check staff_roster table schema
    const rosterSchemaQuery = `sqlite3 "${dbPath}" ".schema staff_roster" 2>/dev/null || echo 'ERROR'`;
    const rosterSchemaResult = runCommand(rosterSchemaQuery, `Staff roster table schema in ${description}`);

    if (rosterSchemaResult.success && rosterSchemaResult.output !== 'ERROR') {
      const hasPaymentFields = rosterSchemaResult.output.includes('total_fees_earned')
                                   && rosterSchemaResult.output.includes('total_fees_paid');
      if (hasPaymentFields) {
        logWarning('  → Staff roster table has payment fields (should not)');
      } else {
        logSuccess('  → Staff roster table correctly lacks payment fields');
      }
    }

    return { success: true };
  } catch (error) {
    logError(`Schema check failed for ${description}: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function validateSystemdConfiguration() {
  logSection('SYSTEMD CONFIGURATION VALIDATION');

  try {
    const systemdConfig = execSync('systemctl cat massage-shop', { encoding: 'utf8' });

    // Check WorkingDirectory
    const workingDirMatch = systemdConfig.match(/WorkingDirectory=(.+)/);
    if (workingDirMatch) {
      const workingDir = workingDirMatch[1].trim();
      if (workingDir === '/opt/massage-shop') {
        logSuccess('✅ WorkingDirectory: CORRECT (/opt/massage-shop)');
      } else {
        logError(`❌ WorkingDirectory: WRONG (${workingDir}) - should be /opt/massage-shop`);
      }
    } else {
      logWarning('⚠️ WorkingDirectory: NOT FOUND in systemd config');
    }

    // Check ExecStart
    const execStartMatch = systemdConfig.match(/ExecStart=(.+)/);
    if (execStartMatch) {
      const execStart = execStartMatch[1].trim();
      if (execStart === '/usr/bin/node backend/server.js') {
        logSuccess('✅ ExecStart: CORRECT (/usr/bin/node backend/server.js)');
      } else {
        logError(`❌ ExecStart: WRONG (${execStart}) - should be /usr/bin/node backend/server.js`);
      }
    } else {
      logWarning('⚠️ ExecStart: NOT FOUND in systemd config');
    }

    // Check User
    const userMatch = systemdConfig.match(/User=(.+)/);
    if (userMatch) {
      const user = userMatch[1].trim();
      if (user === 'massage-shop') {
        logSuccess('✅ User: CORRECT (massage-shop)');
      } else {
        logError(`❌ User: WRONG (${user}) - should be massage-shop`);
      }
    } else {
      logWarning('⚠️ User: NOT FOUND in systemd config');
    }

    return { workingDir: workingDirMatch?.[1]?.trim(), execStart: execStartMatch?.[1]?.trim(), user: userMatch?.[1]?.trim() };
  } catch (error) {
    logError(`❌ Failed to validate systemd configuration: ${error.message}`);
    return null;
  }
}

function testDatabaseWritePermissions(dbPath) {
  logSection('DATABASE WRITE PERMISSION TESTING');

  try {
    // Test if we can write to the database by creating a temporary table
    const testTableName = `test_write_${Date.now()}`;
    const createTableQuery = `sqlite3 "${dbPath}" "CREATE TABLE ${testTableName} (id INTEGER PRIMARY KEY, test TEXT);" 2>/dev/null || echo 'ERROR'`;
    const createResult = runCommand(createTableQuery, `Creating test table ${testTableName}`);

    if (createResult.success && createResult.output !== 'ERROR') {
      logSuccess('✅ Database write test: SUCCESS - can create tables');

      // Clean up - drop the test table
      const dropTableQuery = `sqlite3 "${dbPath}" "DROP TABLE ${testTableName};" 2>/dev/null || echo 'ERROR'`;
      runCommand(dropTableQuery, `Cleaning up test table ${testTableName}`);

      return { success: true, canWrite: true };
    }
    logError('❌ Database write test: FAILED - cannot create tables');
    return { success: false, canWrite: false, reason: 'create_table_failed' };
  } catch (error) {
    logError(`❌ Database write test failed: ${error.message}`);
    return { success: false, canWrite: false, error: error.message };
  }
}

function testPathResolution() {
  logSection('PATH RESOLUTION TESTING');

  try {
    // Test if the path from systemd working directory resolves correctly
    const systemdConfig = execSync('systemctl cat massage-shop', { encoding: 'utf8' });
    const workingDirMatch = systemdConfig.match(/WorkingDirectory=(.+)/);

    if (!workingDirMatch) {
      logWarning('⚠️ Cannot test path resolution - WorkingDirectory not found');
      return { success: false, reason: 'no_working_directory' };
    }

    const workingDir = workingDirMatch[1].trim();
    logInfo(`Testing path resolution from WorkingDirectory: ${workingDir}`);

    // Test the database path resolution
    const testPath = path.resolve(workingDir, './backend/data/massage_shop.db');
    logInfo(`Resolved path: ${workingDir} + ./backend/data/massage_shop.db = ${testPath}`);

    if (fs.existsSync(testPath)) {
      logSuccess('✅ Path resolution: SUCCESS - database file found at resolved path');
      return { success: true, resolvedPath: testPath, exists: true };
    }
    logError(`❌ Path resolution: FAILED - database file not found at resolved path: ${testPath}`);
    return { success: false, resolvedPath: testPath, exists: false };
  } catch (error) {
    logError(`❌ Path resolution test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function testAPIEndpoints() {
  logSection('API ENDPOINT FUNCTIONALITY TESTING');

  try {
    // Test if the service is running and responding
    const serviceStatus = execSync('systemctl is-active massage-shop', { encoding: 'utf8' }).trim();

    if (serviceStatus !== 'active') {
      logError(`❌ Service not running: ${serviceStatus}`);
      return { success: false, reason: 'service_not_running' };
    }

    logSuccess('✅ Service is running and active');

    // Test basic connectivity to localhost
    const localhostTest = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/services || echo "FAILED"', { encoding: 'utf8' }).trim();

    if (localhostTest === '200') {
      logSuccess('✅ Localhost API connectivity: SUCCESS (200 OK)');
    } else if (localhostTest === 'FAILED') {
      logError('❌ Localhost API connectivity: FAILED - cannot connect to localhost:3000');
      return { success: false, reason: 'localhost_connectivity_failed' };
    } else {
      logWarning(`⚠️ Localhost API connectivity: Unexpected response (${localhostTest})`);
    }

    // Test the critical admin staff endpoint
    const adminStaffTest = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/admin/staff || echo "FAILED"', { encoding: 'utf8' }).trim();

    if (adminStaffTest === '200') {
      logSuccess('✅ Admin staff endpoint: SUCCESS (200 OK)');
    } else if (adminStaffTest === '401') {
      logWarning('⚠️ Admin staff endpoint: Requires authentication (401 Unauthorized) - this is expected');
    } else if (adminStaffTest === '500') {
      logError('❌ Admin staff endpoint: Internal server error (500) - CRITICAL ISSUE');
      return { success: false, reason: 'admin_staff_500_error' };
    } else if (adminStaffTest === 'FAILED') {
      logError('❌ Admin staff endpoint: Cannot connect');
      return { success: false, reason: 'admin_staff_connectivity_failed' };
    } else {
      logWarning(`⚠️ Admin staff endpoint: Unexpected response (${adminStaffTest})`);
    }

    return { success: true, localhost: localhostTest, adminStaff: adminStaffTest };
  } catch (error) {
    logError(`❌ API endpoint testing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

function main() {
  logHeader('DATABASE HEALTH CHECK - COMPREHENSIVE DIAGNOSTIC');
  logInfo(`Timestamp: ${new Date().toISOString()}`);
  logInfo(`Script: ${__filename}`);

  // Phase 1: Check for Two-Database Problem
  logSection('PHASE 1: TWO-DATABASE PROBLEM CHECK');

  const correctDbPath = '/opt/massage-shop/backend/data/massage_shop.db';
  const incorrectDbPath = '/opt/massage-shop/data/massage_shop.db';

  logInfo('Checking for correct database location...');
  const correctDb = checkFileExists(correctDbPath, 'Correct Database (backend/data/massage_shop.db)');

  logInfo('Checking for incorrect database location...');
  const incorrectDb = checkFileExists(incorrectDbPath, 'Incorrect Database (data/massage_shop.db)');

  if (incorrectDb.exists) {
    logError('❌ TWO-DATABASE PROBLEM DETECTED!');
    logError('  → Incorrect database exists at /opt/massage-shop/data/massage_shop.db');
    logError('  → This will cause the app to connect to the wrong database');
  } else {
    logSuccess('✅ No duplicate database found');
  }

  // Phase 2: Check Database Permissions
  logSection('PHASE 2: DATABASE PERMISSIONS CHECK');

  if (correctDb.exists) {
    const permissions = checkFilePermissions(correctDbPath, 'Correct Database Permissions');

    // Enhanced permission validation
    if (permissions.exists && permissions.mode) {
      const { mode } = permissions;
      if (mode === '666' || mode === '664') {
        logSuccess('✅ Database permissions: CORRECT (readable and writable)');
      } else if (mode === '644') {
        logError('❌ Database permissions: WRONG (644 = read-only for group/others)');
        logError('  → This will cause SQLITE_READONLY errors');
      } else {
        logWarning(`⚠️ Database permissions: ${mode} (may be too restrictive)`);
      }
    }
  }

  if (incorrectDb.exists) {
    checkFilePermissions(incorrectDbPath, 'Incorrect Database Permissions');
  }

  // Phase 3: Check .env Files
  logSection('PHASE 3: ENVIRONMENT FILES CHECK');

  const rootEnvPath = '/opt/massage-shop/.env';
  const backendEnvPath = '/opt/massage-shop/backend/.env';

  logInfo('Checking root .env file...');
  const rootEnv = checkFileExists(rootEnvPath, 'Root .env file');
  if (rootEnv.exists) {
    checkFilePermissions(rootEnvPath, 'Root .env permissions');

    // Check .env content
    try {
      const envContent = fs.readFileSync(rootEnvPath, 'utf8');
      logInfo('Root .env content:');
      console.log(envContent);

      // Check for correct DATABASE_PATH
      if (envContent.includes('DATABASE_PATH=./backend/data/massage_shop.db')) {
        logSuccess('  → DATABASE_PATH is correct');
      } else if (envContent.includes('DATABASE_PATH=./data/massage_shop.db')) {
        logError('  → DATABASE_PATH is WRONG (points to incorrect location)');
      } else {
        logWarning('  → DATABASE_PATH not found or different format');
      }
    } catch (error) {
      logError(`Cannot read .env content: ${error.message}`);
    }
  }

  logInfo('Checking backend .env file...');
  const backendEnv = checkFileExists(backendEnvPath, 'Backend .env file');
  if (backendEnv.exists) {
    checkFilePermissions(backendEnvPath, 'Backend .env permissions');
    logWarning('  → Multiple .env files detected - this can cause conflicts');
  }

  // Phase 4: Check Database Schema
  logSection('PHASE 4: DATABASE SCHEMA CHECK');

  if (correctDb.exists) {
    checkDatabaseSchema(correctDbPath, 'Correct Database Schema');
  }

  if (incorrectDb.exists) {
    checkDatabaseSchema(incorrectDbPath, 'Incorrect Database Schema');
  }

  // Phase 5: Check Git Tracking
  logSection('PHASE 5: GIT TRACKING CHECK');

  const gitStatus = runCommand('cd /opt/massage-shop && git status', 'Git status');
  if (gitStatus.success) {
    logInfo('Git status:');
    console.log(gitStatus.output);
  }

  // Check for actual database files tracked by Git (not documentation)
  const gitTrackedDbFiles = runCommand('cd /opt/massage-shop && git ls-files | grep -E "(massage_shop\.db$|\.db$)"', 'Git tracked database files');
  if (gitTrackedDbFiles.success && gitTrackedDbFiles.output) {
    logError('❌ CRITICAL: Database files are tracked by Git!');
    logError('  → This will cause permission and path issues');
    console.log('Tracked database files:', gitTrackedDbFiles.output);
  } else {
    logSuccess('✅ No database files tracked by Git');
  }

  // Check for actual .env files tracked by Git (not documentation)
  const gitTrackedEnvFiles = runCommand('cd /opt/massage-shop && git ls-files | grep -E "^\\.env$"', 'Git tracked .env files');
  if (gitTrackedEnvFiles.success && gitTrackedEnvFiles.output) {
    logError('❌ CRITICAL: .env files are tracked by Git!');
    logError('  → This will cause permission and path issues');
    console.log('Tracked .env files:', gitTrackedEnvFiles.output);
  } else {
    logSuccess('✅ No .env files tracked by Git');
  }

  // Phase 6: Check Systemd Service
  logSection('PHASE 6: SYSTEMD SERVICE CHECK');

  const systemdStatus = runCommand('systemctl status massage-shop', 'Systemd service status');
  if (systemdStatus.success) {
    logInfo('Systemd service status:');
    console.log(systemdStatus.output);
  }

  const systemdConfig = runCommand('systemctl cat massage-shop', 'Systemd service configuration');
  if (systemdConfig.success) {
    logInfo('Systemd service configuration:');
    console.log(systemdConfig.output);
  }

  // Phase 6.5: Validate Systemd Configuration
  const systemdValidation = validateSystemdConfiguration();

  // Phase 6.6: Test Path Resolution
  const pathResolution = testPathResolution();

  // Phase 6.7: Test Database Write Permissions
  if (correctDb.exists) {
    const writeTest = testDatabaseWritePermissions(correctDbPath);
  }

  // Phase 6.8: Test API Endpoints
  const apiTest = testAPIEndpoints();

  // Phase 7: Check PM2 Status (Skipped - requires sudo access)
  logSection('PHASE 7: PM2 STATUS CHECK');
  logInfo('PM2 status check skipped - requires sudo access');
  logInfo('This check is not critical for diagnosing the 500 errors we keep experiencing');

  // Phase 8: Check for Automated Processes
  logSection('PHASE 8: AUTOMATED PROCESSES CHECK');

  const cronJobs = runCommand('crontab -l 2>/dev/null || echo "No crontab"', 'Cron jobs');
  logInfo('Cron jobs:');
  console.log(cronJobs.output);

  const systemdTimers = runCommand('systemctl list-timers | grep -E "(backup|deploy|massage)"', 'Systemd timers');
  logInfo('Systemd timers:');
  console.log(systemdTimers.output);

  // Phase 9: Check File System
  logSection('PHASE 9: FILE SYSTEM CHECK');

  const dataDirPermissions = runCommand('ls -la /opt/massage-shop/backend/data/', 'Data directory contents');
  logInfo('Data directory contents:');
  console.log(dataDirPermissions.output);

  const rootDataDir = runCommand('ls -la /opt/massage-shop/data/ 2>/dev/null || echo "Directory not found"', 'Root data directory');
  logInfo('Root data directory:');
  console.log(rootDataDir.output);

  // Phase 10: Summary and Recommendations
  logSection('PHASE 10: SUMMARY AND RECOMMENDATIONS');

  let issuesFound = 0;
  let criticalIssues = 0;

  if (incorrectDb.exists) {
    criticalIssues++;
    logError(`CRITICAL ISSUE ${criticalIssues}: Duplicate database exists`);
  }

  if (backendEnv.exists) {
    issuesFound++;
    logWarning(`ISSUE ${issuesFound}: Multiple .env files detected`);
  }

  if (gitTrackedDbFiles.success && gitTrackedDbFiles.output) {
    criticalIssues++;
    logError(`CRITICAL ISSUE ${criticalIssues}: Database files tracked by Git`);
  }

  if (gitTrackedEnvFiles.success && gitTrackedEnvFiles.output) {
    criticalIssues++;
    logError(`CRITICAL ISSUE ${criticalIssues}: .env files tracked by Git`);
  }

  // Check new critical issues
  if (systemdValidation) {
    if (systemdValidation.workingDir !== '/opt/massage-shop') {
      criticalIssues++;
      logError(`CRITICAL ISSUE ${criticalIssues}: Systemd WorkingDirectory is wrong`);
    }
    if (systemdValidation.execStart !== '/usr/bin/node backend/server.js') {
      criticalIssues++;
      logError(`CRITICAL ISSUE ${criticalIssues}: Systemd ExecStart is wrong`);
    }
  }

  if (pathResolution && !pathResolution.success) {
    criticalIssues++;
    logError(`CRITICAL ISSUE ${criticalIssues}: Path resolution failed`);
  }

  if (apiTest && apiTest.adminStaff === '500') {
    criticalIssues++;
    logError(`CRITICAL ISSUE ${criticalIssues}: Admin staff endpoint returns 500 error`);
  }

  logInfo('\n📊 DIAGNOSTIC SUMMARY:');
  logInfo(`  → Critical Issues: ${criticalIssues}`);
  logInfo(`  → Minor Issues: ${issuesFound}`);

  if (criticalIssues === 0 && issuesFound === 0) {
    logSuccess('🎉 All checks passed! Database system appears healthy.');
  } else if (criticalIssues > 0) {
    logError('🚨 CRITICAL ISSUES DETECTED - Immediate action required!');
  } else {
    logWarning('⚠️  Minor issues detected - review recommended.');
  }

  logInfo('\n📝 Next Steps:');
  if (criticalIssues > 0) {
    logInfo('  1. Fix critical issues immediately');
    logInfo('  2. Restart services after fixes');
    logInfo('  3. Re-run this diagnostic');
  } else {
    logInfo('  1. Monitor for recurring issues');
    logInfo('  2. Run this diagnostic periodically');
    logInfo('  3. Update documentation with any new issues');
  }
}

// Run the diagnostic
if (require.main === module) {
  main();
}

module.exports = {
  main,
  checkFileExists,
  checkFilePermissions,
  checkDatabaseSchema,
  validateSystemdConfiguration,
  testDatabaseWritePermissions,
  testPathResolution,
  testAPIEndpoints
};
