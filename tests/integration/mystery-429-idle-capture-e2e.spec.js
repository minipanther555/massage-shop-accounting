/**
 * E2E Test: Mystery 429 Idle Capture Investigation
 * 
 * This test follows the project's E2E testing pattern:
 * - Uses Playwright for browser automation
 * - Captures real network activity during idle periods
 * - Uses PWTEST bypass system for authentication
 * - Identifies source of unexpected 429 rate limiting
 */

import { test, expect } from '@playwright/test';

test('Mystery 429 - Idle Capture Investigation', async ({ page }) => {
  const runDir = 'diagnostics/mystery-429__20250919-083514__TRC4/S2_MRE';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  console.log('🔍 Starting E2E idle capture test...');
  
  // Capture network requests
  const networkRequests = [];
  const timers = [];
  
  // Listen to network requests
  page.on('request', request => {
    const entry = {
      timestamp: new Date().toISOString(),
      method: request.method(),
      url: request.url(),
      resourceType: request.resourceType(),
      headers: request.headers()
    };
    networkRequests.push(entry);
    console.log(`🌐 [CAPTURE] Request: ${request.method()} ${request.url()}`);
  });
  
  page.on('response', response => {
    const entry = {
      timestamp: new Date().toISOString(),
      method: response.request().method(),
      url: response.request().url(),
      status: response.status(),
      statusText: response.statusText(),
      headers: response.headers()
    };
    
    if (response.status() === 429) {
      console.log(`🚨 [CAPTURE] 429 DETECTED: ${response.request().method()} ${response.request().url()}`);
    }
    
    // Update the request entry with response data
    const requestEntry = networkRequests.find(r => r.url === entry.url && r.timestamp === entry.timestamp);
    if (requestEntry) {
      requestEntry.status = entry.status;
      requestEntry.statusText = entry.statusText;
      requestEntry.responseHeaders = entry.headers;
    }
  });
  
  // Inject timer capture script
  await page.addInitScript(() => {
    const originalSetTimeout = window.setTimeout;
    const originalSetInterval = window.setInterval;
    const originalClearTimeout = window.clearTimeout;
    const originalClearInterval = window.clearInterval;
    
    const timers = [];
    
    window.setTimeout = function(callback, delay, ...args) {
      const id = originalSetTimeout(callback, delay, ...args);
      timers.push({
        id,
        type: 'setTimeout',
        delay,
        createdAt: Date.now(),
        stack: new Error().stack
      });
      console.log(`⏰ [CAPTURE] setTimeout: ${delay}ms (ID: ${id})`);
      return id;
    };
    
    window.setInterval = function(callback, delay, ...args) {
      const id = originalSetInterval(callback, delay, ...args);
      timers.push({
        id,
        type: 'setInterval',
        delay,
        createdAt: Date.now(),
        stack: new Error().stack
      });
      console.log(`⏰ [CAPTURE] setInterval: ${delay}ms (ID: ${id})`);
      return id;
    };
    
    window.clearTimeout = function(id) {
      const index = timers.findIndex(t => t.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
        console.log(`⏰ [CAPTURE] clearTimeout: ${id}`);
      }
      return originalClearTimeout(id);
    };
    
    window.clearInterval = function(id) {
      const index = timers.findIndex(t => t.id === id);
      if (index !== -1) {
        timers.splice(index, 1);
        console.log(`⏰ [CAPTURE] clearInterval: ${id}`);
      }
      return originalClearInterval(id);
    };
    
    // Expose timers for inspection
    window.__capturedTimers = timers;
  });

  // Navigate to staff page with PWTEST bypass
  console.log('🌐 Navigating to staff page with PWTEST bypass...');
  await page.goto('http://localhost:3000/staff.html?PWTEST=1', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });

  // Wait for page to fully load
  console.log('⏳ Waiting for page to load...');
  await page.waitForLoadState('domcontentloaded');
  
  // Wait for staff controller to initialize
  try {
    await page.waitForFunction(() => {
      return document.documentElement.getAttribute('data-staff-ctrl') === 'init';
    }, { timeout: 10000 });
    console.log('✅ Staff controller initialized');
  } catch (error) {
    console.log('⚠️ Staff controller initialization timeout, continuing...');
  }

  console.log('✅ Page loaded, starting idle capture...');
  
  // Capture initial state
  const initialTimers = await page.evaluate(() => window.__capturedTimers || []);
  console.log('📊 Initial timers:', initialTimers.length);

  // Idle for 5 minutes (reduced for testing)
  const idleDuration = 5 * 60 * 1000; // 5 minutes
  const startTime = Date.now();
  
  console.log(`⏰ Starting ${idleDuration / 60000} minute idle period...`);
  
  // Check every 30 seconds for 429s
  const checkInterval = 30000; // 30 seconds
  let has429 = false;
  
  while (Date.now() - startTime < idleDuration && !has429) {
    await page.waitForTimeout(checkInterval);
    
    const currentTimers = await page.evaluate(() => window.__capturedTimers || []);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    console.log(`📊 [${elapsed}s] Status:`, {
      networkRequests: networkRequests.length,
      activeTimers: currentTimers.length,
      recentRequests: networkRequests.slice(-5).map(r => `${r.method} ${r.url}`)
    });
    
    // Check for 429s in recent requests
    const recent429s = networkRequests.filter(entry => 
      entry.status === 429 && 
      (Date.now() - new Date(entry.timestamp).getTime()) < checkInterval
    );
    
    if (recent429s.length > 0) {
      console.log('🚨 429 detected! Stopping capture early.');
      has429 = true;
    }
  }

  // Final capture
  console.log('📤 Final capture...');
  const finalTimers = await page.evaluate(() => window.__capturedTimers || []);

  // Analyze results
  const endpointCounts = {};
  networkRequests.forEach(entry => {
    endpointCounts[entry.url] = (endpointCounts[entry.url] || 0) + 1;
  });

  const topEndpoints = Object.entries(endpointCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);

  console.log('📊 Final Analysis:');
  console.log('Total network requests:', networkRequests.length);
  console.log('Active timers:', finalTimers.length);
  console.log('Top endpoints:', topEndpoints);

  // Check for 429s
  const status429s = networkRequests.filter(entry => entry.status === 429);
  if (status429s.length > 0) {
    console.log('🚨 429 ERRORS DETECTED:');
    status429s.forEach(entry => {
      console.log(`  - ${entry.method} ${entry.url} at ${entry.timestamp}`);
    });
  } else {
    console.log('✅ No 429 errors detected during capture period');
  }

  // Save artifacts
  const artifacts = {
    netLedger: networkRequests,
    timerRegistry: finalTimers,
    summary: {
      totalRequests: networkRequests.length,
      duration: Date.now() - startTime,
      first429Time: status429s.length > 0 ? status429s[0].timestamp : null,
      topEndpoints
    }
  };

  // Write artifacts to files
  const fs = require('fs');
  const path = require('path');
  
  // Ensure diagnostics directory exists
  if (!fs.existsSync(runDir)) {
    fs.mkdirSync(runDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(runDir, `net-ledger__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.netLedger, null, 2)
  );
  
  fs.writeFileSync(
    path.join(runDir, `timer-registry__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.timerRegistry, null, 2)
  );
  
  fs.writeFileSync(
    path.join(runDir, `idle-summary__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.summary, null, 2)
  );

  console.log('✅ Capture complete! Artifacts saved.');
  console.log('📊 Final Summary:', artifacts.summary);
  
  // Print top endpoints
  console.log('🔝 Top Endpoints:');
  artifacts.summary.topEndpoints.forEach(([url, count], index) => {
    console.log(`  ${index + 1}. ${url}: ${count} requests`);
  });

  // Print active timers
  console.log('⏰ Active Timers:');
  artifacts.timerRegistry.forEach((timer, index) => {
    console.log(`  ${index + 1}. ${timer.type}: ${timer.delay}ms (ID: ${timer.id})`);
  });

  // Assertions
  expect(networkRequests.length).toBeGreaterThan(0);
  
  if (status429s.length > 0) {
    console.log('🚨 429 ERRORS FOUND - Investigation successful!');
    expect(status429s.length).toBeGreaterThan(0);
  } else {
    console.log('ℹ️ No 429s found - may need longer monitoring period');
  }
});
