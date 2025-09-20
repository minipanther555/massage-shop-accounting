import { test, expect } from '@playwright/test';

test('debug controller initialization', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

  await page.goto(`${process.env.BASE_URL}/staff.html?PWTEST=1&v=${Date.now()}`, { waitUntil: 'networkidle' });

  // Wait for controller readiness
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.ready === true)).toBe(true);

  // Check what the controller state actually contains
  const state = await page.evaluate(() => {
    return {
      ready: window.__staffTest?.ready,
      allStaff: window.__staffTest?.state?.ALL_STAFF,
      currentRoster: window.__staffTest?.state?.CURRENT_ROSTER,
      apiAvailable: !!window.api,
      controllerInitialized: window.__staffCtrlInitialized
    };
  });

  console.log('Controller state:', state);
  console.log('Console messages:', consoleMessages.filter(m => m.includes('🔧') || m.includes('🚀') || m.includes('📋')));
});
