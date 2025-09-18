/**
 * S4_Fix Validation - Test the fixed logic directly
 */

const { JSDOM } = require('jsdom');

describe('S4_Fix Validation - Fixed Logic', () => {
  let dom, document, window;
  
  beforeEach(() => {
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
      <head></head>
      <body>
        <select id="available-staff"></select>
      </body>
      </html>
    `, { runScripts: 'dangerously', resources: 'usable' });
    
    window = dom.window;
    document = window.document;
    
    // Mock API
    window.api = {
      getAllStaff: () => Promise.resolve(['Alice', 'Bob', 'Charlie'])
    };
    window.appData = { roster: [] };
    window.showToast = () => {};
  });

  afterEach(() => {
    dom.window.close();
  });

  // Replicate the FIXED function logic
  function updateAvailableStaffDropdown() {
    const dropdown = document.getElementById('available-staff');
    
    // Single-flight guard to prevent overlapping calls
    if (window._updateStaffDropdownInflight) {
      console.log('⏳ Staff dropdown update already in progress, skipping...');
      return window._updateStaffDropdownInflight;
    }
    
    // Get all staff names from the API
    window._updateStaffDropdownInflight = window.api.getAllStaff().then(allStaffNames => {
      // Get masseuses not already in the current roster
      const usedNames = window.appData.roster
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
      
      console.log(`✅ Populated dropdown with ${availableStaff.length} available staff out of ${allStaffNames.length} total staff`);
    }).catch(error => {
      console.error('❌ Error fetching all staff names:', error);
      window.showToast('Error loading available staff', 'error');
    }).finally(() => {
      // Clear the inflight flag
      window._updateStaffDropdownInflight = null;
    });
    
    return window._updateStaffDropdownInflight;
  }

  test('Fixed function should be idempotent', async () => {
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

  test('Compare with original problematic behavior', () => {
    // Simulate the ORIGINAL problematic behavior
    const dropdown = document.getElementById('available-staff');
    
    // Original: append-heavy pattern
    dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
    const mockStaff = ['Alice', 'Bob', 'Charlie'];
    
    // First call
    mockStaff.forEach(name => {
      dropdown.innerHTML += `<option value="${name}">${name}</option>`;
    });
    
    // Second call (this causes duplicates)
    mockStaff.forEach(name => {
      dropdown.innerHTML += `<option value="${name}">${name}</option>`;
    });
    
    const originalOptions = Array.from(dropdown.options);
    const originalValues = originalOptions.map(opt => opt.value);
    
    console.log('Original behavior options:', originalValues);
    console.log('Original total options:', originalOptions.length);
    
    // Original should have duplicates
    expect(originalOptions.length).toBe(7); // 1 default + 6 duplicates
    expect(originalValues).toEqual(['', 'Alice', 'Bob', 'Charlie', 'Alice', 'Bob', 'Charlie']);
  });
});
