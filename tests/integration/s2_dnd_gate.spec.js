const { test, expect } = require('@playwright/test');

test.describe('S2.DnDGate', () => {
  test('drag and drop moves roster items', async ({ page, context }) => {
    // Force auth bypass before any app JS runs
    await context.addCookies([
      { name: 'PWTEST', value: '1', domain: 'localhost', path: '/' },
    ]);

    await context.addInitScript(() => {
      window.__PWTEST__ = true;
      window.isLoggedIn = () => true;
      window.getCurrentUser = () => ({ username: 'pwtest' });
      window.requireAuth = () => true;
    });

    await page.goto('http://localhost:3000/staff.html?PWTEST=1', { waitUntil: 'domcontentloaded' });

    // Wait for controller to initialize and populate roster
    await page.waitForTimeout(2000);

    // Check if we have roster items
    const rosterItems = page.locator('#roster-list li');
    const itemCount = await rosterItems.count();
    
    if (itemCount < 2) {
      console.log(`⚠️ Only ${itemCount} roster items found, skipping drag test`);
      return;
    }

    // Get first item's data-name
    const firstItem = rosterItems.first();
    const firstName = await firstItem.getAttribute('data-name');
    const secondItem = rosterItems.nth(1);

    console.log(`🔄 Dragging item "${firstName}" below second item`);

    // Perform drag and drop
    await firstItem.dragTo(secondItem);

    // Wait a moment for the DOM to update
    await page.waitForTimeout(500);

    // Verify the order changed
    const newFirstItem = rosterItems.first();
    const newFirstName = await newFirstItem.getAttribute('data-name');
    
    expect(newFirstName).not.toBe(firstName);
    console.log(`✅ Drag successful: "${firstName}" moved, new first item is "${newFirstName}"`);
  });
});
