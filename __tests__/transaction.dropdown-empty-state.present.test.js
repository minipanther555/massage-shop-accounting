/* eslint-env jest */

// RIT-UI-002 — the dropdown never shows a stale name list.
// Parity contract: every change lands in BOTH intake templates.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

const renderFunctionOf = (source) => {
  const start = source.indexOf('function renderMasseuseDropdown()');
  const end = source.indexOf('\n        }', start);
  return source.slice(start, end);
};

describe('New Customer dropdown empty-state contract (RIT-UI-002)', () => {
  test.each(templates)('%s never falls back to the page-load name list', (template) => {
    const renderFunction = renderFunctionOf(read(template));

    // FR-004 processing logic 1. The fallback expression is gone entirely.
    expect(renderFunction).not.toContain('CONFIG.settings.masseuses');
    expect(renderFunction).toContain('orderedMasseuses');
  });

  test.each(templates)('%s carries an empty-state element on the staff area', (template) => {
    const source = read(template);

    expect(source).toContain('id="staff-empty-state"');

    const staffSelect = source.indexOf('<select id="masseuse"');
    const emptyState = source.indexOf('id="staff-empty-state"');
    const formGroupEnd = source.indexOf('</div>', source.indexOf('id="staff-stale-marker"'));

    expect(staffSelect).toBeGreaterThan(-1);
    expect(emptyState).toBeGreaterThan(staffSelect);
    expect(emptyState).toBeLessThan(formGroupEnd + 200);
  });

  test.each(templates)('%s distinguishes an empty roster from a failed fetch', (template) => {
    const source = read(template);
    const renderFunction = renderFunctionOf(source);

    // loadCurrentShopStatus() resolves a degraded snapshot instead of rejecting, so an empty
    // list with an .error is the stale case, not the empty-state case.
    expect(source).toContain('function staffInformationFailedToLoad(');
    expect(source).toContain('currentShopStatus.error');
    expect(renderFunction).toContain('staffInformationFailedToLoad()');
  });

  test.each(templates)('%s still leaves the shared.js producer in place for initializeRoster()', () => {
    const shared = read('web-app/shared.js');

    // The defect is the CONSUMER, not the producer. initializeRoster() is an unrelated
    // consumer of the same list and must keep working.
    expect(shared).toContain('CONFIG.settings.masseuses = [...new Set(roster');
    expect(shared).toContain('i < CONFIG.settings.masseuses.length ? CONFIG.settings.masseuses[i]');
  });
});
