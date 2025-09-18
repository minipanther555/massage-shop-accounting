/**
 * S3_Isolation - Proximal Cause Toggle Matrix
 * Tests each invariant toggle to identify the minimal fix
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('S3_Isolation - Toggle Matrix', () => {
  let dom, document, window;
  let staffPageContent;
  
  beforeEach(() => {
    // Load staff.ejs content
    staffPageContent = fs.readFileSync(path.resolve(__dirname, '../../web-app/staff.ejs'), 'utf-8');
    dom = new JSDOM(staffPageContent, { runScripts: 'dangerously', resources: 'usable' });
    window = dom.window;
    document = window.document;
    
    // Mock API and globals
    window.api = {
      getAllStaff: () => Promise.resolve(['Alice', 'Bob', 'Charlie'])
    };
    window.appData = { roster: [] };
    window.CONFIG = { settings: { masseuses: [] } };
    window.showToast = () => {};
    window.requireAuth = () => true;
    window.getCurrentUser = () => ({ role: 'manager' });
    
    // Create dropdown element
    const dropdown = document.createElement('select');
    dropdown.id = 'available-staff';
    document.body.appendChild(dropdown);
  });

  afterEach(() => {
    dom.window.close();
  });

  // Helper to simulate the problematic function
  function simulateUpdateAvailableStaffDropdown(options = {}) {
    const { idempotent = false, singleFlight = false } = options;
    
    const dropdown = document.getElementById('available-staff');
    const mockStaff = ['Alice', 'Bob', 'Charlie'];
    
    if (singleFlight) {
      if (window._renderInflight) return window._renderInflight;
      window._renderInflight = true;
    }
    
    if (idempotent) {
      // Idempotent render: clear first, then populate
      dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
      mockStaff.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dropdown.appendChild(option);
      });
    } else {
      // Original problematic behavior: append-heavy
      // First call sets initial content
      if (dropdown.innerHTML === '') {
        dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
      }
      // Subsequent calls APPEND (this is the bug)
      mockStaff.forEach(name => {
        dropdown.innerHTML += `<option value="${name}">${name}</option>`;
      });
    }
    
    if (singleFlight) {
      window._renderInflight = false;
    }
  }

  test('A: Base case - Original problematic behavior', () => {
    // Simulate two calls (like the real bug)
    simulateUpdateAvailableStaffDropdown({ idempotent: false, singleFlight: false });
    simulateUpdateAvailableStaffDropdown({ idempotent: false, singleFlight: false });
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('A: Base case options:', optionValues);
    console.log('A: Total options:', options.length);
    console.log('A: Unique options:', [...new Set(optionValues)].length);
    
    // Should fail: 5 options (1 default + 4 duplicates)
    expect(options.length).toBeGreaterThan(4); // RED
  });

  test('B: +Idempotent render only', () => {
    // Simulate two calls with idempotent render
    simulateUpdateAvailableStaffDropdown({ idempotent: true, singleFlight: false });
    simulateUpdateAvailableStaffDropdown({ idempotent: true, singleFlight: false });
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('B: +Idempotent options:', optionValues);
    console.log('B: Total options:', options.length);
    console.log('B: Unique options:', [...new Set(optionValues)].length);
    
    // Should pass: 4 options (1 default + 3 unique)
    expect(options.length).toBe(4); // GREEN
    expect([...new Set(optionValues)].length).toBe(4);
  });

  test('C: +Single-flight guard only', () => {
    // Simulate two calls with single-flight guard
    simulateUpdateAvailableStaffDropdown({ idempotent: false, singleFlight: true });
    simulateUpdateAvailableStaffDropdown({ idempotent: false, singleFlight: true });
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('C: +Single-flight options:', optionValues);
    console.log('C: Total options:', options.length);
    console.log('C: Unique options:', [...new Set(optionValues)].length);
    
    // Should still fail: single-flight prevents overlap but doesn't fix append-heavy
    expect(options.length).toBeGreaterThan(4); // RED
  });

  test('D: +Both idempotent + single-flight', () => {
    // Simulate two calls with both fixes
    simulateUpdateAvailableStaffDropdown({ idempotent: true, singleFlight: true });
    simulateUpdateAvailableStaffDropdown({ idempotent: true, singleFlight: true });
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('D: +Both options:', optionValues);
    console.log('D: Total options:', options.length);
    console.log('D: Unique options:', [...new Set(optionValues)].length);
    
    // Should pass: 4 options (1 default + 3 unique)
    expect(options.length).toBe(4); // GREEN
    expect([...new Set(optionValues)].length).toBe(4);
  });

  test('E: Stress test - 50 rapid calls', () => {
    // Simulate rapid-fire calls like setInterval
    for (let i = 0; i < 50; i++) {
      simulateUpdateAvailableStaffDropdown({ idempotent: true, singleFlight: true });
    }
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('E: Stress test options:', optionValues);
    console.log('E: Total options:', options.length);
    console.log('E: Unique options:', [...new Set(optionValues)].length);
    
    // Should pass: 4 options (1 default + 3 unique) even after 50 calls
    expect(options.length).toBe(4); // GREEN
    expect([...new Set(optionValues)].length).toBe(4);
  });
});
