import { test, expect } from '@playwright/test';

// RIT-UI-003 — reception can enter a tip and a miscellaneous charge.
//
// Validation (steps ledger, verbatim): "a browser-driven test records a tip and a miscellaneous
// charge and asserts the day's income figure changes on screen with no reload, AND that the staff
// dropdown's next-in-queue label is unchanged by either entry." (AC-006, AC-008, AC-009)
//
// The second half is AC-009 — non-massage money must never move the queue. It is asserted after
// BOTH entries, against a REAL re-fetch of /api/staff/current-status, with a masseuse who really
// is labelled next in queue. Nothing here is mocked: a mocked status endpoint would make the
// assertion pass by construction.
//
// playwright.config.ts is headless by default (PW_HEADED=1 to watch); stated here so this spec
// cannot open a window if that default is ever changed back.
test.use({ headless: true });

const cb = () => `v=${Date.now()}`;
const q = '?PWTEST=1';

const BUSY_MASSEUSE = 'Nok นก';
const FREE_MASSEUSE = 'Mali มะลิ';
const NEXT_LABEL = 'คิวถัดไป';

/** The one option carrying the next-in-queue label, or '' when nobody is labelled. */
async function nextInQueueLabel(page) {
  const labels = await page.locator('#masseuse option').allTextContents();
  return labels.find((label) => label.includes(NEXT_LABEL)) || '';
}

async function todayRevenue(page) {
  const text = (await page.locator('#today-revenue').textContent()) || '';
  return Number(text.replace(/[^0-9.]/g, ''));
}

test('a tip and a miscellaneous charge move the day figure on screen, and neither moves the queue', async ({ page, request }) => {
  // ---- SEED, over the real HTTP API ----------------------------------------
  // Two masseuses on Today Staff so one of them is genuinely labelled next in queue; a real
  // massage so the tip has a live parent (the server requires one — RIT-MONEY-001).
  for (const name of [BUSY_MASSEUSE, FREE_MASSEUSE]) {
    await request.post(`/api/admin/staff${q}`, { data: { name } }); // 400 if already there — fine
    const added = await request.post(`/api/staff/today/add${q}`, { data: { display_name: name } });
    expect(added.ok()).toBe(true);
  }

  const massage = await request.post(`/api/transactions${q}`, {
    data: {
      masseuse_name: BUSY_MASSEUSE,
      service_type: 'Aroma massage',
      location: 'In-Shop',
      duration: 60,
      payment_method: 'Cash',
      start_time: '14:00',
      end_time: '15:00'
    }
  });
  expect(massage.ok()).toBe(true);
  const parentId = (await massage.json()).transaction_id;

  // ---- LOAD -----------------------------------------------------------------
  await page.goto(`/transaction.html${q}&${cb()}`, { waitUntil: 'networkidle' });
  await expect
    .poll(async () => page.evaluate(() => typeof window.refreshRosterForDropdown), { timeout: 15000 })
    .toBe('function');
  await page.evaluate(() => window.refreshRosterForDropdown());

  // The queue assertion below is worthless unless somebody is actually labelled next.
  const queueBefore = await nextInQueueLabel(page);
  expect(queueBefore).not.toBe('');

  // A survivor global: a full page reload wipes it. This is how "with no reload" is proven,
  // rather than by trusting that no navigation happened.
  await page.evaluate(() => { window.__ritNoReload = true; });

  // Count the day-figure redraws. Reading the figure alone can be green against unfixed code
  // when the old value happens to match — RIT-UI-001's Discovery, in its money form.
  await page.evaluate(() => {
    window.__ritSummaryCount = 0;
    const original = window.updateQuickSummary;
    window.updateQuickSummary = function countingSummary(...args) {
      window.__ritSummaryCount += 1;
      return original.apply(this, args);
    };
  });

  const revenueBefore = await todayRevenue(page);

  // ---- ENTRY 1: A TIP -------------------------------------------------------
  // The operator's own case: the customer tips on a card, the shop hands the masseuse cash.
  await page.click('#money-mode-button');
  await expect(page.locator('#money-mode-panel')).toBeVisible();
  await page.click('#money-kind-tip');

  await page.selectOption('#money-parent', parentId);
  await page.fill('#money-amount', '100');
  await page.selectOption('#money-payment', 'Credit Card');
  await expect(page.locator('#money-submit-button')).toBeEnabled();
  await page.click('#money-submit-button');

  // AC-006 — the day's income figure changes ON SCREEN.
  await expect.poll(async () => todayRevenue(page), { timeout: 15000 })
    .toBe(revenueBefore + 100);
  expect(await page.evaluate(() => window.__ritNoReload)).toBe(true);
  expect(await page.evaluate(() => window.__ritSummaryCount)).toBeGreaterThan(0);

  // AC-009 — the queue did not move. A REAL re-fetch, not a cached snapshot.
  await page.evaluate(() => window.refreshRosterForDropdown());
  expect(await nextInQueueLabel(page)).toBe(queueBefore);

  // ---- ENTRY 2: A MISCELLANEOUS CHARGE --------------------------------------
  // The operator's own case: tiger balm at ฿50 on top of a normal massage.
  await page.click('#money-kind-misc');

  // The server REQUIRES a non-blank description for MISC_INCOME (RIT-MONEY-003) and answers a
  // blank one with a 400 reception cannot interpret. The control must not let it be sent.
  await page.fill('#money-amount', '50');
  await page.fill('#money-description', '   ');
  await expect(page.locator('#money-submit-button')).toBeDisabled();

  await page.fill('#money-description', 'ยาหม่อง');
  await page.selectOption('#money-payment', 'Cash');
  await expect(page.locator('#money-submit-button')).toBeEnabled();

  const revenueAfterTip = await todayRevenue(page);
  await page.evaluate(() => { window.__ritSummaryCount = 0; });
  await page.click('#money-submit-button');

  // AC-008 — the day's income figure changes on screen, again with no reload.
  await expect.poll(async () => todayRevenue(page), { timeout: 15000 })
    .toBe(revenueAfterTip + 50);
  expect(await page.evaluate(() => window.__ritNoReload)).toBe(true);
  expect(await page.evaluate(() => window.__ritSummaryCount)).toBeGreaterThan(0);

  // AC-009 again — the miscellaneous charge did not move the queue either.
  await page.evaluate(() => window.refreshRosterForDropdown());
  expect(await nextInQueueLabel(page)).toBe(queueBefore);
});
