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
    log('\n' + '='.repeat(60), 'cyan');
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
        } else {
            logWarning(`${description}: NOT FOUND`);
            return { exists: false };
        }
    } catch (error) {
        logError(`${description}: ERROR - ${error.message}`);
        return { exists: false, error: error.message };
    }
}

function checkFilePermissions(filePath, description) {
    try {
        const stats = fs.statSync(filePath);
        const mode = stats.mode.toString(8);
        const uid = stats.uid;
        const gid = stats.gid;
        
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
                logSuccess(`  → Ownership is correct (massage-shop:massage-shop)`);
            } else {
                logError(`  → Ownership is WRONG (${username}:${groupname}) - should be massage-shop:massage-shop`);
            }
            
            if (mode & 0o666) {
                logSuccess(`  → Permissions allow read/write (666)`);
            } else {
                logWarning(`  → Permissions may be too restrictive (${mode})`);
            }
        }
        
        return { exists: true, mode, uid, gid, username, groupname };
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
            logError(`  → Cannot read payment methods table`);
        }
        
        // Check staff table schema
        const staffSchemaQuery = `sqlite3 "${dbPath}" ".schema staff" 2>/dev/null || echo 'ERROR'`;
        const staffSchemaResult = runCommand(staffSchemaQuery, `Staff table schema in ${description}`);
        
        if (staffSchemaResult.success && staffSchemaResult.output !== 'ERROR') {
            const hasPaymentFields = staffSchemaResult.output.includes('total_fees_earned') && 
                                   staffSchemaResult.output.includes('total_fees_paid');
            if (hasPaymentFields) {
                logSuccess(`  → Staff table has payment tracking fields`);
            } else {
                logWarning(`  → Staff table missing payment tracking fields`);
            }
        }
        
        // Check staff_roster table schema
        const rosterSchemaQuery = `sqlite3 "${dbPath}" ".schema staff_roster" 2>/dev/null || echo 'ERROR'`;
        const rosterSchemaResult = runCommand(rosterSchemaQuery, `Staff roster table schema in ${description}`);
        
        if (rosterSchemaResult.success && rosterSchemaResult.output !== 'ERROR') {
            const hasPaymentFields = rosterSchemaResult.output.includes('total_fees_earned') && 
                                   rosterSchemaResult.output.includes('total_fees_paid');
            if (hasPaymentFields) {
                logWarning(`  → Staff roster table has payment fields (should not)`);
            } else {
                logSuccess(`  → Staff roster table correctly lacks payment fields`);
            }
        }
        
        return { success: true };
    } catch (error) {
        logError(`Schema check failed for ${description}: ${error.message}`);
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
        checkFilePermissions(correctDbPath, 'Correct Database Permissions');
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
    
    const gitTrackedFiles = runCommand('cd /opt/massage-shop && git ls-files | grep -E "(massage_shop\.db|\.env)"', 'Git tracked database/env files');
    if (gitTrackedFiles.success && gitTrackedFiles.output) {
        logError('❌ CRITICAL: Database or .env files are tracked by Git!');
        logError('  → This will cause permission and path issues');
        console.log('Tracked files:', gitTrackedFiles.output);
    } else {
        logSuccess('✅ No database or .env files tracked by Git');
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
    
    // Phase 7: Check PM2 Status
    logSection('PHASE 7: PM2 STATUS CHECK');
    
    const pm2Status = runCommand('sudo pm2 list', 'PM2 process list');
    if (pm2Status.success) {
        logInfo('PM2 status:');
        console.log(pm2Status.output);
    }
    
    const pm2Startup = runCommand('sudo pm2 startup', 'PM2 startup configuration');
    if (pm2Startup.success) {
        logInfo('PM2 startup configuration:');
        console.log(pm2Startup.output);
    }
    
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
    
    if (gitTrackedFiles.success && gitTrackedFiles.output) {
        criticalIssues++;
        logError(`CRITICAL ISSUE ${criticalIssues}: Database/.env files tracked by Git`);
    }
    
    logInfo(`\n📊 DIAGNOSTIC SUMMARY:`);
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

module.exports = { main, checkFileExists, checkFilePermissions, checkDatabaseSchema };
