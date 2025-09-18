const { test, expect } = require('@playwright/test');

test.describe('S2.10_DataParityHarness', () => {
  test('verifies staff data consistency between API and UI', async ({ page }) => {
    const apiData = {
      allStaff: [],
      roster: []
    };
    
    // Capture API responses
    page.on('response', async response => {
      const url = response.url();
      if (url.includes('/api/staff/allstaff')) {
        const data = await response.json();
        apiData.allStaff = data;
        console.log(`[API] allStaff: ${data.length} staff`);
      }
      if (url.includes('/api/staff/roster')) {
        const data = await response.json();
        apiData.roster = data;
        console.log(`[API] roster: ${data.length} staff`);
      }
    });

    // Load the staff page
    await page.goto('http://localhost:3000/staff.html', { waitUntil: 'domcontentloaded' });
    
    // Wait for API calls to complete
    await page.waitForTimeout(2000);

    // Get UI data
    const uiData = await page.evaluate(() => {
      const dropdown = document.getElementById('available-staff');
      const rosterList = document.getElementById('roster-list');
      
      const dropdownOptions = dropdown ? Array.from(dropdown.options).map(opt => opt.textContent) : [];
      const rosterItems = rosterList ? Array.from(rosterList.children).map(item => item.textContent.trim()) : [];
      
      return {
        dropdownOptions: dropdownOptions.filter(opt => opt !== 'Select masseuse to add...'),
        rosterItems: rosterItems.filter(item => item !== ''),
        dropdownCount: dropdownOptions.length - 1, // minus default option
        rosterCount: rosterItems.length
      };
    });

    console.log('=== DATA PARITY ANALYSIS ===');
    console.log(`API allStaff: ${apiData.allStaff.length}`);
    console.log(`API roster: ${apiData.roster.length}`);
    console.log(`UI dropdown: ${uiData.dropdownCount}`);
    console.log(`UI roster: ${uiData.rosterCount}`);
    console.log(`Expected available: ${apiData.allStaff.length - apiData.roster.length}`);

    // Verify the math: available = allStaff - roster
    const expectedAvailable = apiData.allStaff.length - apiData.roster.length;
    expect(uiData.dropdownCount).toBe(expectedAvailable);
    
    // Verify no duplicates in dropdown
    const uniqueDropdownOptions = [...new Set(uiData.dropdownOptions)];
    expect(uiData.dropdownOptions.length).toBe(uniqueDropdownOptions.length);
    
    // Verify roster count matches API
    expect(uiData.rosterCount).toBe(apiData.roster.length);
    
    console.log('✅ Data parity verified: UI matches API calculations');
  });
});
