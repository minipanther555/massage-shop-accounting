import { test, expect } from '@playwright/test';

// RIT-VERIFY-001 — the five journeys hold end to end. Journeys 1 and 5.
//
// Validation (steps ledger, verbatim): "all five journey tests green, and the Completion Notes
// carry the terminal output of the one observed failing beforehand." (AC-011 partially,
// §10 Regression Tests)
//
//   Journey 1 — "a walk-in is submitted and the dropdown, queue and day figures update with no
//   reload."
//   Journey 5 — "a refresh fails and reception sees the stale marker rather than a frozen page
//   that looks current."
//
// Both are browser journeys because both claims are about the PAGE: "with no reload" and "rather
// than a frozen page" are not observable from the server. The walk-in is entered through the real
// controls a receptionist touches — the staff dropdown, the service, duration and payment buttons,
// the submit button — not by calling the page's internals.
//
// Journey 5 fails BOTH refresh fetches, which is §10's Failure Test ("Both refresh fetches fail:
// the marker shows and the previous view is retained") and which no existing spec covers —
// `transaction.stale-marker.spec.js` fails only the roster call.
//
// RUN THIS FILE WITH `--workers=1`. Every intake spec drives ONE server holding ONE Today Staff
// list, and Playwright's default worker count is the machine's, so four of them interleave their
// seeding and read each other's masseuses. Measured on a freshly created database: the same five
// specs are 2 failed / 3 passed at the default worker count and 5 passed at `--workers=1`, with no
// code change between the two runs. Neither failure is a regression; both are the shared roster.
//
// playwright.config.ts is headless by default (PW_HEADED=1 to watch); restated here so this spec
// cannot open a window if that default is ever changed back.
test.use({ headless: true });

const cb = () => `v=${Date.now()}`;
const q = '?PWTEST=1';

const NEXT_LABEL = 'คิวถัดไป';
const ROSTER_ROUTE = '**/api/staff/roster**';
const STATUS_ROUTE = '**/api/staff/current-status**';

/** The one dropdown option carrying the next-in-queue label, or '' when nobody is labelled. */
async function nextInQueueLabel(page) {
  const labels = await page.locator('#masseuse option').allTextContents();
  return labels.find((label) => label.includes(NEXT_LABEL)) || '';
}

/** Read a ฿-formatted figure out of an element. */
async function bahtFigure(page, selector) {
  const text = (await page.locator(selector).textContent()) || '';
  return Number(text.replace(/[^0-9.]/g, ''));
}

const todayRevenue = (page) => bahtFigure(page, '#today-revenue');

/** The day's income as the LEDGER has it — the same endpoint the money panel reads. */
async function serverTodayRevenue(request) {
  const response = await request.get(`/api/reports/summary/today${q}`);
  expect(response.ok()).toBe(true);
  return Number((await response.json()).total_revenue);
}

/**
 * Put exactly two FRESH masseuses on Today Staff and nobody else.
 *
 * Both halves matter and neither is tidiness. The clear is what makes "she is the one offered
 * next" unambiguous — with anybody else on the list the walk-in priority depends on their
 * workload too. The fresh names are what make the spec RE-RUNNABLE: a walk-in books a live
 * three-hour window, so a fixed pair is busy for the rest of the day and the second run of this
 * file has nobody free to be offered next. That is a real failure, and it is the test's own
 * fixture at fault, not the code.
 *
 * The cost is two `staff` rows per run. These specs run against a scratch PWTEST database, and
 * the alternative — deleting them afterwards — is refused by the admin route once a masseuse has
 * earned a fee (`backend/routes/admin.js:299`).
 */
async function seedTwoFreeMasseuses(request) {
  const cleared = await request.delete(`/api/staff/roster${q}`);
  expect(cleared.ok()).toBe(true);
  rosterWasCleared = true;

  const stamp = Date.now();
  const names = [`RIT-J-A ${stamp}`, `RIT-J-B ${stamp}`];
  for (const name of names) {
    const created = await request.post(`/api/admin/staff${q}`, { data: { name } });
    expect(created.ok()).toBe(true);
    const added = await request.post(`/api/staff/today/add${q}`, { data: { display_name: name } });
    expect(added.ok()).toBe(true);
  }
  return names;
}

