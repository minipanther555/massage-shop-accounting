import { test, expect } from '@playwright/test';

// RIT-UI-002 — the dropdown never shows a stale name list.
// Validation (steps ledger): "one test renders the dropdown twice — with a populated Today Staff
// list, asserting those names appear and a busy one is not labelled next; and with an empty list,
// asserting ZERO selectable names and a visible empty-state message." (AC-005, FR-004, SC-3)
//
// playwright.config.ts sets headless:false for local hand-driving; this spec runs unattended.
test.use({ headless: true });

const cb = () => `v=${Date.now()}`;

const rosterRows = (names) => names.map((name, index) => ({
  position: index + 1,
  masseuse_name: name,
  status: null,
  busy_until: null,
  today_massages: 0
}));

const statusPayload = (staff) => ({
  business_day: '2026-08-19',
  generated_at: new Date().toISOString(),
  buffer_minutes: 15,
  staff
});

test('populated Today Staff renders those names with the busy one not next; empty renders nobody and says why', async ({ page }) => {
  await page.goto(`/transaction.html?PWTEST=1&${cb()}`, { waitUntil: 'networkidle' });

  await expect
    .poll(async () => page.evaluate(() => typeof window.refreshRosterForDropdown), { timeout: 15000 })
    .toBe('function');

  // Count redraws. Asserting only that options are present/absent is green against unfixed code:
  // the options of the PREVIOUS render survive a redraw that never ran. (RIT-UI-001 Discovery.)
  await page.evaluate(() => {
    window.__ritRedrawCount = 0;
    const original = window.renderMasseuseDropdown;
    window.renderMasseuseDropdown = function countingRedraw(...args) {
      window.__ritRedrawCount += 1;
      return original.apply(this, args);
    };
  });

  const emptyState = page.locator('#staff-empty-state');
  const staleMarker = page.locator('#staff-stale-marker');

  // ---- RENDER 1: POPULATED --------------------------------------------------
  // Driven through the REAL fetch, not by assigning appData.roster: an implementation that
  // renders only from a roster it never populates must not be able to pass this.
  await page.route('**/api/staff/roster**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(rosterRows(['Aoi', 'Beam', 'Cherry']))
  }));
  await page.route('**/api/staff/current-status**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(statusPayload([
      // Aoi is position 1 but BUSY — she must never be labelled next in queue.
      { masseuse_name: 'Aoi', position: 1, current_state: 'busy', walk_in_priority: false },
      { masseuse_name: 'Beam', position: 2, current_state: 'available', walk_in_priority: false },
      { masseuse_name: 'Cherry', position: 3, current_state: 'available', walk_in_priority: false }
    ]))
  }));

  await page.evaluate(() => window.refreshRosterForDropdown());
  expect(await page.evaluate(() => window.__ritRedrawCount)).toBe(1);

  const populatedLabels = await page.locator('#masseuse option').allTextContents();
  // The three Today Staff names appear.
  expect(populatedLabels.some((label) => label.startsWith('Aoi'))).toBe(true);
  expect(populatedLabels.some((label) => label.startsWith('Beam'))).toBe(true);
  expect(populatedLabels.some((label) => label.startsWith('Cherry'))).toBe(true);

  // FR-004 logic 3: the busy masseuse is not labelled next in queue, and the busy guard
  // disables her — both read the same live-status snapshot.
  const aoiLabel = populatedLabels.find((label) => label.startsWith('Aoi')) || '';
  const beamLabel = populatedLabels.find((label) => label.startsWith('Beam')) || '';
  expect(aoiLabel).not.toContain('คิวถัดไป');
  expect(beamLabel).toContain('คิวถัดไป');
  expect(await page.locator('#masseuse option[value="Aoi"]').isDisabled()).toBe(true);

  // No empty state while staff exist.
  await expect(emptyState).toBeHidden();

  // ---- RENDER 2: EMPTY ------------------------------------------------------
  // The 2am reset: Today Staff is empty and NOTHING failed. Yesterday's page-load name list
  // must not reappear. (SC-3, today-staff spec FR-007 Outputs — an empty roster is correct.)
  await page.unroute('**/api/staff/roster**');
  await page.unroute('**/api/staff/current-status**');
  await page.route('**/api/staff/roster**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify([])
  }));
  await page.route('**/api/staff/current-status**', (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(statusPayload([]))
  }));

  // Seed the page-load name list with YESTERDAY'S names. shared.js:251 is its only writer, and
  // this is exactly the shape it captures inside loadData() at startup. Without this the "zero
  // selectable names" assertion below is green against the unfixed code — a scratch database with
  // no staff makes the fallback list empty too, so the fallback can never be observed firing.
  // `CONFIG` is a top-level `const` in shared.js:49, so it lives in the page's global lexical
  // scope and is NOT a property of window — it is reached by bare name.
  await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    CONFIG.settings.masseuses = ['YesterdayOne', 'YesterdayTwo'];
  });

  await page.evaluate(() => window.refreshRosterForDropdown());
  expect(await page.evaluate(() => window.__ritRedrawCount)).toBe(2);

  // ZERO selectable names: only the placeholder remains. Yesterday's names must not reappear.
  const emptyOptions = await page.locator('#masseuse option').allTextContents();
  expect(emptyOptions).toHaveLength(1);
  expect(emptyOptions[0]).toContain('เลือกพนักงาน');
  expect(await page.locator('#masseuse option[value="Aoi"]').count()).toBe(0);
  expect(await page.locator('#masseuse option[value="YesterdayOne"]').count()).toBe(0);
  expect(await page.locator('#masseuse option[value="YesterdayTwo"]').count()).toBe(0);

  // The empty-state message is visible and points at the Today Staff page.
  await expect(emptyState).toBeVisible();
  expect((await emptyState.textContent()) || '').toContain('พนักงานวันนี้');

  // Nothing failed, so this is NOT the stale case.
  await expect(staleMarker).toBeHidden();

  // ---- RENDER 3: EMPTY *BECAUSE THE FETCH FAILED* ---------------------------
  // The discriminator. loadCurrentShopStatus() never rejects — it resolves { staff: [], error }.
  // An empty list WITH an error is RIT-UI-001's stale case, and must NOT tell reception to go
  // rebuild a roster that is fine.
  await page.unroute('**/api/staff/current-status**');
  await page.route('**/api/staff/current-status**', (route) => route.abort('failed'));

  await page.evaluate(() => window.refreshRosterForDropdown());
  expect(await page.evaluate(() => window.__ritRedrawCount)).toBe(3);

  await expect(staleMarker).toBeVisible();
  await expect(emptyState).toBeHidden();
});
