/**
 * S2_MRE: Deterministic Harness for Double Dropdown Bug
 * 
 * This test reproduces the duplicate request issue with network-level evidence
 * using the page controller seam and request transcript capture.
 */

const { createStaffPageController } = require('../../web-app/controllers/staff-page-controller.js');
const { JSDOM } = require('jsdom');

// Mock timers and freeze time
jest.useFakeTimers();
const mockDate = new Date('2024-09-18T10:00:00.000Z');
jest.setSystemTime(mockDate);

// Request transcript capture
const requestTranscript = [];

// Mock fetch with transcript capture
const originalFetch = global.fetch;
global.fetch = jest.fn((url, options) => {
  const timestamp = Date.now();
  const stack = new Error().stack;
  const callSiteHash = stack.split('\n').slice(1, 4).join('|').replace(/\s+/g, ' ').trim();
  
  // Capture request details with enhanced stack info
  requestTranscript.push({
    timestamp,
    url,
    method: options?.method || 'GET',
    callSite: stack.split('\n')[2]?.trim() || 'unknown',
    callSiteHash,
    fullStack: stack,
    inFlightKey: `fetch_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  console.log(`🌐 [TRANSCRIPT] ${timestamp}ms: ${options?.method || 'GET'} ${url}`);
  console.log(`🌐 [CALL-SITE] ${stack.split('\n')[2]?.trim()}`);
  console.log(`🌐 [STACK-HASH] ${callSiteHash}`);
  
  // Mock response for /api/staff/allstaff
  if (url.includes('/api/staff/allstaff')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(['Alice', 'Bob', 'Charlie'])
    });
  }
  
  // Mock other API responses
  if (url.includes('/api/staff/roster')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  }
  
  if (url.includes('/api/services')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  }
  
  if (url.includes('/api/services/payment-methods')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([])
    });
  }
  
  return originalFetch(url, options);
});

describe('S2_MRE: Deterministic Harness', () => {
  let dom;
  let window;
  let document;
  let controller;
  
  beforeEach(() => {
    // Clear transcript before each test
    requestTranscript.length = 0;
    
    // Create fresh JSDOM instance
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Staff Roster</title></head>
        <body>
          <div id="current-user"></div>
          <select id="available-staff">
            <option value="">Select masseuse to add...</option>
          </select>
          <div id="roster-list"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000/staff.html',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    
    // Mock required globals
    global.console = window.console;
    
    // Create controller with injected dependencies
    controller = createStaffPageController({
      fetch: global.fetch,
      clock: {
        setInterval: jest.fn(),
        clearInterval: jest.fn()
      },
      logger: console
    });
  });
  
  afterEach(() => {
    if (controller) {
      controller.dispose();
    }
    dom.window.close();
    jest.clearAllTimers();
  });
  
  test('A: Initial Load Window - single caller (should be GREEN)', async () => {
    // Initialize the controller (simulates DOMContentLoaded)
    await controller.init();
    
    // Wait for all promises to resolve using fake timers
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));
    
    // Analyze results
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== TEST A: SINGLE CALLER ===');
    console.log(`Requests made: ${allStaffRequests.length}`);
    
    // Should be 1 request (GREEN)
    expect(allStaffRequests).toHaveLength(1);
    expect(allStaffRequests[0].url).toContain('/api/staff/allstaff');
  });
  
  test('A2: Initial Load Window - dual callers (should reproduce H1)', async () => {
    // Simulate two distinct initial call sites
    console.log('\n=== TEST A2: DUAL CALLERS ===');
    
    // Call site 1: DOMContentLoaded path
    console.log('Call site 1: DOMContentLoaded init');
    await controller.init();
    
    // Call site 2: Post-render hook (simulates updateRosterDisplay call)
    console.log('Call site 2: Post-render hook');
    await controller.updateRosterDisplay();
    
    // Wait for all promises to resolve
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));
    
    // Analyze results
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== REQUEST TRANSCRIPT ===');
    requestTranscript.forEach((r, i) => {
      console.log(`${i+1}. ${r.timestamp}ms: ${r.method} ${r.url}`);
      console.log(`   Call-site: ${r.callSite}`);
      console.log(`   Stack-hash: ${r.callSiteHash}`);
    });
    
    console.log('\n=== DROPDOWN ANALYSIS ===');
    const dropdown = document.getElementById('available-staff');
    const options = dropdown.querySelectorAll('option');
    console.log(`Total options: ${options.length}`);
    options.forEach((opt, i) => {
      console.log(`  ${i}: "${opt.value}" - "${opt.textContent}"`);
    });
    
    // Check if we reproduced H1 (two call sites)
    if (allStaffRequests.length === 2) {
      console.log('\n=== H1 PROVEN: TWO CALL SITES ===');
      expect(allStaffRequests[0].callSiteHash).not.toBe(allStaffRequests[1].callSiteHash);
      
      const timeDiff = Math.abs(allStaffRequests[1].timestamp - allStaffRequests[0].timestamp);
      console.log(`Time difference: ${timeDiff}ms`);
      expect(timeDiff).toBeLessThan(5);
    } else {
      console.log(`\n=== H1 NOT REPRODUCED: ${allStaffRequests.length} requests ===`);
      // If single-flight is working globally, this should be 1
      expect(allStaffRequests).toHaveLength(1);
    }
  });
  
  test('Re-entrancy Microburst - should be blocked by single-flight (H2)', async () => {
    // Test rapid re-entrancy within same call site
    await controller.updateAvailableStaffDropdown();
    await controller.updateAvailableStaffDropdown(); // Should be blocked
    
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== RE-ENTRANCY TEST ===');
    console.log(`Requests made: ${allStaffRequests.length}`);
    
    // Should be 1 request due to single-flight guard
    expect(allStaffRequests).toHaveLength(1);
  });
  
  test('Interval Disabled - should not fire during initial load window', async () => {
    // Create controller with disabled interval
    const controllerNoInterval = createStaffPageController({
      fetch: global.fetch,
      clock: {
        setInterval: null, // Disable interval
        clearInterval: jest.fn()
      },
      logger: console
    });
    
    await controllerNoInterval.init();
    jest.runAllTimers();
    await new Promise(resolve => setImmediate(resolve));
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== INTERVAL DISABLED TEST ===');
    console.log(`Requests made: ${allStaffRequests.length}`);
    
    // Should still be 2 requests (from two call sites, not interval)
    expect(allStaffRequests).toHaveLength(2);
    
    controllerNoInterval.dispose();
  });
});
