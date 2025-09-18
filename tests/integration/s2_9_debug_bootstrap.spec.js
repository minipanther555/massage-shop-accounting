const { test, expect } = require('@playwright/test');

test.describe('S2.9_DebugBootstrap', () => {
  test('debug why bootstrap is not running', async ({ page }) => {
    const consoleMessages = [];
    const errors = [];
    
    // Capture all console messages
    page.on('console', msg => {
      consoleMessages.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
    
    // Capture JavaScript errors
    page.on('pageerror', error => {
      errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // Load the staff page
    await page.goto('http://localhost:3000/staff.html', { waitUntil: 'domcontentloaded' });
    
    // Wait a bit
    await page.waitForTimeout(2000);

    console.log('=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => {
      console.log(`[${msg.type.toUpperCase()}] ${msg.text}`);
    });

    console.log('=== JAVASCRIPT ERRORS ===');
    errors.forEach(err => {
      console.log(`ERROR: ${err.message}`);
      console.log(`STACK: ${err.stack}`);
    });

    // Check if bootstrap function exists
    const bootstrapExists = await page.evaluate(() => {
      return {
        staffControllerInit: typeof window.staffControllerInit,
        createStaffPageController: typeof window.createStaffPageController,
        __staffSingleFlight: typeof window.__staffSingleFlight,
        __staffCtrl: typeof window.__staffCtrl
      };
    });
    
    console.log('=== WINDOW OBJECTS ===');
    console.log(JSON.stringify(bootstrapExists, null, 2));

    // Check if bootstrap was called
    const bootstrapCalled = await page.evaluate(() => {
      return window.__staffCtrl?.__inited || false;
    });
    
    console.log(`=== BOOTSTRAP STATUS ===`);
    console.log(`Bootstrap called: ${bootstrapCalled}`);
  });
});
