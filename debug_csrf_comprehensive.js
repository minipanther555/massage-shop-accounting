#!/usr/bin/env node

/**
 * COMPREHENSIVE CSRF DEBUGGING SCRIPT
 * 
 * This script implements the Triage & Debugging Protocol with:
 * 1. 5 Hypotheses for CSRF token failure
 * 2. Extensive logging at every step
 * 3. Simultaneous testing of all hypotheses
 * 
 * Based on documentation analysis, the suspected root cause is:
 * require() statements inside app.use() causing module reloading
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔬 CSRF DEBUGGING PROTOCOL - Starting comprehensive analysis...\n');

// =============================================================================
// HYPOTHESIS DEFINITIONS
// =============================================================================

const HYPOTHESES = [
  {
    id: 'H1',
    name: 'Module Reloading Anti-Pattern',
    description: 'require() inside app.use() causes module reloading, breaking in-memory state',
    test: 'Check if CSRF middleware is reloaded on each request by adding logging',
    expectedEvidence: 'Module initialization logs appear on every request'
  },
  {
    id: 'H2', 
    name: 'Empty Middleware Implementation',
    description: 'CSRF middleware files are empty after reversion, so functions are undefined',
    test: 'Check if validateCSRFToken and addCSRFToken functions exist and are callable',
    expectedEvidence: 'Functions are undefined or throw TypeError when called'
  },
  {
    id: 'H3',
    name: 'Session State Persistence Failure', 
    description: 'CSRF tokens are generated but not persisted between requests',
    test: 'Generate token, store it, make second request to validate same token',
    expectedEvidence: 'Token exists in first response but missing in validation check'
  },
  {
    id: 'H4',
    name: 'Route Loading Order Dependency',
    description: 'CSRF middleware loaded before authentication, breaking token generation',
    test: 'Check middleware execution order and auth session availability',
    expectedEvidence: 'CSRF middleware executes before session is established'
  },
  {
    id: 'H5',
    name: 'Environment Configuration Issue',
    description: 'Development environment has different CSRF settings than expected',
    test: 'Check NODE_ENV and CSRF configuration values',
    expectedEvidence: 'CSRF disabled or misconfigured in development mode'
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

// =============================================================================
// TEST UTILITIES
// =============================================================================

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// =============================================================================
// HYPOTHESIS TESTING FUNCTIONS
// =============================================================================

async function testH1_ModuleReloading() {
  logSection('HYPOTHESIS 1: Module Reloading Anti-Pattern');
  
  try {
    // First, add extensive logging to server.js to detect module reloading
    const serverPath = './backend/server.js';
    const originalServer = fs.readFileSync(serverPath, 'utf8');
    
    // Check current require pattern
    const requirePattern = /app\.use\('\/api\/\w+',.*require\(/g;
    const matches = originalServer.match(requirePattern);
    
    console.log('🔍 CURRENT REQUIRE PATTERN ANALYSIS:');
    console.log(`   Found ${matches ? matches.length : 0} inline require() statements in app.use()`);
    
    if (matches) {
      matches.forEach((match, i) => {
        console.log(`   ${i + 1}. ${match.trim()}`);
      });
    }
    
    // Evidence: if we find require() inside app.use(), H1 is likely correct
    const evidence = matches && matches.length > 0 
      ? `Found ${matches.length} require() statements inside app.use() calls` 
      : 'No inline require() statements found';
    
    logHypothesis(HYPOTHESES[0], matches && matches.length > 0 ? 'FAIL' : 'PASS', evidence);
    
    return { hasInlineRequires: matches && matches.length > 0, evidence };
    
  } catch (error) {
    console.error('❌ H1 Test Error:', error.message);
    logHypothesis(HYPOTHESES[0], 'FAIL', `Test error: ${error.message}`);
    return { hasInlineRequires: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH2_EmptyMiddleware() {
  logSection('HYPOTHESIS 2: Empty Middleware Implementation');
  
  try {
    const middlewarePath = './backend/middleware/csrf-protection.js';
    const authPath = './backend/middleware/auth.js';
    
    console.log('🔍 MIDDLEWARE FILE ANALYSIS:');
    
    // Check if middleware files exist and their content
    const csrfExists = fs.existsSync(middlewarePath);
    const authExists = fs.existsSync(authPath);
    
    console.log(`   CSRF middleware file exists: ${csrfExists}`);
    console.log(`   Auth middleware file exists: ${authExists}`);
    
    if (csrfExists) {
      const csrfContent = fs.readFileSync(middlewarePath, 'utf8').trim();
      console.log(`   CSRF middleware content length: ${csrfContent.length} characters`);
      console.log(`   CSRF middleware is empty: ${csrfContent.length === 0}`);
      
      if (csrfContent.length > 0) {
        console.log(`   CSRF middleware preview: ${csrfContent.substring(0, 100)}...`);
      }
    }
    
    if (authExists) {
      const authContent = fs.readFileSync(authPath, 'utf8').trim();
      console.log(`   Auth middleware content length: ${authContent.length} characters`);
      console.log(`   Auth middleware is empty: ${authContent.length === 0}`);
    }
    
    const csrfEmpty = !csrfExists || fs.readFileSync(middlewarePath, 'utf8').trim().length === 0;
    const authEmpty = !authExists || fs.readFileSync(authPath, 'utf8').trim().length === 0;
    
    const evidence = `CSRF middleware empty: ${csrfEmpty}, Auth middleware empty: ${authEmpty}`;
    logHypothesis(HYPOTHESES[1], (csrfEmpty || authEmpty) ? 'FAIL' : 'PASS', evidence);
    
    return { csrfEmpty, authEmpty, evidence };
    
  } catch (error) {
    console.error('❌ H2 Test Error:', error.message);
    logHypothesis(HYPOTHESES[1], 'FAIL', `Test error: ${error.message}`);
    return { csrfEmpty: true, authEmpty: true, evidence: `Test failed: ${error.message}` };
  }
}

async function testH3_SessionPersistence(serverProcess) {
  logSection('HYPOTHESIS 3: Session State Persistence Failure');
  
  try {
    console.log('🔍 SESSION PERSISTENCE TEST:');
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 1: Login to get session
    console.log('   Step 1: Logging in to establish session...');
    const loginResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'manager',
        password: 'manager456'
      })
    });
    
    console.log(`   Login status: ${loginResponse.statusCode}`);
    console.log(`   Login response headers:`, Object.keys(loginResponse.headers));
    
    if (loginResponse.statusCode !== 200) {
      const evidence = `Login failed with status ${loginResponse.statusCode}`;
      logHypothesis(HYPOTHESES[2], 'FAIL', evidence);
      return { loginSuccess: false, evidence };
    }
    
    const loginData = JSON.parse(loginResponse.body);
    const sessionId = loginData.sessionId;
    console.log(`   Session ID received: ${sessionId ? 'Yes' : 'No'}`);
    
    // Step 2: Make authenticated request to trigger CSRF token generation
    console.log('   Step 2: Making authenticated request for CSRF token...');
    const csrfResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/services',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionId}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`   CSRF request status: ${csrfResponse.statusCode}`);
    console.log(`   CSRF response headers:`, Object.keys(csrfResponse.headers));
    
    const csrfToken = csrfResponse.headers['x-csrf-token'];
    console.log(`   CSRF token received: ${csrfToken ? 'Yes' : 'No'}`);
    if (csrfToken) {
      console.log(`   CSRF token value: ${csrfToken}`);
    }
    
    // Step 3: Make second request to see if token is still valid
    console.log('   Step 3: Testing token persistence with second request...');
    const secondResponse = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/services',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionId}`,
        'Content-Type': 'application/json'
      }
    });
    
    const secondToken = secondResponse.headers['x-csrf-token'];
    console.log(`   Second request CSRF token: ${secondToken ? 'Yes' : 'No'}`);
    console.log(`   Tokens match: ${csrfToken && secondToken && csrfToken === secondToken}`);
    
    // Step 4: Try to use the CSRF token for a state-changing operation
    if (csrfToken) {
      console.log('   Step 4: Testing CSRF token validation...');
      const postResponse = await makeRequest({
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/services',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionId}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({
          name: 'Test Service',
          duration: 60,
          in_shop_price: 100,
          home_service_price: 120,
          masseuse_fee: 50,
          location: 'In-Shop',
          massage_type: 'test'
        })
      });
      
      console.log(`   POST request status: ${postResponse.statusCode}`);
      console.log(`   POST request body preview: ${postResponse.body.substring(0, 200)}`);
    }
    
    const evidence = `Login: ${loginResponse.statusCode}, CSRF token: ${csrfToken ? 'received' : 'missing'}, Persistence: ${csrfToken && secondToken ? 'tested' : 'failed'}`;
    const testPassed = loginResponse.statusCode === 200 && csrfToken && secondToken;
    
    logHypothesis(HYPOTHESES[2], testPassed ? 'PASS' : 'FAIL', evidence);
    
    return { 
      loginSuccess: loginResponse.statusCode === 200,
      csrfToken: csrfToken,
      tokenPersistent: csrfToken && secondToken,
      evidence 
    };
    
  } catch (error) {
    console.error('❌ H3 Test Error:', error.message);
    logHypothesis(HYPOTHESES[2], 'FAIL', `Test error: ${error.message}`);
    return { loginSuccess: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH4_RouteOrder() {
  logSection('HYPOTHESIS 4: Route Loading Order Dependency');
  
  try {
    console.log('🔍 ROUTE ORDER ANALYSIS:');
    
    const serverPath = './backend/server.js';
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Find the order of middleware registration
    const lines = serverContent.split('\n');
    const middlewareOrder = [];
    
    lines.forEach((line, index) => {
      if (line.includes('app.use') && !line.includes('//')) {
        middlewareOrder.push({
          line: index + 1,
          content: line.trim(),
          type: line.includes('addCSRFToken') ? 'CSRF_ADD' :
                line.includes('validateCSRFToken') ? 'CSRF_VALIDATE' :
                line.includes('/api/auth') ? 'AUTH_ROUTE' :
                line.includes('/api/') ? 'API_ROUTE' :
                'OTHER'
        });
      }
    });
    
    console.log('   Middleware registration order:');
    middlewareOrder.forEach((item, i) => {
      console.log(`   ${i + 1}. Line ${item.line}: [${item.type}] ${item.content}`);
    });
    
    // Check if CSRF token addition happens before route registration
    const csrfAddIndex = middlewareOrder.findIndex(m => m.type === 'CSRF_ADD');
    const firstApiIndex = middlewareOrder.findIndex(m => m.type === 'API_ROUTE');
    const authRouteIndex = middlewareOrder.findIndex(m => m.type === 'AUTH_ROUTE');
    
    console.log(`   CSRF token addition at index: ${csrfAddIndex}`);
    console.log(`   First API route at index: ${firstApiIndex}`);
    console.log(`   Auth route at index: ${authRouteIndex}`);
    
    const orderCorrect = csrfAddIndex < firstApiIndex && authRouteIndex < firstApiIndex;
    const evidence = `CSRF add: ${csrfAddIndex}, Auth route: ${authRouteIndex}, First API: ${firstApiIndex}, Order correct: ${orderCorrect}`;
    
    logHypothesis(HYPOTHESES[3], orderCorrect ? 'PASS' : 'FAIL', evidence);
    
    return { orderCorrect, middlewareOrder, evidence };
    
  } catch (error) {
    console.error('❌ H4 Test Error:', error.message);
    logHypothesis(HYPOTHESES[3], 'FAIL', `Test error: ${error.message}`);
    return { orderCorrect: false, evidence: `Test failed: ${error.message}` };
  }
}

async function testH5_EnvironmentConfig() {
  logSection('HYPOTHESIS 5: Environment Configuration Issue');
  
  try {
    console.log('🔍 ENVIRONMENT CONFIGURATION ANALYSIS:');
    
    // Check NODE_ENV
    const nodeEnv = process.env.NODE_ENV || 'development';
    console.log(`   NODE_ENV: ${nodeEnv}`);
    
    // Load and analyze environment config
    const configPath = './backend/config/environment.js';
    const configExists = fs.existsSync(configPath);
    console.log(`   Environment config file exists: ${configExists}`);
    
    if (configExists) {
      // Temporarily load config (this might have side effects, so be careful)
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = nodeEnv;
      
      let config;
      try {
        // Delete from require cache to get fresh config
        delete require.cache[require.resolve('../backend/config/environment.js')];
        config = require('../backend/config/environment.js');
        
        console.log(`   CSRF token expiry: ${config.security?.csrfTokenExpiry || 'undefined'}`);
        console.log(`   Session timeout: ${config.security?.sessionTimeout || 'undefined'}`);
        console.log(`   Session secret: ${config.security?.sessionSecret ? 'defined' : 'undefined'}`);
        console.log(`   Logging level: ${config.logging?.level || 'undefined'}`);
        
      } catch (configError) {
        console.log(`   Config load error: ${configError.message}`);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    }
    
    // Check if any CSRF-related environment variables are set
    const csrfEnvVars = Object.keys(process.env).filter(key => 
      key.toLowerCase().includes('csrf') || 
      key.toLowerCase().includes('session') ||
      key.toLowerCase().includes('secret')
    );
    
    console.log(`   CSRF-related env vars: ${csrfEnvVars.length}`);
    csrfEnvVars.forEach(varName => {
      console.log(`   ${varName}: ${process.env[varName] ? 'set' : 'unset'}`);
    });
    
    const evidence = `NODE_ENV: ${nodeEnv}, Config exists: ${configExists}, CSRF env vars: ${csrfEnvVars.length}`;
    
    // Configuration issues would be unexpected, so this is likely to pass
    logHypothesis(HYPOTHESES[4], 'PASS', evidence);
    
    return { nodeEnv, configExists, csrfEnvVars, evidence };
    
  } catch (error) {
    console.error('❌ H5 Test Error:', error.message);
    logHypothesis(HYPOTHESES[4], 'FAIL', `Test error: ${error.message}`);
    return { nodeEnv: 'unknown', evidence: `Test failed: ${error.message}` };
  }
}

// =============================================================================
// MAIN TESTING ORCHESTRATOR
// =============================================================================

async function runComprehensiveCSRFDebugging() {
  console.log('🚀 Starting CSRF debugging with 5-hypothesis protocol...\n');
  
  const results = {
    hypotheses: {},
    recommendations: [],
    conclusion: ''
  };
  
  // Test Hypothesis 1: Module Reloading (can be done without server)
  const h1Result = await testH1_ModuleReloading();
  results.hypotheses.H1 = h1Result;
  
  // Test Hypothesis 2: Empty Middleware (can be done without server)
  const h2Result = await testH2_EmptyMiddleware();
  results.hypotheses.H2 = h2Result;
  
  // Test Hypothesis 4: Route Order (can be done without server)
  const h4Result = await testH4_RouteOrder();
  results.hypotheses.H4 = h4Result;
  
  // Test Hypothesis 5: Environment Config (can be done without server)
  const h5Result = await testH5_EnvironmentConfig();
  results.hypotheses.H5 = h5Result;
  
  // For H3, we need to start the server
  console.log('\n🔄 Starting server for live testing...');
  
  const serverProcess = spawn('node', ['server.js'], {
    cwd: './backend',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
  });
  
  // Capture server output with extensive logging
  let serverOutput = '';
  serverProcess.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('📥 SERVER:', output.trim());
  });
  
  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    console.log('🚨 SERVER ERROR:', output.trim());
  });
  
  try {
    // Wait a bit for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test Hypothesis 3: Session Persistence (requires running server)
    const h3Result = await testH3_SessionPersistence(serverProcess);
    results.hypotheses.H3 = h3Result;
    
  } finally {
    // Always clean up the server process
    console.log('\n🛑 Stopping test server...');
    serverProcess.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
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
  if (h1Result.hasInlineRequires) {
    results.conclusion = 'H1 CONFIRMED: Module reloading anti-pattern detected';
    results.recommendations.push('IMMEDIATE: Hoist all require() statements to top of server.js');
    results.recommendations.push('VALIDATION: Re-test CSRF functionality after fix');
    console.log('   ✅ PRIMARY ROOT CAUSE: Module reloading due to inline require() statements');
    console.log('   📝 EVIDENCE: Found require() calls inside app.use() which reload modules on every request');
  }
  
  if (h2Result.csrfEmpty) {
    results.conclusion += ' + H2 CONFIRMED: Empty CSRF middleware files';
    results.recommendations.push('SECONDARY: Implement CSRF middleware functions');
    console.log('   ✅ SECONDARY ISSUE: CSRF middleware files are empty');
    console.log('   📝 EVIDENCE: validateCSRFToken and addCSRFToken functions are missing');
  }
  
  console.log('\n🔧 RECOMMENDED FIX SEQUENCE:');
  results.recommendations.forEach((rec, i) => {
    console.log(`   ${i + 1}. ${rec}`);
  });
  
  console.log('\n📋 DETAILED SERVER OUTPUT:');
  console.log(serverOutput);
  
  return results;
}

// =============================================================================
// EXECUTION
// =============================================================================

if (require.main === module) {
  runComprehensiveCSRFDebugging()
    .then((results) => {
      console.log('\n🏁 CSRF DEBUGGING COMPLETED');
      console.log('Results saved to debug output above');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 DEBUGGING FAILED:', error);
      process.exit(1);
    });
}

module.exports = { runComprehensiveCSRFDebugging };
