/**
 * S6_CI_Gate: Final Regression Test
 * 
 * This test ensures the duplicate dropdown bug is permanently fixed
 * and serves as a CI gate to prevent regressions.
 */

const { createStaffPageController } = require('../../web-app/controllers/staff-page-controller.js');
const { JSDOM } = require('jsdom');

// Request transcript capture
const requestTranscript = [];

// Mock fetch with transcript capture
global.fetch = jest.fn((url, options) => {
  const timestamp = Date.now();
  
  requestTranscript.push({
    timestamp,
    url,
    method: options?.method || 'GET'
  });
  
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

describe('S6_CI_Gate: Duplicate Dropdown Prevention', () => {
  let dom;
  let window;
  let document;
  let singleFlightGuard;
  
  beforeEach(async () => {
    // Reset all state
    requestTranscript.length = 0;
    singleFlightGuard = new Map();
    
    // Reset modules and mocks
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllTimers();
    
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
  
  afterEach(async () => {
    dom.window.close();
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });
  
  test('CRITICAL: Initial Load Window must have exactly 1 request', async () => {
    const controller = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console,
      singleFlight: singleFlightGuard
    });
    
    // Simulate initial load
    await controller.init();
    await new Promise(resolve => setImmediate(resolve));
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    // CRITICAL ASSERTION: Must be exactly 1 request
    expect(allStaffRequests).toHaveLength(1);
    
    controller.dispose();
  });
  
  test('CRITICAL: Re-entrancy must be deduped to 1 request', async () => {
    const controller = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console,
      singleFlight: singleFlightGuard
    });
    
    // Simulate rapid re-entrancy
    const promise1 = controller.updateAvailableStaffDropdown();
    const promise2 = controller.updateAvailableStaffDropdown();
    const promise3 = controller.updateAvailableStaffDropdown();
    
    await Promise.all([promise1, promise2, promise3]);
    await new Promise(resolve => setImmediate(resolve));
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    // CRITICAL ASSERTION: Must be exactly 1 request
    expect(allStaffRequests).toHaveLength(1);
    
    controller.dispose();
  });
  
  test('CRITICAL: Multiple controllers must share guard (1 request)', async () => {
    // Create multiple controllers with shared guard
    const controllers = Array.from({ length: 5 }, () => 
      createStaffPageController({
        fetch: global.fetch,
        clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
        logger: console,
        singleFlight: singleFlightGuard
      })
    );
    
    // All controllers call simultaneously
    const promises = controllers.map(controller => 
      controller.updateAvailableStaffDropdown()
    );
    
    await Promise.all(promises);
    await new Promise(resolve => setImmediate(resolve));
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    // CRITICAL ASSERTION: Must be exactly 1 request
    expect(allStaffRequests).toHaveLength(1);
    
    controllers.forEach(controller => controller.dispose());
  });
  
  test('CRITICAL: 20x deterministic repeat (no flakiness)', async () => {
    const results = [];
    
    for (let i = 0; i < 20; i++) {
      // Reset state for each iteration
      requestTranscript.length = 0;
      singleFlightGuard.clear();
      
      const controller = createStaffPageController({
        fetch: global.fetch,
        clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
        logger: console,
        singleFlight: singleFlightGuard
      });
      
      // Test re-entrancy
      const promise1 = controller.updateAvailableStaffDropdown();
      const promise2 = controller.updateAvailableStaffDropdown();
      
      await Promise.all([promise1, promise2]);
      await new Promise(resolve => setImmediate(resolve));
      
      const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
      results.push(allStaffRequests.length);
      
      controller.dispose();
    }
    
    // CRITICAL ASSERTION: All runs must have exactly 1 request
    results.forEach((count, index) => {
      expect(count).toBe(1);
    });
    
    // CRITICAL ASSERTION: No variance (all results identical)
    const uniqueResults = [...new Set(results)];
    expect(uniqueResults).toHaveLength(1);
    expect(uniqueResults[0]).toBe(1);
    
    console.log(`✅ CI Gate: 20x deterministic repeat passed - all ${results.length} runs had exactly 1 request`);
  });
});
