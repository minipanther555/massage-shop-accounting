/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('expense descriptions use the API/database source of truth', () => {
  test.each(['web-app/summary.html', 'web-app/summary.ejs'])(
    '%s renders stored expense descriptions without preview-only aliases',
    (template) => {
      const source = read(template);
      expect(source.includes('escapeSummaryHtml(expense.description)')).toBe(true);
      expect(source.includes('getExpenseDisplayName')).toBe(false);
      expect(source.includes('DAILY_SUMMARY_STATUS_DEMO_V1')).toBe(false);
    }
  );
});