/**
 * Today Staff is ONE shared list on the server, so a spec that rewrites it changes what every
 * OTHER spec in the run sees. Measured: clearing it here made
 * `transaction.money-entry.spec.js` read this file's leftover masseuse as next in queue and go
 * red for a behaviour that had not regressed. Each test therefore snapshots the list, and puts it
 * back afterwards whether it passed or failed.
 */
let rosterBefore = [];
let rosterWasCleared = false;

test.beforeEach(async ({ request }) => {
  const response = await request.get(`/api/staff/roster${q}`);
  expect(response.ok()).toBe(true);
  rosterBefore = (await response.json()).map((row) => row.masseuse_name).filter(Boolean);
  rosterWasCleared = false;
});

test.afterEach(async ({ request }) => {
  if (!rosterWasCleared) return;
  await request.delete(`/api/staff/roster${q}`);
  for (const name of rosterBefore) {
    await request.post(`/api/staff/today/add${q}`, { data: { display_name: name } });
  }
});

/** Load the intake page and wait until its refresh helper is a reachable global. */
async function openIntake(page) {
  await page.goto(`/transaction.html${q}&${cb()}`, { waitUntil: 'networkidle' });
  await expect
    .poll(async () => page.evaluate(() => typeof window.refreshRosterForDropdown), { timeout: 15000 })
    .toBe('function');
  await page.evaluate(() => window.refreshRosterForDropdown());
}

test('Journey 1 — a walk-in is submitted and the dropdown, queue and day figures update with no reload', async ({ page, request }) => {
  // Two free masseuses, so "the queue moved" has somewhere to move to.
  const [firstFree, secondFree] = await seedTwoFreeMasseuses(request);

  await openIntake(page);

  // The queue assertion is worthless unless somebody really is labelled next before the entry.
  const queueBefore = await nextInQueueLabel(page);
  expect(queueBefore).not.toBe('');

  // The masseuse the page itself says is next. Selecting her is what makes this a walk-in taken
  // off the front of the queue rather than a manual pick.
  const nextMasseuse = await page.evaluate((label) => {
    const option = Array.from(document.querySelectorAll('#masseuse option'))
      .find((o) => o.textContent.includes(label));
    return option ? option.value : '';
  }, NEXT_LABEL);
  expect(nextMasseuse).not.toBe('');
  // The page must be offering one of the two masseuses this test put on the list, not a leftover.
  expect([firstFree, secondFree]).toContain(nextMasseuse);

  // A survivor global: a full page reload wipes it. This is how "with no reload" is PROVEN,
  // rather than by trusting that no navigation happened.
  await page.evaluate(() => { window.__ritNoReload = true; });

  // Count the redraws. Reading the rendered values alone can be green over a redraw that never
  // ran — the old values are still in the DOM either way (`RIT-UI-001`'s Discovery).
  await page.evaluate(() => {
    window.__ritDropdownRedraws = 0;
    window.__ritSummaryRedraws = 0;
    const dropdown = window.renderMasseuseDropdown;
    window.renderMasseuseDropdown = function countingDropdown(...args) {
      window.__ritDropdownRedraws += 1;
      return dropdown.apply(this, args);
    };
    const summary = window.updateQuickSummary;
    window.updateQuickSummary = function countingSummary(...args) {
      window.__ritSummaryRedraws += 1;
      return summary.apply(this, args);
    };
  });

  // Take the baseline from the LEDGER and wait for the screen to agree with it. Reading the
  // rendered figure alone races the page's own money fetch, which is still in flight after
  // networkidle — measured: a baseline read too early was ฿100 behind the server, and the
  // assertion after the submit then failed against a delta that was actually correct.
  // Waiting for agreement is also the epic's own goal restated: no disagreement between screen
  // and ledger.
  const revenueBefore = await serverTodayRevenue(request);
  await expect.poll(async () => todayRevenue(page), { timeout: 15000 }).toBe(revenueBefore);

  // ---- ENTER THE WALK-IN THROUGH THE REAL CONTROLS --------------------------
  await page.selectOption('#masseuse', nextMasseuse);

  await page.locator('#service-category-buttons button').first().click();
  const variantPanel = page.locator('#variant-service-panel');
  if (await variantPanel.isVisible()) {
    await variantPanel.locator('button').first().click();
  }
  await page.locator('#duration-button-panel button').first().click();
  await page.locator('#payment-button-panel button').first().click();

  // The form refuses a zero price, so a priced service is a precondition of the submit, not an
  // extra assertion about pricing.
  const price = await bahtFigure(page, '#servicePrice');
  expect(price).toBeGreaterThan(0);

  await page.click('#transaction-submit-button');

  // 1. THE DAY FIGURES updated — by the amount just taken.
  await expect.poll(async () => todayRevenue(page), { timeout: 15000 })
    .toBe(revenueBefore + price);
  // ...and the ledger moved by the same amount, so the screen is not merely self-consistent.
  expect(await serverTodayRevenue(request)).toBe(revenueBefore + price);

  // 2. THE DROPDOWN and the day figure were genuinely redrawn, not merely still showing old text.
  await expect.poll(async () => page.evaluate(() => window.__ritDropdownRedraws), { timeout: 15000 })
    .toBeGreaterThan(0);
  expect(await page.evaluate(() => window.__ritSummaryRedraws)).toBeGreaterThan(0);

  // 3. WITH NO RELOAD — the survivor global is still there.
  expect(await page.evaluate(() => window.__ritNoReload)).toBe(true);

  // 4. THE QUEUE moved: the masseuse who just took the customer is no longer the one offered
  //    next. A real re-fetch, not a cached snapshot.
  await page.evaluate(() => window.refreshRosterForDropdown());
  const queueAfter = await nextInQueueLabel(page);
  expect(queueAfter).not.toBe('');
  expect(queueAfter).not.toBe(queueBefore);
  expect(queueAfter).not.toContain(nextMasseuse);
  // ...and it is the OTHER masseuse this test seeded, not merely a different string.
  const stillFree = nextMasseuse === firstFree ? secondFree : firstFree;
  expect(queueAfter).toContain(stillFree);
});

