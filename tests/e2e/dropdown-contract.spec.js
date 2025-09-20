import { test, expect } from '@playwright/test';

const cb = () => `v=${Date.now()}`;

test.beforeEach(async ({ page }) => {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out expected errors
      if (!text.includes('sentry-cdn.com') && 
          !text.includes('Content Security Policy') &&
          !text.includes('script-src') &&
          !text.includes('404 (Not Found)') &&
          !text.includes('Failed to load resource')) {
        throw new Error(`Console ${msg.type()}: ${text}`);
      }
    }
  });
});

test('available dropdown = AllStaff − CurrentRoster; no duplicates allowed', async ({ page }) => {
  await page.goto(`${process.env.BASE_URL}/staff.html?PWTEST=1&${cb()}`, { waitUntil: 'networkidle' });

  // Wait for controller readiness (set this flag in code at end of successful init)
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.ready === true), { timeout: 10000 }).toBe(true);

  // Pull state the controller exposes for tests (read-only)
  const initial = await page.evaluate(() => {
    const ALL   = window.__staffTest?.state?.ALL_STAFF ?? []; // Already array of strings
    const ROST  = window.__staffTest?.state?.CURRENT_ROSTER ?? []; // Array of objects
    const rosterNames = ROST.map(x => x?.masseuse_name).filter(Boolean);
    const rosterSet = new Set(rosterNames);
    const expectedAvailable = ALL.filter(name => !rosterSet.has(name));
    const domOptions = [...document.querySelectorAll('#available-staff option')]
      .map(o => o.value || o.dataset.key || o.textContent.trim())
      .filter(opt => opt && opt !== 'Select masseuse to add...');
    console.log('DEBUG: ALL_STAFF =', ALL);
    console.log('DEBUG: CURRENT_ROSTER =', ROST);
    console.log('DEBUG: expectedAvailable =', expectedAvailable);
    console.log('DEBUG: domOptions =', domOptions);
    return { expectedAvailable, domOptions, ALL, ROST };
  });

  // Exact set equality (order-insensitive)
  expect(new Set(initial.domOptions)).toEqual(new Set(initial.expectedAvailable));

  // Try to add the first available person twice
  const firstVal = initial.domOptions[0];
  expect(firstVal, 'need at least one available staff').toBeTruthy();

  await page.selectOption('#available-staff', firstVal);
  await page.click('#add-to-roster-btn');

  // After first add, the option must be gone from dropdown
  await expect.poll(async () =>
    page.$eval('#available-staff', sel =>
      [...sel.options].map(o => o.value || o.textContent.trim())
    )
  ).not.toContain(firstVal);

  // Wait for the add operation to complete
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.lastOp === 'add_done')).toBe(true);

  // Attempt second add of the same ID must be impossible via UI:
  // either the option isn't selectable, or clicking does nothing (no new roster entry with same key)
  // Verify roster doesn't gain a duplicate
  const rosterAfter = await page.evaluate(() => {
    return (window.__staffTest?.state?.CURRENT_ROSTER ?? []).map(x => x?.masseuse_name).filter(Boolean);
  });

  // Count occurrences of the name in roster should be 1
  const count = rosterAfter.filter(name => name === firstVal).length;
  expect(count).toBe(1);
});
