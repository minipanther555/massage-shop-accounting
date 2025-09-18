const { test, expect } = require('@playwright/test');

test.describe('S0.5_InitWindowTranscript', () => {
  test('should make exactly one GET /api/staff/allstaff request on initial load', async ({ page }) => {
    const requests = [];
    
    // Capture all network requests
    page.on('request', request => {
      if (request.url().includes('/api/staff/allstaff')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // Load the staff page
    await page.goto('http://localhost:3000/staff.html');
    
    // Wait for initial load to complete (1 second)
    await page.waitForTimeout(1000);
    
    // Count staff API requests
    const staffRequests = requests.filter(req => req.url.includes('/api/staff/allstaff'));
    
    console.log(`[S0.5] Total /api/staff/allstaff requests: ${staffRequests.length}`);
    console.log(`[S0.5] Request details:`, staffRequests);
    
    // Assert exactly one request
    expect(staffRequests).toHaveLength(1);
    
    // Verify dropdown has unique options (no duplicates)
    const dropdown = page.locator('#available-staff');
    await expect(dropdown).toBeVisible();
    
    const options = await dropdown.locator('option').all();
    const optionTexts = await Promise.all(options.map(opt => opt.textContent()));
    
    console.log(`[S0.5] Dropdown options count: ${optionTexts.length}`);
    console.log(`[S0.5] Option texts:`, optionTexts);
    
    // Check for duplicates (excluding the default option)
    const nonDefaultOptions = optionTexts.filter(text => text !== 'Select masseuse to add...');
    const uniqueOptions = [...new Set(nonDefaultOptions)];
    
    console.log(`[S0.5] Non-default options: ${nonDefaultOptions.length}`);
    console.log(`[S0.5] Unique options: ${uniqueOptions.length}`);
    
    // Assert no duplicates
    expect(nonDefaultOptions).toHaveLength(uniqueOptions.length);
    
    // Assert we have some staff options (not empty)
    expect(nonDefaultOptions.length).toBeGreaterThan(0);
  });
});
