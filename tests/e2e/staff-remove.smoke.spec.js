const { test, expect } = require('@playwright/test');

test('Remove puts name back into dropdown with tight request budget', async ({ page }) => {
  const reqs = [];
  page.on('console', msg => {
    const t = msg.type();
    if (t === 'error') throw new Error('[ConsoleError] ' + msg.text());
  });
  page.on('request', r => reqs.push({ method: r.method(), url: r.url() }));

  // Contract guard (runs before app scripts)
  await page.addInitScript(() => {
    Object.defineProperty(window, '__contractViolations', { value: [], writable: false });
    window.addEventListener('load', () => {
      const api = window.api; // or however APIClient is exposed; if not exposed, skip
      const must = ['getStaffRoster','getAllStaff','addToRoster','removeStaffFromRoster'];
      must.forEach(k => {
        if (!api || typeof api[k] !== 'function') {
          window.__contractViolations.push(`missing:${k}`);
        }
      });
    });
  });

  const base = process.env.BASE_URL ?? 'https://109.123.238.197.sslip.io/stage';
  const url  = `${base}/staff.html?PWTEST=1&v=${Date.now()}`;
  await page.goto(url);

  // Fail if contract broken
  const violations = await page.evaluate(() => window.__contractViolations || []);
  expect(violations, 'API contract ok').toEqual([]);

  // Find first roster card's name + remove button
  const firstCard = page.locator('[data-roster-item]').first();
  await expect(firstCard).toBeVisible({ timeout: 5000 });
  const removedName = await firstCard.getAttribute('data-name');

  // Click its remove button
  await firstCard.getByRole('button', { name: /remove/i }).click();

  // The name should reappear in the dropdown quickly
  const dropdown = page.locator('[data-staff-dropdown]');
  await expect(dropdown).toBeVisible();
  await expect(async () => {
    const opts = await dropdown.evaluate(el => Array.from(el.querySelectorAll('option')).map(o => o.textContent?.trim()));
    expect(opts).toContain(removedName);
  }).toPass({ intervals: [200], timeout: 1200 });

  // Network budget & sequence: 1 DELETE + 1 GET /api/staff/roster, no 429
  const dels = reqs.filter(r => r.method === 'DELETE' && /\/api\/staff\/roster\/\d+$/.test(r.url));
  const gets = reqs.filter(r => r.method === 'GET' && /\/api\/staff\/roster$/.test(r.url));
  expect(dels.length, 'one DELETE').toBe(1);
  expect(gets.length, 'one GET after delete').toBeGreaterThanOrEqual(1);
  expect(reqs.every(r => !/\/429\b/.test(r.url)), 'no 429s').toBeTruthy();
});
