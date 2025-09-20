import { test, expect } from '@playwright/test';

test('debug dropdown logic', async ({ page }) => {
  await page.goto(`${process.env.BASE_URL}/staff.html?PWTEST=1&v=${Date.now()}`, { waitUntil: 'networkidle' });

  // Wait for controller readiness
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.ready === true)).toBe(true);

  // Debug the exact logic
  const debug = await page.evaluate(() => {
    const key = (x) => x?.id ?? x?.staffId ?? x?.name ?? x?.masseuse_name ?? null;
    const ALL = window.__staffTest?.state?.ALL_STAFF ?? [];
    const ROST = window.__staffTest?.state?.CURRENT_ROSTER ?? [];
    
    console.log('Raw ALL_STAFF:', ALL);
    console.log('Raw CURRENT_ROSTER:', ROST);
    
    const allKeys = ALL.map(key);
    const rostKeys = ROST.map(key);
    
    console.log('ALL keys:', allKeys);
    console.log('ROST keys:', rostKeys);
    
    const rosterSet = new Set(rostKeys);
    const expectedAvailable = allKeys.filter(k => !rosterSet.has(k));
    
    console.log('rosterSet:', Array.from(rosterSet));
    console.log('expectedAvailable:', expectedAvailable);
    
    const domOptions = [...document.querySelectorAll('#available-staff option')]
      .map(o => o.value || o.dataset.key || o.textContent.trim());
    
    console.log('domOptions:', domOptions);
    
    return { allKeys, rostKeys, expectedAvailable, domOptions };
  });

  console.log('Debug result:', debug);
});
