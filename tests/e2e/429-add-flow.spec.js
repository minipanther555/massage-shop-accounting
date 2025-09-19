/**
 * E2E Test: 429 Add Flow Investigation
 * 
 * This test reproduces the exact scenario where adding ~6 staff to roster
 * triggers 429 rate limiting. It captures the exact request sequence and
 * rate limit headers to identify the root cause.
 */

import { test, expect } from '@playwright/test';

test('429 Add Flow Investigation', async ({ page }) => {
  console.log('🔍 Starting 429 add flow investigation...');
  
  const events = [];
  const runDir = 'diagnostics/mystery-429__20250919-083514__TRC4/S2_MRE';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // Capture all network requests and responses
  page.on('request', (req) => {
    events.push({ 
      t: Date.now(), 
      type: 'req', 
      method: req.method(), 
      url: req.url(),
      headers: req.headers()
    });
  });
  
  page.on('response', async (res) => {
    const url = res.url();
    const status = res.status();
    const headers = await res.allHeaders();
    
    events.push({ 
      t: Date.now(), 
      type: 'res', 
      url, 
      status, 
      headers,
      rateLimit: {
        limit: headers['ratelimit-limit'] || headers['x-ratelimit-limit'],
        remaining: headers['ratelimit-remaining'] || headers['x-ratelimit-remaining'],
        reset: headers['ratelimit-reset'] || headers['retry-after']
      }
    });
    
    if (status === 429) {
      console.log(`🚨 [CAPTURE] 429 DETECTED: ${res.request().method()} ${url}`);
    }
  });

  // Navigate to staff page with PWTEST bypass
  console.log('🌐 Navigating to staff page...');
  await page.goto('http://localhost:3000/staff.html?PWTEST=1', { 
    waitUntil: 'networkidle',
    timeout: 30000 
  });

  // Wait for page to load
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

  // Helper function to add one staff member to roster
  async function addOneStaff() {
    console.log('👤 Adding one staff member...');
    
    // Wait for available staff dropdown
    await page.waitForSelector('#available-staff');
    
    // Get available options
    const options = await page.$$eval('#available-staff option', opts =>
      opts.map(o => ({ value: o.value, text: o.textContent.trim() }))
        .filter(o => o.value && o.value !== '')
    );
    
    if (!options.length) {
      throw new Error('No available staff options found');
    }
    
    // Select first available option
    const selectedOption = options[0];
    console.log(`📝 Selecting: ${selectedOption.text} (${selectedOption.value})`);
    
    await page.selectOption('#available-staff', selectedOption.value);
    
    // Click add button
    await page.click('#btn-add-staff');
    
    // Wait for the request to complete (success or 429)
    await page.waitForTimeout(500);
    
    return selectedOption;
  }

  // Add staff members until we hit 429 or reach limit
  let adds = 0;
  let saw429 = false;
  const addedStaff = [];
  
  console.log('🔄 Starting add sequence...');
  
  while (adds < 10 && !saw429) {
    adds++;
    console.log(`\n--- Add #${adds} ---`);
    
    try {
      const added = await addOneStaff();
      addedStaff.push(added);
      
      // Check if last few responses include 429
      const recentResponses = events
        .filter(e => e.type === 'res')
        .slice(-6);
      
      const has429 = recentResponses.some(e => e.status === 429);
      if (has429) {
        console.log('🚨 429 detected in recent responses!');
        saw429 = true;
        break;
      }
      
      // Log rate limit status
      const lastResponse = recentResponses[recentResponses.length - 1];
      if (lastResponse && lastResponse.rateLimit) {
        console.log(`📊 Rate limit status: ${lastResponse.rateLimit.remaining}/${lastResponse.rateLimit.limit} remaining`);
      }
      
    } catch (error) {
      console.error(`❌ Error on add #${adds}:`, error.message);
      break;
    }
  }

  // Analyze results
  console.log('\n📊 Analysis Results:');
  console.log(`Total adds attempted: ${adds}`);
  console.log(`429 detected: ${saw429}`);
  console.log(`Staff added: ${addedStaff.length}`);

  // Count API requests by endpoint
  const apiRequests = events.filter(e => 
    e.type === 'res' && 
    e.url.includes('/api/') && 
    !e.url.includes('sentry')
  );
  
  const endpointCounts = {};
  apiRequests.forEach(req => {
    const url = new URL(req.url);
    const key = `${req.method} ${url.pathname}`;
    endpointCounts[key] = (endpointCounts[key] || 0) + 1;
  });

  console.log('\n🔝 API Request Counts:');
  Object.entries(endpointCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([endpoint, count]) => {
      console.log(`  ${endpoint}: ${count} requests`);
    });

  // Show rate limit progression
  const rateLimitResponses = apiRequests.filter(req => req.rateLimit && req.rateLimit.remaining !== undefined);
  if (rateLimitResponses.length > 0) {
    console.log('\n📈 Rate Limit Progression:');
    rateLimitResponses.forEach((req, index) => {
      const url = new URL(req.url);
      console.log(`  ${index + 1}. ${req.method} ${url.pathname}: ${req.rateLimit.remaining}/${req.rateLimit.limit} remaining`);
    });
  }

  // Show 429 responses
  const status429s = apiRequests.filter(req => req.status === 429);
  if (status429s.length > 0) {
    console.log('\n🚨 429 Responses:');
    status429s.forEach((req, index) => {
      const url = new URL(req.url);
      console.log(`  ${index + 1}. ${req.method} ${url.pathname} at ${new Date(req.t).toISOString()}`);
    });
  }

  // Save artifacts
  const artifacts = {
    events,
    summary: {
      totalAdds: adds,
      saw429,
      addedStaff,
      endpointCounts,
      rateLimitProgression: rateLimitResponses.map(req => ({
        method: req.method,
        url: req.url,
        remaining: req.rateLimit.remaining,
        limit: req.rateLimit.limit,
        timestamp: new Date(req.t).toISOString()
      })),
      status429s: status429s.map(req => ({
        method: req.method,
        url: req.url,
        timestamp: new Date(req.t).toISOString()
      }))
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
    path.join(runDir, `add-flow-events__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.events, null, 2)
  );
  
  fs.writeFileSync(
    path.join(runDir, `add-flow-summary__${timestamp}__TRC4.json`),
    JSON.stringify(artifacts.summary, null, 2)
  );

  console.log('\n✅ Investigation complete! Artifacts saved.');
  console.log(`📁 Saved to: ${runDir}`);

  // Assertions
  expect(events.length).toBeGreaterThan(0);
  
  if (saw429) {
    console.log('🚨 429 ERRORS FOUND - Investigation successful!');
    expect(status429s.length).toBeGreaterThan(0);
  } else {
    console.log('ℹ️ No 429s found - may need more adds or different conditions');
  }
});
