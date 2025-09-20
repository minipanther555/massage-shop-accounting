import { test, expect } from '@playwright/test';

const cb = () => `v=${Date.now()}`;

test('each add ≤2 requests; no 429s', async ({ page }) => {
  let reqs = [];
  page.on('requestfinished', req => reqs.push(req));
  page.on('response', async (res) => {
    if (res.status() === 429) throw new Error(`429 from ${res.url()}`);
  });
  page.on('console', msg => { 
    if (msg.type() === 'error') {
      const text = msg.text();
      // Filter out expected errors
      if (!text.includes('sentry-cdn.com') && 
          !text.includes('Content Security Policy') &&
          !text.includes('script-src') &&
          !text.includes('404 (Not Found)') &&
          !text.includes('Failed to load resource')) {
        throw new Error(text);
      }
    }
  });

  await page.goto(`${process.env.BASE_URL}/staff.html?PWTEST=1&${cb()}`, { waitUntil: 'networkidle' });
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.ready === true), { timeout: 10000 }).toBe(true);

  // Add one person
  const firstVal = await page.$eval('#available-staff', sel => {
    const opt = sel.options[1]; return opt ? (opt.value || opt.textContent.trim()) : null; // Skip placeholder
  });
  expect(firstVal).toBeTruthy();
  reqs = [];
  await page.selectOption('#available-staff', firstVal);
  await page.click('#add-to-roster-btn');

  // Wait for UI settle (controller should re-render)
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.lastOp === 'add_done')).toBe(true);

  // Assert request budget (≤2) and no 429 caught by listener
  // Filter out CSRF requests for budget calculation
  const nonCsrfReqs = reqs.filter(r => !r.url().includes('/csrf'));
  expect(nonCsrfReqs.length, `too many requests: ${reqs.map(r=>r.url()).join('\n')}`).toBeLessThanOrEqual(2);
});
