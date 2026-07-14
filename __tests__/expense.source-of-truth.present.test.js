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

  test('New Customer expense delete calls the backend delete endpoint and awaits refresh', () => {
    const shared = read('web-app/shared.js');
    const transactionHtml = read('web-app/transaction.html');
    const transactionEjs = read('web-app/transaction.ejs');
    const api = read('web-app/api.js');

    expect(api).toContain('async deleteExpense(expenseId)');
    expect(api).toContain("method: 'DELETE'");
    expect(shared).toContain('async function removeExpense(index)');
    expect(shared).toContain('await api.deleteExpense(expense.id)');
    expect(shared).toContain('await loadTodayData()');
    expect(shared).not.toContain('appData.expenses.splice(index, 1)');
    expect(transactionHtml).toContain('if (await removeExpense(index))');
    expect(transactionEjs).toContain('if (await removeExpense(index))');
  });
});
