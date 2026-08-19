/* eslint-env jest */

// RIT-UI-003 — reception can enter a tip and a miscellaneous charge.
// Parity contract: every change lands in BOTH intake templates.

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

const functionBodyOf = (source, signature) => {
  const start = source.indexOf(signature);
  if (start === -1) return '';
  const end = source.indexOf('\n        }', start);
  return source.slice(start, end);
};

describe('New Customer money-entry contract (RIT-UI-003)', () => {
  test.each(templates)('%s carries the money mode button and panel', (template) => {
    const source = read(template);

    expect(source).toContain('id="money-mode-button"');
    expect(source).toContain('id="money-mode-panel"');
    expect(source).toContain('id="money-kind-tip"');
    expect(source).toContain('id="money-kind-misc"');
    expect(source).toContain('id="money-parent"');
    expect(source).toContain('id="money-amount"');
    expect(source).toContain('id="money-description"');
    expect(source).toContain('id="money-payment"');
    expect(source).toContain('id="money-submit-button"');
  });

  test.each(templates)('%s posts the two money kinds through the shared add-on client', (template) => {
    const submit = functionBodyOf(read(template), 'async function submitMoneyEntry(');

    expect(submit).not.toBe('');
    // web-app/api.js:createAddOn is the one client path to POST /transactions/add-ons.
    // A second path would drift from the server contract the moment either side changed.
    expect(submit).toContain('api.createAddOn(');
    expect(submit).toContain('add_on_kind');
    expect(submit).toContain('amount');
  });

  test.each(templates)('%s refuses to submit a blank description on a charge', (template) => {
    const source = read(template);
    const gate = functionBodyOf(source, 'function updateMoneySubmitState(');

    expect(gate).not.toBe('');
    // The server 400s a blank MISC_INCOME description (RIT-MONEY-003). Reception must meet a
    // disabled button, never an uninterpretable error.
    expect(gate).toContain("MISC_INCOME");
    expect(gate).toContain('.trim()');
    expect(gate).toContain('disabled');
    // ...and the submit handler refuses it too, so a re-enabled button cannot get past it.
    expect(functionBodyOf(source, 'async function submitMoneyEntry(')).toContain('.trim()');
  });

  test.each(templates)('%s refreshes the day figures through the existing path, not a new one', (template) => {
    const submit = functionBodyOf(read(template), 'async function submitMoneyEntry(');

    // updateAllDisplays() is what already redraws #today-revenue. A second refresh mechanism
    // would be a second thing to keep true.
    expect(submit).toContain('updateAllDisplays()');
    expect(submit).toContain('loadTodayData()');
  });

  test.each(templates)('%s offers a tip only against live work, not only ACTIVE rows', (template) => {
    const candidates = functionBodyOf(read(template), 'function tippableTransactions(');

    expect(candidates).not.toBe('');
    // FR-005 edge case: a tip on a transaction later edited follows the correction chain, whose
    // live row is CORRECTED. The server accepts it (isLiveWork); the control must offer it.
    expect(candidates).toContain("'CORRECTED'");
    expect(candidates).toContain("'ACTIVE'");
  });
});
