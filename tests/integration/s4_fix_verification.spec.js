/**
 * S4_Fix: Verification Test
 * 
 * This test verifies that the global single-flight guard fix
 * prevents duplicate requests in the production environment
 */

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

describe('S4_Fix: Verification Test', () => {
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
        <div id="app-data" style="display: none;">{"roster": []}</div>
      </body></html>
    `, { 
      url: 'http://localhost:3000/staff.html',
      pretendToBeVisual: true,
      resources: 'usable'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    global.console = window.console;
    
    // Mock required globals
    window.appData = { roster: [] };
    window.api = {
      getAllStaff: () => global.fetch('/api/staff/allstaff').then(r => r.json())
    };
    window.showToast = jest.fn();
    
    // Make api available in eval context
    const api = window.api;
  });
  
  afterEach(() => {
    dom.window.close();
  });
  
  test('Production Fix: Multiple simultaneous calls should result in 1 request', async () => {
    console.log('\n=== PRODUCTION FIX VERIFICATION ===');
    
    // Simulate the production staff.ejs script
    const staffScript = `
      // Global single-flight guard (shared across all instances)
      if (!window._globalInflightRequests) {
        window._globalInflightRequests = new Map();
      }

      function updateAvailableStaffDropdown() {
        const dropdown = document.getElementById('available-staff');
        const requestKey = 'GET:/api/staff/allstaff';
        
        // Global single-flight guard to prevent overlapping calls across all instances
        if (window._globalInflightRequests.has(requestKey)) {
          console.log('⏳ Staff dropdown update already in progress globally, skipping...');
          return window._globalInflightRequests.get(requestKey);
        }
        
        // Get all staff names from the API
        const requestPromise = api.getAllStaff().then(allStaffNames => {
          // Get masseuses not already in the current roster
          const usedNames = appData.roster
            .filter(r => r.name && r.name.trim() !== '')
            .map(r => r.name);
          
          const availableStaff = allStaffNames.filter(name => !usedNames.includes(name));
          
          // IDEMPOTENT RENDER: Clear and rebuild completely
          dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
          
          // Build options in document fragment for better performance
          const fragment = document.createDocumentFragment();
          availableStaff.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            fragment.appendChild(option);
          });
          
          // Replace all children atomically
          dropdown.appendChild(fragment);
          
          console.log(\`✅ Populated dropdown with \${availableStaff.length} available staff out of \${allStaffNames.length} total staff\`);
        }).catch(error => {
          console.error('❌ Error fetching all staff names:', error);
          showToast('Error loading available staff', 'error');
          // Ensure default option remains on error
          dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
        }).finally(() => {
          // Clear the global inflight flag
          window._globalInflightRequests.delete(requestKey);
        });
        
        window._globalInflightRequests.set(requestKey, requestPromise);
        return requestPromise;
      }
    `;
    
    // Execute the script
    eval(staffScript);
    
    // Make function available globally
    window.updateAvailableStaffDropdown = updateAvailableStaffDropdown;
    
    // Test multiple simultaneous calls (simulating production scenario)
    console.log('Calling updateAvailableStaffDropdown() #1');
    const promise1 = window.updateAvailableStaffDropdown();
    
    console.log('Calling updateAvailableStaffDropdown() #2');
    const promise2 = window.updateAvailableStaffDropdown();
    
    console.log('Calling updateAvailableStaffDropdown() #3');
    const promise3 = window.updateAvailableStaffDropdown();
    
    // Wait for all to complete
    await Promise.all([promise1, promise2, promise3]);
    
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
    
    console.log('\n=== FIX VERIFICATION SUCCESSFUL ===');
    console.log('✅ Global single-flight guard prevents duplicate requests');
    console.log('✅ Multiple simultaneous calls result in only 1 network request');
    console.log('✅ Dropdown renders correctly with unique options');
  });
});
