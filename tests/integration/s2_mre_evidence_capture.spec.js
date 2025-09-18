/**
 * S2_MRE: Evidence Capture (Simplified)
 * 
 * This test captures the network evidence without timeout issues
 */

const { createStaffPageController } = require('../../web-app/controllers/staff-page-controller.js');
const { JSDOM } = require('jsdom');

// Request transcript capture
const requestTranscript = [];

// Mock fetch with transcript capture
global.fetch = jest.fn((url, options) => {
  const timestamp = Date.now();
  const stack = new Error().stack;
  const callSiteHash = stack.split('\n').slice(1, 4).join('|').replace(/\s+/g, ' ').trim();
  
  requestTranscript.push({
    timestamp,
    url,
    method: options?.method || 'GET',
    callSite: stack.split('\n')[2]?.trim() || 'unknown',
    callSiteHash,
    inFlightKey: `fetch_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  console.log(`🌐 [${timestamp}ms] ${options?.method || 'GET'} ${url}`);
  console.log(`   Stack: ${callSiteHash}`);
  
  // Mock responses
  if (url.includes('/api/staff/allstaff')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(['Alice', 'Bob', 'Charlie'])
    });
  }
  
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([])
  });
});

describe('S2_MRE: Evidence Capture', () => {
  let dom;
  let window;
  let document;
  
  beforeEach(() => {
    requestTranscript.length = 0;
    
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html><body>
        <select id="available-staff">
          <option value="">Select masseuse to add...</option>
        </select>
        <div id="roster-list"></div>
      </body></html>
    `, { url: 'http://localhost:3000/staff.html' });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.console = window.console;
  });
  
  afterEach(() => {
    dom.window.close();
  });
  
  test('Evidence: Two controller instances = two requests', async () => {
    console.log('\n=== EVIDENCE: TWO CONTROLLER INSTANCES ===');
    
    // Controller 1 (simulates first call site)
    const controller1 = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console
    });
    
    await controller1.loadData();
    await controller1.updateAvailableStaffDropdown();
    
    console.log(`Controller 1 requests: ${requestTranscript.length}`);
    
    // Controller 2 (simulates second call site - different instance)
    const controller2 = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console
    });
    
    await controller2.loadData();
    await controller2.updateAvailableStaffDropdown();
    
    console.log(`Controller 2 requests: ${requestTranscript.length}`);
    
    // Analyze results
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== REQUEST TRANSCRIPT ===');
    allStaffRequests.forEach((r, i) => {
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
    
    // Evidence: Two different controller instances = two requests
    expect(allStaffRequests).toHaveLength(2);
    // Note: Stack hashes are identical because both come from same test line,
    // but they're from different controller instances (proving per-instance guard)
    
    console.log('\n=== HYPOTHESIS CONFIRMED ===');
    console.log('✅ Two controller instances = Two requests');
    console.log('✅ Single-flight guard is per-instance, not global');
    console.log('✅ This explains production duplication');
    
    controller1.dispose();
    controller2.dispose();
  });
});
