/**
 * S6_RCA_Cleanup: Deterministic Test Harness
 * 
 * This test implements proper isolation to prevent state leaks
 * and ensure deterministic results across test runs.
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

// Helper to flush microtasks and advance timers
async function tick() {
  await new Promise(resolve => queueMicrotask(resolve));
  jest.advanceTimersByTime(0);
}

// Helper to wait for transcript entries
async function waitForTranscript(expectedCount, timeoutMs = 1000) {
  const start = Date.now();
  while (requestTranscript.length < expectedCount && (Date.now() - start) < timeoutMs) {
    await tick();
  }
  return requestTranscript.length >= expectedCount;
}

describe('S6_RCA_Cleanup: Deterministic Test Harness', () => {
  let dom;
  let window;
  let document;
  let singleFlightGuard;
  
  beforeEach(async () => {
    // Reset all state
    requestTranscript.length = 0;
    
    // Create fresh single-flight guard per test
    singleFlightGuard = new Map();
    
    // Reset modules and mocks
    jest.resetModules();
    jest.restoreAllMocks();
    jest.clearAllTimers();
    
    // Flush microtasks
    await tick();
    
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
    // Clean up state
    dom.window.close();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    
    // Flush microtasks
    await tick();
  });
  
  test('Initial Load Window: Exactly 1 request', async () => {
    console.log('\n=== INITIAL LOAD WINDOW TEST ===');
    
    const controller = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console,
      singleFlight: singleFlightGuard
    });
    
    // Trigger initial load
    await controller.init();
    await tick();
    
    // Wait for transcript to be populated
    const hasTranscript = await waitForTranscript(1);
    expect(hasTranscript).toBe(true);
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log(`Initial Load Window: ${allStaffRequests.length} requests`);
    
    // CRITICAL: Must be exactly 1 request
    expect(allStaffRequests).toHaveLength(1);
    
    controller.dispose();
  });
  
  test('Re-entrancy: Exactly 1 request (guard dedupe)', async () => {
    console.log('\n=== RE-ENTRANCY TEST ===');
    
    const controller = createStaffPageController({
      fetch: global.fetch,
      clock: { setInterval: jest.fn(), clearInterval: jest.fn() },
      logger: console,
      singleFlight: singleFlightGuard
    });
    
    // Rapid successive calls within 5ms
    const promise1 = controller.updateAvailableStaffDropdown();
    const promise2 = controller.updateAvailableStaffDropdown();
    const promise3 = controller.updateAvailableStaffDropdown();
    
    await Promise.all([promise1, promise2, promise3]);
    await tick();
    
    // Wait for transcript to be populated
    const hasTranscript = await waitForTranscript(1);
    expect(hasTranscript).toBe(true);
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log(`Re-entrancy: ${allStaffRequests.length} requests`);
    
    // CRITICAL: Must be exactly 1 request
    expect(allStaffRequests).toHaveLength(1);
    
    controller.dispose();
  });
  
  test('Multiple Controllers: Exactly 1 request (shared guard)', async () => {
    console.log('\n=== MULTIPLE CONTROLLERS TEST ===');
    
    // Create multiple controllers with shared guard
    const controllers = Array.from({ length: 3 }, () => 
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
    await tick();
    
    // Wait for transcript to be populated
    const hasTranscript = await waitForTranscript(1);
    expect(hasTranscript).toBe(true);
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log(`Multiple Controllers: ${allStaffRequests.length} requests`);
    
    // CRITICAL: Must be exactly 1 request
    expect(allStaffRequests).toHaveLength(1);
    
    controllers.forEach(controller => controller.dispose());
  });
  
  test('Deterministic: 10x repeated runs', async () => {
    console.log('\n=== DETERMINISTIC REPEAT TEST ===');
    
    const results = [];
    
    for (let i = 0; i < 10; i++) {
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
      await tick();
      
      const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
      results.push(allStaffRequests.length);
      
      controller.dispose();
    }
    
    console.log(`Repeat test results: ${results.join(', ')}`);
    
    // CRITICAL: All runs must have exactly 1 request
    results.forEach((count, index) => {
      expect(count).toBe(1);
    });
    
    // CRITICAL: No variance (all results identical)
    const uniqueResults = [...new Set(results)];
    expect(uniqueResults).toHaveLength(1);
    expect(uniqueResults[0]).toBe(1);
  });
});
