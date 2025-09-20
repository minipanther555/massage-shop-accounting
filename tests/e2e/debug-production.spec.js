import { test, expect } from '@playwright/test';

test('debug production controller', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

  await page.goto(`${process.env.BASE_URL}/staff.html?PWTEST=1&v=${Date.now()}`, { waitUntil: 'networkidle' });

  // Wait a bit for initialization
  await page.waitForTimeout(3000);

  // Check what's available
  const debug = await page.evaluate(() => {
    return {
      staffTest: window.__staffTest,
      staffControllerInit: typeof window.staffControllerInit,
      api: typeof window.api,
      ready: window.__staffTest?.ready,
      controllerInitialized: window.__staffCtrlInitialized,
      cookie: document.cookie
    };
  });

  console.log('Debug info:', debug);
  console.log('Console messages:', consoleMessages.filter(m => m.includes('🔧') || m.includes('🚀') || m.includes('Error') || m.includes('error')));
});
