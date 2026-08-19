import { test, expect } from '@playwright/test';

// RIT-UI-001 — a failed refresh is visible to the receptionist.
// Validation (steps ledger): "a browser-driven test fails one fetch, asserts the stale marker is
// visible AND that a successful refresh afterwards removes it — both in one test, so an always-on
// marker fails." (AC-004, FR-003, SC-2)
//
// The repo's playwright.config.ts sets headless:false for local hand-driving. This spec runs
// unattended, so it forces headless itself.
test.use({ headless: true });

const cb = () => `v=${Date.now()}`;

test('a failed roster refresh shows the stale marker, and the next good refresh clears it', async ({ page }) => {
  await page.goto(`/transaction.html?PWTEST=1&${cb()}`, { waitUntil: 'networkidle' });

  // The refresh helper must be reachable as a page global — the whole feature is driven through it.
  await expect
    .poll(async () => page.evaluate(() => typeof window.refreshRosterForDropdown), { timeout: 15000 })
    .toBe('function');

  const marker = page.locator('#staff-stale-marker');

  // Baseline: nothing has failed yet, so no marker.
  await expect(marker).toBeHidden();

  // --- ERROR STATE -------------------------------------------------------
  // Count redraws. Asserting the dropdown merely still HAS options would prove nothing: the
  // options from the previous successful render survive a redraw that never ran. Only counting
  // the call proves FR-003 processing logic 1 — the redraw left the fetches' error path.
  await page.evaluate(() => {
    window.__ritRedrawCount = 0;
    const original = window.renderMasseuseDropdown;
    window.renderMasseuseDropdown = function countingRedraw(...args) {
      window.__ritRedrawCount += 1;
      return original.apply(this, args);
    };
  });

  // Fail exactly one of the two refresh calls: the Today Staff roster.
  await page.route('**/api/staff/roster**', (route) => route.abort('failed'));
  await page.evaluate(() => window.refreshRosterForDropdown());

  await expect(marker).toBeVisible();
  const markerText = (await marker.textContent()) || '';
  expect(markerText.length).toBeGreaterThan(0);
  // It must name what could not be refreshed (FR-003 processing logic 2).
  expect(markerText).toContain('รายชื่อพนักงานวันนี้');

  // FR-003 processing logic 1: the redraw ran even though a sibling fetch rejected.
  expect(await page.evaluate(() => window.__ritRedrawCount)).toBe(1);

  // FR-003 Failure Modes: the previous view is retained rather than blanked.
  const optionCountDuringFailure = await page.locator('#masseuse option').count();
  expect(optionCountDuringFailure).toBeGreaterThan(0);

  // --- SUCCESS STATE -----------------------------------------------------
  // Restore the call. The next successful refresh must clear the marker.
  await page.unroute('**/api/staff/roster**');
  await page.evaluate(() => window.refreshRosterForDropdown());

  await expect(marker).toBeHidden();
});
