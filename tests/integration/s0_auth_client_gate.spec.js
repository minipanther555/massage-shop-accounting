const { test, expect } = require('@playwright/test');

test.describe('S0.AuthClientGate', () => {
  test('no client-side login redirect in PWTEST', async ({ page }) => {
    const url = process.env.BASE_URL || 'http://localhost:3000';
    const navs = [];
    
    // Track all navigation events
    page.on('framenavigated', f => navs.push(f.url()));
    
    // Navigate to staff page
    await page.goto(`${url}/staff.html`);
    await page.waitForLoadState('domcontentloaded');

    // Check final URL
    const landed = page.url();
    expect(landed).not.toMatch(/\/login(\.html)?$/i);
    
    // Check all navigation events
    const allNavs = navs.join('\n');
    expect(allNavs).not.toMatch(/\/login(\.html)?$/i);
    
    console.log('✅ AUTH CLIENT GATE PASSED: No login redirects detected');
    console.log('Final URL:', landed);
    console.log('Navigation events:', navs);
  });
});
