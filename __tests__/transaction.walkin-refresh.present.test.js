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

  test('shared recent transaction helper keeps API newest-first ordering', () => {
    const source = read('web-app/shared.js');

    expect(source).toContain('const recent = filtered.slice(0, limit);');
    expect(source).not.toContain('filtered.slice(-limit).reverse()');
  });

  test('backend recent endpoint orders newest first with a deterministic tie-break', () => {
    const source = read('backend/routes/transactions.js');

    expect(source).toContain('ORDER BY timestamp DESC, id DESC LIMIT ?');
  });
});
