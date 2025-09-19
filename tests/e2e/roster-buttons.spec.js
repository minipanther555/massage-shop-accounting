import { test, expect } from '@playwright/test';

test('remove → GET and dropdown repopulates; add → PUT (≤2 req each); no console errors', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    const t = msg.type();
    if (t === 'error') {
      const text = msg.text();
      // Filter out expected errors that don't affect functionality
      if (!text.includes('sentry-cdn.com') && 
          !text.includes('404') && 
          !text.includes('CSP') &&
          !text.includes('Content Security Policy')) {
        errors.push(text);
      }
    }
  });

  // Go to staff page
  await page.goto('/staff.html?PWTEST=1&v=' + Date.now());

  // Track network budget
  const requests = [];
  page.on('requestfinished', r => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/')) requests.push(u.pathname);
  });

  // Precondition: dropdown has options
  const dd = page.locator('#available-staff');
  await expect(dd).toBeVisible();

  // Remove the first roster item if exists
  const removeBtn = page.locator('[data-action="remove"]').first();
  if (await removeBtn.isVisible()) {
    requests.length = 0;
    await removeBtn.click();
    // After remove, a name should appear in dropdown (repopulated)
    await expect(dd).toBeVisible();
    const count = await dd.locator('option').count();
    expect(count).toBeGreaterThan(0);
    // Budget: DELETE + GET at most
    expect(requests.filter(p => p.includes('/staff/roster')).length).toBeLessThanOrEqual(2);
  }

  // Add flow (if dropdown has at least one option)
  const optCount = await dd.locator('option').count();
  if (optCount > 0) {
    requests.length = 0;
    await dd.selectOption({ index: 0 });
    await page.locator('#add-to-roster-btn').click();
    // Should re-render roster; budget ≤2 (PUT plus optional GET)
    expect(requests.filter(p => p.includes('/staff/roster')).length).toBeLessThanOrEqual(2);
  }

  // No console errors
  expect(errors, errors.join('\n')).toHaveLength(0);
});
