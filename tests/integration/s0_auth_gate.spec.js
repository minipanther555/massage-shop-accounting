const { test, expect } = require('@playwright/test');

test.describe('S0.AuthGate', () => {
  test('must be authenticated before any page assertions', async ({ page }) => {
    // Navigate to staff page
    await page.goto('/staff.html');
    await page.waitForLoadState('domcontentloaded');

    // Fail fast if we land on login
    const currentUrl = page.url();
    expect.soft(currentUrl).not.toMatch(/\/login/i);
    
    if (currentUrl.includes('/login')) {
      throw new Error(`❌ AUTH GATE FAILED: Redirected to login page. Current URL: ${currentUrl}`);
    }

    // Assert we're on the correct page by checking for known elements
    await expect(page.locator('#available-staff')).toBeVisible();
    await expect(page.locator('#roster-list')).toBeVisible();
    
    console.log('✅ AUTH GATE PASSED: Authenticated and on staff page');
  });
});
