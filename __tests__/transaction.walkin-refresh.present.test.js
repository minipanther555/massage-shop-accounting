/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('New Customer walk-in refresh contract', () => {
  const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

  test.each(templates)('%s refreshes Today Staff dropdown state after next-in-line submit', (template) => {
    const source = read(template);
    const successBlockStart = source.indexOf('if (success) {');
    const clearFormCall = source.indexOf('clearForm();', successBlockStart);
    const refreshCall = source.indexOf('await refreshRosterForDropdown();', successBlockStart);

    expect(refreshCall).toBeGreaterThan(successBlockStart);
    expect(refreshCall).toBeLessThan(clearFormCall);
  });

  test.each(templates)('%s refreshes live staff status before rebuilding the next-staff dropdown', (template) => {
    const source = read(template);
    const refreshFunctionStart = source.indexOf('async function refreshRosterForDropdown()');
    const refreshFunctionEnd = source.indexOf('\n        }', refreshFunctionStart);
    const refreshFunction = source.slice(refreshFunctionStart, refreshFunctionEnd);

    expect(refreshFunction).toContain('loadCurrentShopStatus()');
    expect(refreshFunction.indexOf('loadCurrentShopStatus()'))
      .toBeLessThan(refreshFunction.indexOf('renderMasseuseDropdown();'));
  });

  test.each(templates)('%s does not reference render-local next staff state during page setup', (template) => {
    const source = read(template);

    expect(source).not.toContain("DROPDOWNS POPULATED - Next in line:', nextInLineName");
    expect(source).toContain("DROPDOWNS POPULATED - Next in line:', autoSelectedMasseuse");
  });

  test('shared recent transaction helper keeps API newest-first ordering', () => {
    const source = read('web-app/shared.js');

    expect(source).toContain('const recent = filtered.slice(0, limit);');
    expect(source).not.toContain('filtered.slice(-limit).reverse()');
  });

  test('backend recent endpoint orders newest first with a deterministic tie-break', () => {
    const source = read('backend/routes/transactions.js');

    expect(source).toContain('ORDER BY datetime(t.timestamp) DESC, t.id DESC LIMIT ?');
  });
});
