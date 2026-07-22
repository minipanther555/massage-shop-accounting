/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('New Customer Oil category promotion contract', () => {
  const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

  test.each(templates)('%s selects the exact promoted Oil massage service from the Oil category', (template) => {
    const source = read(template);

    expect(source).toContain("oil: 'Oil massage'");
    expect(source).toContain('function getPreferredCategoryService(categoryKey, serviceNames)');
    expect(source).toContain('selectServiceValue(getPreferredCategoryService(definition.key, servicesByCategory[definition.key]))');
  });
});
