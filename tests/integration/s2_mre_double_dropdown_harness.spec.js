/**
 * S2_MRE: Deterministic Harness for Double Dropdown Bug
 * 
 * This test reproduces the duplicate request issue with network-level evidence.
 * Uses frozen timers, mocked fetch, and request transcript capture.
 */

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
  
  // Capture request details
  requestTranscript.push({
    timestamp,
    url,
    method: options?.method || 'GET',
    callSite: stack.split('\n')[2]?.trim() || 'unknown',
    inFlightKey: `fetch_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  console.log(`🌐 [TRANSCRIPT] ${timestamp}ms: ${options?.method || 'GET'} ${url}`);
  console.log(`🌐 [CALL-SITE] ${stack.split('\n')[2]?.trim()}`);
  
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

describe('S2_MRE: Double Dropdown Harness', () => {
  let dom;
  let window;
  let document;
  
  beforeEach(() => {
    // Clear transcript before each test
    requestTranscript.length = 0;
    
    // Create fresh JSDOM instance
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head><title>Staff Roster</title></head>
        <body>
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
    
    // Mock appData
    window.appData = { roster: [] };
    
    // Mock API client
    window.api = {
      getAllStaff: () => fetch('/api/staff/allstaff').then(r => r.json()),
      getStaffRoster: () => fetch('/api/staff/roster').then(r => r.json()),
      getServices: () => fetch('/api/services').then(r => r.json()),
      getPaymentMethods: () => fetch('/api/services/payment-methods').then(r => r.json())
    };
    
    // Mock utility functions
    window.requireAuth = () => true;
    window.getCurrentUser = () => ({ role: 'admin', username: 'test' });
    window.showToast = () => {};
    window.setupMobileControls = () => {};
    
    // Mock loadData function
    window.loadData = async () => {
      const [services, paymentMethods, roster] = await Promise.all([
        window.api.getServices(),
        window.api.getPaymentMethods(),
        window.api.getStaffRoster()
      ]);
      window.appData.roster = roster.map(r => ({
        position: r.position,
        name: r.masseuse_name || '',
        status: r.status || null,
        busy_until: r.busy_until || null,
        todayCount: r.today_massages || 0
      }));
    };
  });
  
  afterEach(() => {
    dom.window.close();
    jest.clearAllTimers();
  });
  
  test('Initial Load Window - should show duplicate requests', async () => {
    // Load the staff.ejs script content
    const staffScript = `
      window.updateAvailableStaffDropdown = function() {
        const dropdown = document.getElementById('available-staff');
        
        // Single-flight guard to prevent overlapping calls
        if (window._updateStaffDropdownInflight) {
          console.log('⏳ Staff dropdown update already in progress, skipping...');
          return window._updateStaffDropdownInflight;
        }
        
        // Get all staff names from the API
        window._updateStaffDropdownInflight = api.getAllStaff().then(allStaffNames => {
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
          // Ensure default option remains on error
          dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
        }).finally(() => {
          // Clear the inflight flag
          window._updateStaffDropdownInflight = null;
        });
        
        return window._updateStaffDropdownInflight;
      };
      
      window.updateRosterDisplay = function() {
        // Simulate roster rendering logic
        const rosterList = document.getElementById('roster-list');
        rosterList.innerHTML = '';
        
        // CRITICAL: This calls updateAvailableStaffDropdown again!
        updateAvailableStaffDropdown();
        setupMobileControls();
      };
      
      // Simulate the DOMContentLoaded bootstrap
      window.bootstrap = async function() {
        await loadData();
        updateAvailableStaffDropdown(); // Call site 1
        updateRosterDisplay(); // This calls updateAvailableStaffDropdown again (Call site 2)
      };
    `;
    
    // Execute the script directly
    eval(staffScript);
    
    // Run bootstrap
    await window.bootstrap();
    
    // Wait for all promises to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Analyze results
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== REQUEST TRANSCRIPT ===');
    requestTranscript.forEach(r => {
      console.log(`${r.timestamp}ms: ${r.method} ${r.url}`);
      console.log(`  Call-site: ${r.callSite}`);
    });
    
    console.log('\n=== DROPDOWN ANALYSIS ===');
    const dropdown = document.getElementById('available-staff');
    const options = dropdown.querySelectorAll('option');
    console.log(`Total options: ${options.length}`);
    options.forEach((opt, i) => {
      console.log(`  ${i}: "${opt.value}" - "${opt.textContent}"`);
    });
    
    // Assertions
    expect(allStaffRequests).toHaveLength(2); // Should be 2 requests (RED)
    expect(options).toHaveLength(4); // Should be 4 options (1 default + 3 staff)
    
    // Verify both requests have different call sites
    expect(allStaffRequests[0].callSite).not.toBe(allStaffRequests[1].callSite);
    
    // Verify requests are within 5ms of each other
    const timeDiff = Math.abs(allStaffRequests[1].timestamp - allStaffRequests[0].timestamp);
    expect(timeDiff).toBeLessThan(5);
  });
  
  test('Re-entrancy Microburst - should be blocked by single-flight', async () => {
    // Load the same script
    const staffScript = `
      window.updateAvailableStaffDropdown = function() {
        const dropdown = document.getElementById('available-staff');
        
        if (window._updateStaffDropdownInflight) {
          console.log('⏳ Staff dropdown update already in progress, skipping...');
          return window._updateStaffDropdownInflight;
        }
        
        window._updateStaffDropdownInflight = api.getAllStaff().then(allStaffNames => {
          dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
          allStaffNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            dropdown.appendChild(option);
          });
        }).finally(() => {
          window._updateStaffDropdownInflight = null;
        });
        
        return window._updateStaffDropdownInflight;
      };
    `;
    
    // Execute the script directly
    eval(staffScript);
    
    // Trigger rapid re-entrancy
    await window.updateAvailableStaffDropdown();
    await window.updateAvailableStaffDropdown(); // Should be blocked
    
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const allStaffRequests = requestTranscript.filter(r => r.url.includes('/api/staff/allstaff'));
    
    console.log('\n=== RE-ENTRANCY TEST ===');
    console.log(`Requests made: ${allStaffRequests.length}`);
    
    // Should be 1 request due to single-flight guard
    expect(allStaffRequests).toHaveLength(1);
  });
});
