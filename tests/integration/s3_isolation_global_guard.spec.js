/**
 * S3_Isolation: Global Guard Test
 * 
 * This test verifies that the global single-flight guard works
 */

const { createStaffPageController } = require('../../web-app/controllers/staff-page-controller.js');
const { JSDOM } = require('jsdom');

// Request transcript capture
const requestTranscript = [];

// Mock fetch with transcript capture
global.fetch = jest.fn((url, options) => {
  const timestamp = Date.now();
  const stack = new Error().stack;
  
  requestTranscript.push({
    timestamp,
    url,
    method: options?.method || 'GET',
    callSite: stack.split('\n')[2]?.trim() || 'unknown'
  });
  
  console.log(`🌐 [${timestamp}ms] ${options?.method || 'GET'} ${url}`);
  
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

describe('S3_Isolation: Global Guard Test', () => {
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
  
  test('Global Guard: Two simultaneous calls should result in 1 request', async () => {
    console.log('\n=== GLOBAL GUARD TEST ===');
    
    // Create two controllers
    const controller1 = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console
    });
    
    const controller2 = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console
    });
    
    // Call both simultaneously
    console.log('Calling controller1.updateAvailableStaffDropdown()');
    const promise1 = controller1.updateAvailableStaffDropdown();
    
    console.log('Calling controller2.updateAvailableStaffDropdown()');
    const promise2 = controller2.updateAvailableStaffDropdown();
    
    // Wait for both to complete
    await Promise.all([promise1, promise2]);
    
    // Analyze results
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== REQUEST TRANSCRIPT ===');
    allStaffRequests.forEach((r, i) => {
      console.log(`${i+1}. ${r.timestamp}ms: ${r.method} ${r.url}`);
    });
    
    console.log('\n=== DROPDOWN ANALYSIS ===');
    const dropdown = document.getElementById('available-staff');
    const options = dropdown.querySelectorAll('option');
    console.log(`Total options: ${options.length}`);
    options.forEach((opt, i) => {
      console.log(`  ${i}: "${opt.value}" - "${opt.textContent}"`);
    });
    
    // Should be 1 request due to global guard
    expect(allStaffRequests).toHaveLength(1);
    expect(options).toHaveLength(4); // 1 default + 3 staff
    
    console.log('\n=== GLOBAL GUARD WORKING ===');
    console.log('✅ Global single-flight guard prevents duplicate requests');
    
    controller1.dispose();
    controller2.dispose();
  });
});
