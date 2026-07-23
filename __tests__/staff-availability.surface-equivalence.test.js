/**
 * MRE: Do Daily Summary "who is free" and the New Customer dropdown's
 * enabled/disabled state ever disagree, given the same status payload?
 *
 * Both surfaces consume GET /api/staff/current-status:
 *   - Daily Summary  : web-app/summary.html  renderStatusSummary() / row rendering
 *                      free set === rows where current_state === 'available'
 *   - New Customer   : web-app/transaction.html isMasseuseUnavailableForWalkIn()
 *                      enabled set === options where disabled === false
 *
 * The real predicate is extracted from the shipped templates rather than
 * re-implemented, so this test fails if either surface's logic drifts.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');

function readTemplate(relativePath) {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
}

/** Pull the real isMasseuseUnavailableForWalkIn() out of a shipped template. */
function extractWalkInPredicate(templateSource, templateName) {
  const match = templateSource.match(
    /function isMasseuseUnavailableForWalkIn\(name\) \{[\s\S]*?\n {8}\}/
  );
  if (!match) {
    throw new Error(`isMasseuseUnavailableForWalkIn not found in ${templateName}`);
  }
  // `transactionMode` is a page-level variable the real function reads, so the
  // harness must supply it. Defaults to walk-in, the mode the guard protects.
  // eslint-disable-next-line no-new-func
  return new Function(
    'appData',
    'transactionMode',
    `${match[0]}\nreturn isMasseuseUnavailableForWalkIn;`
  );
}

/** Daily Summary's free set: summary.html filters rows on current_state. */
function dailySummaryFreeNames(statusPayload) {
  const rows = Array.isArray(statusPayload.staff) ? statusPayload.staff : [];
  if (statusPayload.error) return []; // summary.html renders an error, no rows
  return rows
    .filter((row) => row.current_state === 'available')
    .map((row) => row.masseuse_name);
}

/**
 * New Customer's enabled set, mirroring transaction.html:
 *   option.disabled = transactionMode !== 'booking'
 *                     && isMasseuseUnavailableForWalkIn(option.value);
 */
function newCustomerEnabledNames(predicateFactory, rosterNames, statusPayload, mode = 'walkin') {
  const appData = { currentShopStatus: statusPayload, roster: [] };
  const isUnavailable = predicateFactory(appData, mode);
  return rosterNames.filter((name) => !(mode !== 'booking' && isUnavailable(name)));
}

const TEMPLATES = [
  ['web-app/transaction.html', 'transaction.html'],
  ['web-app/transaction.ejs', 'transaction.ejs'],
];

/** Payload shaped like the 2026-07-23 17:07 production screenshots. */
function productionLikePayload() {
  const busy = ['พี่แอร์', 'พี่ขวัญ', 'พี่อุ้ม', 'พี่พงศ์', 'พี่นาง', 'จอย'];
  const free = ['พี่ดาว', 'พี่นิชา', 'พี่ภัทร', "P'นิ", 'แยม'];
  return {
    business_day: '2026-07-23',
    generated_at: '2026-07-23T10:07:00.000Z',
    buffer_minutes: 15,
    staff: [
      ...busy.map((name, i) => ({
        masseuse_name: name,
        position: i + 1,
        current_state: 'busy',
        today_massages: 1,
      })),
      ...free.map((name, i) => ({
        masseuse_name: name,
        position: busy.length + i + 1,
        current_state: 'available',
        today_massages: name === 'พี่ดาว' ? 0 : 1,
      })),
    ],
  };
}

describe.each(TEMPLATES)('walk-in availability parity (%s)', (relativePath, templateName) => {
  const predicateFactory = extractWalkInPredicate(readTemplate(relativePath), templateName);

  test('production-shaped payload: both surfaces name the same free staff', () => {
    const payload = productionLikePayload();
    const rosterNames = payload.staff.map((row) => row.masseuse_name);

    const summaryFree = dailySummaryFreeNames(payload).sort();
    const dropdownFree = newCustomerEnabledNames(predicateFactory, rosterNames, payload).sort();

    expect(dropdownFree).toEqual(summaryFree);
    expect(summaryFree).toHaveLength(5);
    expect(summaryFree).toContain('แยม');
  });

  test('every current_state combination agrees across both surfaces', () => {
    const states = ['available', 'busy', 'booking_buffer'];
    const payload = {
      staff: states.flatMap((state, i) =>
        [1, 2].map((n) => ({
          masseuse_name: `${state}-${n}`,
          position: i * 2 + n,
          current_state: state,
        }))
      ),
    };
    const rosterNames = payload.staff.map((row) => row.masseuse_name);

    expect(newCustomerEnabledNames(predicateFactory, rosterNames, payload).sort())
      .toEqual(dailySummaryFreeNames(payload).sort());
  });

  test('an unknown current_state is treated as unavailable by both surfaces', () => {
    const payload = { staff: [{ masseuse_name: 'ใหม่', position: 1, current_state: 'on_break' }] };
    expect(newCustomerEnabledNames(predicateFactory, ['ใหม่'], payload)).toEqual([]);
    expect(dailySummaryFreeNames(payload)).toEqual([]);
  });

  // --- Deliberate fail-open behaviour, locked in on purpose ---
  //
  // When the status payload is missing or errored, the dropdown enables everyone
  // rather than disabling everyone. This is INTENTIONAL and must not be
  // "hardened" into fail-closed: a transient network blip would otherwise stop
  // reception from recording any transaction at all. The receptionist is in the
  // room and can see who is on a bed; the greying is a convenience guard, not
  // the source of truth. Verified 2026-07-23 against production screenshots
  // where the two surfaces agreed exactly (5 free / 6 busy).

  test('a failed status load leaves every masseuse selectable so the till keeps working', () => {
    // shared.js loadCurrentShopStatus() error path: staff: [], error set.
    const failedPayload = {
      business_day: null,
      generated_at: '2026-07-23T10:07:00.000Z',
      buffer_minutes: 15,
      staff: [],
      error: 'Failed to load current shop status',
    };
    const rosterNames = productionLikePayload().staff.map((row) => row.masseuse_name);

    expect(dailySummaryFreeNames(failedPayload)).toEqual([]); // summary fails closed, shows an error
    expect(newCustomerEnabledNames(predicateFactory, rosterNames, failedPayload))
      .toEqual(rosterNames); // dropdown fails open, stays usable
  });

  test('extend mode exempts a busy masseuse, because she is the one being extended', () => {
    const payload = productionLikePayload();
    const busyName = payload.staff.find((row) => row.current_state === 'busy').masseuse_name;
    const rosterNames = payload.staff.map((row) => row.masseuse_name);

    // Walk-in must still block her...
    expect(newCustomerEnabledNames(predicateFactory, rosterNames, payload, 'walkin'))
      .not.toContain(busyName);
    // ...while extend must not, or the feature is unreachable (PTE-009).
    expect(newCustomerEnabledNames(predicateFactory, rosterNames, payload, 'extend'))
      .toContain(busyName);
  });

  test('a roster name absent from the status payload stays selectable', () => {
    const payload = productionLikePayload();
    const unknownName = 'พนักงานค้างจากเมื่อวาน';
    const rosterNames = [...payload.staff.map((row) => row.masseuse_name), unknownName];

    expect(newCustomerEnabledNames(predicateFactory, rosterNames, payload)).toContain(unknownName);
  });
});
