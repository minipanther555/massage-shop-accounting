/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('time-window promotion contracts', () => {
  test('database stores branch configuration and immutable transaction audit values', () => {
    const source = read('backend/models/database.js');
    expect(source).toContain('time_window_promotion_settings');
    expect(source).toContain('time_window_promotion_prices');
    expect(source).toContain(".branch-43.db");
    expect(source).toContain("['Thai Massage', 60, 'In-Shop', 399]");
    expect(source).toContain('PRIMARY KEY (service_name, duration_minutes, location)');
    expect(source).toContain('base_price');
    expect(source).toContain('discount_amount');
    expect(source).toContain('promotion_type');
  });

  test('transaction route quotes and persists the server-calculated price', () => {
    const source = read('backend/routes/transactions.js');
    expect(source).toContain("router.post('/quote'");
    expect(source).toContain('getTimeWindowQuote(database');
    expect(source).toContain('time_window_promotion_override');
    expect(source).toContain('promotion.finalPrice');
    expect(source).toContain('promotion.discountAmount');
    expect(source).toContain('service.masseuse_fee');
  });

  test.each(['web-app/transaction.html', 'web-app/transaction.ejs'])('%s displays quote state and carries an authorized override', (template) => {
    const source = read(template);
    expect(source).toContain('id="time-window-promotion-label"');
    expect(source).toContain('id="time-window-promotion-override"');
    expect(source).toContain('function applyTimeWindowPromotionOverride()');
    expect(source).toContain('api.quoteTransactionPromotion');
    expect(source).toContain('time_window_promotion_override: timeWindowPromotionOverride');
  });
});
