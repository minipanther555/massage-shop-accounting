const { test, expect } = require('@playwright/test');

test.describe('S0.5_DebugConsole', () => {
  test('should debug console errors and controller loading', async ({ page }) => {
    const consoleMessages = [];
    const networkRequests = [];
    
    // Capture console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
    
    // Capture network requests
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });

    // Load the staff page
    await page.goto('http://localhost:3000/staff.html');
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    console.log('=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });
    
    console.log('\n=== NETWORK REQUESTS ===');
    networkRequests.forEach(req => {
      console.log(`${req.method} ${req.url}`);
    });
    
    // Check if controller loaded
    const controllerLoaded = await page.evaluate(() => {
      return typeof window.createStaffPageController !== 'undefined';
    });
    
    console.log(`\nController loaded: ${controllerLoaded}`);
    
    // Check if global single-flight map exists
    const globalMapExists = await page.evaluate(() => {
      return typeof window._globalInflightRequests !== 'undefined';
    });
    
    console.log(`Global single-flight map exists: ${globalMapExists}`);
    
    // Check if staff controller is initialized
    const controllerInitialized = await page.evaluate(() => {
      return typeof window.__staffCtrlInit !== 'undefined' && window.__staffCtrlInit;
    });
    
    console.log(`Controller initialized: ${controllerInitialized}`);
    
    // Check dropdown state
    const dropdown = page.locator('#available-staff');
    const optionCount = await dropdown.locator('option').count();
    console.log(`Dropdown option count: ${optionCount}`);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-staff-page.png' });
    console.log('Screenshot saved as debug-staff-page.png');
  });
});
