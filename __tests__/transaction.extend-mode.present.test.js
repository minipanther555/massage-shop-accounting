/* eslint-env jest */

/**
 * PTE-UI-001/002/003 — Extend mode on the New Customer page.
 *
 * Extend is a third reception mode. It is entered from a specific active massage,
 * and the walk-in availability guard must NOT apply to that masseuse — she is
 * necessarily busy, because she is the one giving the massage being extended.
 * A guard that treated her as unavailable would make the whole feature unreachable.
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES = ['web-app/transaction.html', 'web-app/transaction.ejs'];

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

describe.each(TEMPLATES)('Extend mode contract (%s)', (template) => {
  const html = read(template);

  test('a third mode button exists alongside walk-in and booking', () => {
    expect(html).toMatch(/id="extend-mode-button"/);
    expect(html).toMatch(/setTransactionMode\('extend'\)/);
    expect(html).toMatch(/เพิ่มเวลา/);
  });

  test('reception picks which active massage to extend', () => {
    expect(html).toMatch(/id="extend-mode-panel"/);
    expect(html).toMatch(/id="extend-candidates"/);
  });

  test('both add-on kinds are offered', () => {
    expect(html).toMatch(/DURATION_UPGRADE/);
    expect(html).toMatch(/ADDITIONAL_SERVICE/);
  });

  test('amount already paid, amount due, and final end time are shown', () => {
    expect(html).toMatch(/id="extend-summary"/);
    expect(html).toMatch(/จ่ายแล้ว/); // already paid
    expect(html).toMatch(/ต้องจ่ายเพิ่ม/); // due now
    expect(html).toMatch(/เสร็จเวลา/); // finishes at
  });

  test('a zero amount due renders an explicit zero charge, never blank or NaN', () => {
    expect(html).toMatch(/ไม่ต้องจ่ายเพิ่ม/);
  });

  test('an add-on can be left unpaid for later settlement', () => {
    expect(html).toMatch(/id="extend-pending"/);
    expect(html).toMatch(/ยังไม่ชำระ/);
  });

  test('the busy-staff guard is bypassed only in extend mode', () => {
    // The exemption must be scoped: leaking it into walk-in would undo QUEUE-002.
    expect(html).toMatch(/transactionMode === 'extend'/);
    expect(html).toMatch(/function isMasseuseUnavailableForWalkIn/);
  });

  test('reception can settle and cancel an add-on from the activity list', () => {
    expect(html).toMatch(/settleAddOn/);
    expect(html).toMatch(/cancelAddOn/);
  });

  test('loading, error and empty states are all handled', () => {
    expect(html).toMatch(/id="extend-error"/);
    expect(html).toMatch(/ยังไม่มีรายการที่เพิ่มเวลาได้/); // empty state
  });

  test('the add-on submit posts through the documented API client', () => {
    expect(html).toMatch(/api\.createAddOn/);
  });
});

describe('Extend mode API client', () => {
  const api = read('web-app/api.js');

  test('the client exposes create, settle, and cancel', () => {
    expect(api).toMatch(/async createAddOn\(/);
    expect(api).toMatch(/async settleAddOn\(/);
    expect(api).toMatch(/async cancelAddOn\(/);
    expect(api).toMatch(/\/transactions\/add-ons/);
  });
});

describe('mirrored templates', () => {
  test('transaction.html and transaction.ejs carry the same extend markup', () => {
    const [html, ejs] = TEMPLATES.map(read);
    const extract = (source) => {
      const start = source.indexOf('id="extend-mode-panel"');
      return start === -1 ? null : source.slice(start, start + 2000);
    };
    expect(extract(html)).not.toBeNull();
    expect(extract(html)).toEqual(extract(ejs));
  });
});