test('Journey 5 — when both refreshes fail reception sees the stale marker, not a frozen page that looks current', async ({ page, request }) => {
  await seedTwoFreeMasseuses(request);

  await openIntake(page);

  const marker = page.locator('#staff-stale-marker');
  // Baseline: nothing has failed, so nothing is marked. Without this, an always-on marker passes.
  await expect(marker).toBeHidden();

  const optionsBefore = await page.locator('#masseuse option').count();
  expect(optionsBefore).toBeGreaterThan(1);

  await page.evaluate(() => {
    window.__ritDropdownRedraws = 0;
    const original = window.renderMasseuseDropdown;
    window.renderMasseuseDropdown = function countingRedraw(...args) {
      window.__ritDropdownRedraws += 1;
      return original.apply(this, args);
    };
  });

  // ---- BOTH FETCHES FAIL ----------------------------------------------------
  // §10 Failure Tests: "Both refresh fetches fail: the marker shows and the previous view is
  // retained." The existing stale-marker spec fails only the roster call.
  await page.route(ROSTER_ROUTE, (route) => route.abort('failed'));
  await page.route(STATUS_ROUTE, (route) => route.abort('failed'));
  await page.evaluate(() => window.refreshRosterForDropdown());

  await expect(marker).toBeVisible();
  const markerText = (await marker.textContent()) || '';
  // FR-003 processing logic 2: it names WHAT could not be refreshed — and with both down it must
  // name both, not just the first one to fail.
  expect(markerText).toContain('รายชื่อพนักงานวันนี้');
  expect(markerText).toContain('สถานะพนักงานล่าสุด');

  // FR-003 processing logic 1: the redraw ran even though both fetches rejected.
  expect(await page.evaluate(() => window.__ritDropdownRedraws)).toBe(1);

  // FR-003 Failure Modes: the previous view is RETAINED, not blanked. This is the other half of
  // "rather than a frozen page" — the page must neither lie nor go empty.
  expect(await page.locator('#masseuse option').count()).toBe(optionsBefore);

  // ---- BOTH RECOVER ---------------------------------------------------------
  await page.unroute(ROSTER_ROUTE);
  await page.unroute(STATUS_ROUTE);
  await page.evaluate(() => window.refreshRosterForDropdown());

  await expect(marker).toBeHidden();
  expect(await page.locator('#masseuse option').count()).toBeGreaterThan(1);
});
