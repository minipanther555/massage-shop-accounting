/**
 * S4_Fix Validation - Test the actual fixed staff.ejs code
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

describe('S4_Fix Validation - Staff Dropdown Fix', () => {
  let dom, document, window;
  let staffPageContent;
  
  beforeEach(() => {
    // Load the actual fixed staff.ejs content
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

  test('Fixed updateAvailableStaffDropdown should be idempotent', async () => {
    // Get the fixed function from the loaded page
    const updateAvailableStaffDropdown = window.updateAvailableStaffDropdown;
    expect(updateAvailableStaffDropdown).toBeDefined();
    
    // Call the function multiple times rapidly
    const promise1 = updateAvailableStaffDropdown();
    const promise2 = updateAvailableStaffDropdown();
    const promise3 = updateAvailableStaffDropdown();
    
    // Wait for all calls to complete
    await Promise.all([promise1, promise2, promise3]);
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('Fixed function options:', optionValues);
    console.log('Total options:', options.length);
    console.log('Unique options:', [...new Set(optionValues)].length);
    
    // Should be idempotent: 4 options (1 default + 3 unique)
    expect(options.length).toBe(4);
    expect([...new Set(optionValues)].length).toBe(4);
    expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
  });

  test('Single-flight guard should prevent overlapping calls', async () => {
    const updateAvailableStaffDropdown = window.updateAvailableStaffDropdown;
    
    // Start first call
    const promise1 = updateAvailableStaffDropdown();
    
    // Immediately start second call (should be blocked by single-flight)
    const promise2 = updateAvailableStaffDropdown();
    
    // Start third call (should also be blocked)
    const promise3 = updateAvailableStaffDropdown();
    
    // Wait for all calls
    await Promise.all([promise1, promise2, promise3]);
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('Single-flight test options:', optionValues);
    console.log('Total options:', options.length);
    
    // Should still be idempotent due to single-flight guard
    expect(options.length).toBe(4);
    expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
  });

  test('Stress test - 50 rapid calls should remain idempotent', async () => {
    const updateAvailableStaffDropdown = window.updateAvailableStaffDropdown;
    
    // Fire 50 rapid calls
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(updateAvailableStaffDropdown());
    }
    
    await Promise.all(promises);
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('Stress test options:', optionValues);
    console.log('Total options:', options.length);
    console.log('Unique options:', [...new Set(optionValues)].length);
    
    // Should remain idempotent even after 50 calls
    expect(options.length).toBe(4);
    expect([...new Set(optionValues)].length).toBe(4);
    expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
  });

  test('Function should handle roster filtering correctly', async () => {
    const updateAvailableStaffDropdown = window.updateAvailableStaffDropdown;
    
    // Set up roster with one staff member already assigned
    window.appData.roster = [{ name: 'Alice', position: 1, status: 'Next' }];
    
    await updateAvailableStaffDropdown();
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('Filtered options:', optionValues);
    console.log('Total options:', options.length);
    
    // Should exclude Alice who is already in roster
    expect(options.length).toBe(3); // 1 default + 2 available
    expect(optionValues).toEqual(['', 'Bob', 'Charlie']);
    expect(optionValues).not.toContain('Alice');
  });

  test('Function should handle API errors gracefully', async () => {
    const updateAvailableStaffDropdown = window.updateAvailableStaffDropdown;
    
    // Mock API to reject
    window.api.getAllStaff = () => Promise.reject(new Error('API Error'));
    
    await updateAvailableStaffDropdown();
    
    const options = Array.from(document.getElementById('available-staff').options);
    const optionValues = options.map(opt => opt.value);
    
    console.log('Error case options:', optionValues);
    console.log('Total options:', options.length);
    
    // Should have only default option when API fails
    expect(options.length).toBe(1);
    expect(optionValues).toEqual(['']);
  });
});
