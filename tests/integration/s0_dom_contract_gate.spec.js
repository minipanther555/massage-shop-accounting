const { test, expect } = require('@playwright/test');

test.describe('S0.DOMContractGate', () => {
  test('critical UI elements must exist and be accessible', async ({ page, context }) => {
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

    // Gate 0: make sure we are not on login
    expect(page.url()).not.toMatch(/\/login(\.html)?$/i);
    console.log(`✅ Not on login page: ${page.url()}`);

    // Tolerant roster container check
    const rosterCandidates = ['#roster-list', '#current-roster', '#todays-roster', '[data-roster]'];
    const found = await page.evaluate((sels) => sels.find(s => !!document.querySelector(s)), rosterCandidates);
    expect(found, `Missing roster container. Tried: ${rosterCandidates.join(', ')}`).toBeTruthy();
    await expect(page.locator(found)).toBeVisible();
    console.log(`✅ Roster container found: ${found}`);

    // Check staff dropdown
    await expect(page.locator('#available-staff')).toBeVisible();
    console.log(`✅ #available-staff exists and visible`);

    // Check for buttons (tolerant to ID variations)
    const buttonCandidates = ['#add-to-roster', '#clear-roster', '#save-roster', 'button[onclick*="add"], button[onclick*="clear"], button[onclick*="save"]'];
    const foundButtons = await page.evaluate((sels) => sels.filter(s => !!document.querySelector(s)), buttonCandidates);
    expect(foundButtons.length).toBeGreaterThan(0);
    console.log(`✅ Found buttons: ${foundButtons.join(', ')}`);

    // Check for drag-and-drop affordances
    const dragHandles = page.locator('.drag-handle, .roster-item, [draggable="true"]');
    const dragCount = await dragHandles.count();
    expect(dragCount).toBeGreaterThan(0);
    console.log(`✅ Found ${dragCount} drag-and-drop affordances`);

    // Check CSS is loaded (basic check)
    const stylesheet = page.locator('link[rel="stylesheet"]');
    const stylesheetCount = await stylesheet.count();
    expect(stylesheetCount).toBeGreaterThan(0);
    console.log(`✅ Found ${stylesheetCount} stylesheets`);

    console.log('✅ DOM CONTRACT GATE PASSED: All critical UI elements present');
  });
});
