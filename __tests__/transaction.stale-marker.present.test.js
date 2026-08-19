/* eslint-env jest */

// RIT-UI-001 — a failed refresh is visible to the receptionist.
// Parity contract: every change lands in BOTH intake templates.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

const refreshFunctionOf = (source) => {
  const start = source.indexOf('async function refreshRosterForDropdown()');
  const end = source.indexOf('\n        }', start);
  return source.slice(start, end);
};

describe('New Customer stale-staff marker contract (RIT-UI-001)', () => {
  test.each(templates)('%s carries a stale marker element on the staff area', (template) => {
    const source = read(template);

    expect(source).toContain('id="staff-stale-marker"');

    // It sits in the same form-group as the staff select, i.e. on the staff area.
    const staffSelect = source.indexOf('<select id="masseuse"');
    const marker = source.indexOf('id="staff-stale-marker"');
    const formGroupEnd = source.indexOf('</div>', source.indexOf('id="masseuse-availability-message"'));

    expect(staffSelect).toBeGreaterThan(-1);
    expect(marker).toBeGreaterThan(staffSelect);
    expect(marker).toBeLessThan(formGroupEnd + 200);
  });

  test.each(templates)('%s redraws the dropdown outside the fetches\' error path', (template) => {
    const refreshFunction = refreshFunctionOf(read(template));

    // The redraw must not be reachable only when both fetches resolve.
    expect(refreshFunction).toContain('Promise.allSettled');
    expect(refreshFunction).toContain('renderMasseuseDropdown();');

    // Ordering the existing walk-in refresh contract also depends on.
    expect(refreshFunction.indexOf('loadCurrentShopStatus()'))
      .toBeLessThan(refreshFunction.indexOf('renderMasseuseDropdown();'));
  });

  test.each(templates)('%s sets the marker on failure and clears it on success', (template) => {
    const source = read(template);
    const refreshFunction = refreshFunctionOf(source);

    expect(refreshFunction).toContain('setStaffStaleMarker(');
    expect(source).toContain('function setStaffStaleMarker(');

    // A live-status failure is reported through the returned error field, because
    // loadCurrentShopStatus() resolves a degraded object instead of rejecting.
    expect(refreshFunction).toContain('.error');
  });
});
