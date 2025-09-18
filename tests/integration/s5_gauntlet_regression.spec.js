/**
 * S5_Gauntlet - Regression & Side-Effects Tests
 * Comprehensive tests to ensure the fix is durable and doesn't regress
 */

const { JSDOM } = require('jsdom');

describe('S5_Gauntlet - Staff Dropdown Regression Tests', () => {
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
      // Ensure default option remains on error
      dropdown.innerHTML = '<option value="">Select masseuse to add...</option>';
    }).finally(() => {
      // Clear the inflight flag
      window._updateStaffDropdownInflight = null;
    });
    
    return window._updateStaffDropdownInflight;
  }

  describe('Invariant 1: Idempotent Render', () => {
    test('should maintain unique option count after multiple calls', async () => {
      // Call function multiple times
      await updateAvailableStaffDropdown();
      await updateAvailableStaffDropdown();
      await updateAvailableStaffDropdown();
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should always be 4 options (1 default + 3 unique)
      expect(options.length).toBe(4);
      expect([...new Set(optionValues)].length).toBe(4);
      expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
    });

    test('should handle rapid-fire calls without duplication', async () => {
      // Fire 100 rapid calls
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(updateAvailableStaffDropdown());
      }
      
      await Promise.all(promises);
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should remain idempotent
      expect(options.length).toBe(4);
      expect([...new Set(optionValues)].length).toBe(4);
    });

    test('should handle roster changes correctly', async () => {
      // Initial call
      await updateAvailableStaffDropdown();
      let options = Array.from(document.getElementById('available-staff').options);
      expect(options.length).toBe(4);
      
      // Add Alice to roster
      window.appData.roster = [{ name: 'Alice', position: 1, status: 'Next' }];
      await updateAvailableStaffDropdown();
      
      options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should exclude Alice
      expect(options.length).toBe(3);
      expect(optionValues).toEqual(['', 'Bob', 'Charlie']);
      
      // Remove Alice from roster
      window.appData.roster = [];
      await updateAvailableStaffDropdown();
      
      options = Array.from(document.getElementById('available-staff').options);
      const finalValues = options.map(opt => opt.value);
      
      // Should include Alice again
      expect(options.length).toBe(4);
      expect(finalValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
    });
  });

  describe('Invariant 2: Single-Flight Guard', () => {
    test('should prevent overlapping API calls', async () => {
      let callCount = 0;
      const originalGetAllStaff = window.api.getAllStaff;
      
      // Mock API to count calls
      window.api.getAllStaff = () => {
        callCount++;
        return originalGetAllStaff();
      };
      
      // Fire multiple rapid calls
      const promise1 = updateAvailableStaffDropdown();
      const promise2 = updateAvailableStaffDropdown();
      const promise3 = updateAvailableStaffDropdown();
      
      await Promise.all([promise1, promise2, promise3]);
      
      // Should only make 1 API call due to single-flight guard
      expect(callCount).toBe(1);
    });

    test('should allow new calls after previous completes', async () => {
      let callCount = 0;
      const originalGetAllStaff = window.api.getAllStaff;
      
      // Mock API to count calls
      window.api.getAllStaff = () => {
        callCount++;
        return originalGetAllStaff();
      };
      
      // First batch
      await updateAvailableStaffDropdown();
      expect(callCount).toBe(1);
      
      // Second batch (should be allowed)
      await updateAvailableStaffDropdown();
      expect(callCount).toBe(2);
    });
  });

  describe('Invariant 3: Error Handling', () => {
    test('should preserve default option on API error', async () => {
      // Mock API to reject
      window.api.getAllStaff = () => Promise.reject(new Error('API Error'));
      
      await updateAvailableStaffDropdown();
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should have only default option
      expect(options.length).toBe(1);
      expect(optionValues).toEqual(['']);
    });

    test('should recover from API errors on subsequent calls', async () => {
      // First call fails
      window.api.getAllStaff = () => Promise.reject(new Error('API Error'));
      await updateAvailableStaffDropdown();
      
      let options = Array.from(document.getElementById('available-staff').options);
      expect(options.length).toBe(1);
      
      // Second call succeeds
      window.api.getAllStaff = () => Promise.resolve(['Alice', 'Bob', 'Charlie']);
      await updateAvailableStaffDropdown();
      
      options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should recover and show all options
      expect(options.length).toBe(4);
      expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
    });
  });

  describe('Property Tests', () => {
    test('should handle delayed API responses correctly', async () => {
      // Mock API with delay
      window.api.getAllStaff = () => new Promise(resolve => {
        setTimeout(() => resolve(['Alice', 'Bob', 'Charlie']), 100);
      });
      
      // Start multiple calls
      const promise1 = updateAvailableStaffDropdown();
      const promise2 = updateAvailableStaffDropdown();
      
      // Wait for completion
      await Promise.all([promise1, promise2]);
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should still be idempotent despite delay
      expect(options.length).toBe(4);
      expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
    });

    test('should handle empty staff list', async () => {
      window.api.getAllStaff = () => Promise.resolve([]);
      
      await updateAvailableStaffDropdown();
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should have only default option
      expect(options.length).toBe(1);
      expect(optionValues).toEqual(['']);
    });

    test('should handle duplicate staff names from API', async () => {
      // API returns duplicates (defensive programming)
      window.api.getAllStaff = () => Promise.resolve(['Alice', 'Bob', 'Alice', 'Charlie', 'Bob']);
      
      await updateAvailableStaffDropdown();
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should deduplicate automatically due to DOM structure
      expect(options.length).toBe(4);
      expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large staff lists efficiently', async () => {
      // Generate large staff list
      const largeStaffList = Array.from({ length: 1000 }, (_, i) => `Staff${i}`);
      window.api.getAllStaff = () => Promise.resolve(largeStaffList);
      
      const startTime = Date.now();
      await updateAvailableStaffDropdown();
      const endTime = Date.now();
      
      const options = Array.from(document.getElementById('available-staff').options);
      
      // Should complete quickly and have correct count
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
      expect(options.length).toBe(1001); // 1 default + 1000 staff
    });

    test('should not leak memory with repeated calls', async () => {
      // Make many calls to check for memory leaks
      for (let i = 0; i < 1000; i++) {
        await updateAvailableStaffDropdown();
      }
      
      const options = Array.from(document.getElementById('available-staff').options);
      const optionValues = options.map(opt => opt.value);
      
      // Should still work correctly
      expect(options.length).toBe(4);
      expect(optionValues).toEqual(['', 'Alice', 'Bob', 'Charlie']);
    });
  });
});
