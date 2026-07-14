/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Daily Summary current shop status contracts', () => {
  const templates = ['web-app/summary.html', 'web-app/summary.ejs'];

  test.each(templates)('%s keeps existing sections and adds current shop status', (template) => {
    const source = read(template);
    expect(source).toContain('id="today-revenue"');
    expect(source).toContain('id="payment-breakdown"');
    expect(source).toContain('id="masseuse-performance"');
    expect(source).toContain('id="all-transactions"');
    expect(source).toContain('id="all-expenses"');
    expect(source).toContain('id="current-shop-status"');
    expect(source).toContain('id="current-shop-status-summary"');
    expect(source).toContain('updateCurrentShopStatus');
    expect(source).toContain('renderStatusSummary');
    expect(source).toContain('สถานะร้านตอนนี้');
    expect(source).toContain('ว่างตอนนี้');
    expect(source).toContain('คนถัดไปว่าง');
    expect(source).toContain('นวดวันนี้');
    expect(source).toContain('จองเวลา');
    expect(source).toContain('นวดถึง');
    expect(source).toContain('ว่างรับลูกค้า');
    expect(source).toContain('ว่างได้ตั้งแต่');
    expect(source).not.toContain('คิวถัดไป');
    expect(source).not.toContain('summary-status-position');
    expect(source).not.toContain('#${escapeStatusHtml(row.position)}');
  });

  test.each(templates)('%s uses compact Thai-first drill-down summary cards', (template) => {
    const source = read(template);
    expect(source).toContain('summary-card-button');
    expect(source).toContain('summary-card-detail');
    expect(source).toContain('toggleSummaryDetail');
    expect(source).toContain('summary-finance-section');
    expect(source).toContain('toggleFinanceSection');
    expect(source).toContain('การเงินวันนี้');
    expect(source).toContain("Today's Staff Queue");
    expect(source).toContain('รายรับวันนี้');
    expect(source).toContain('ค่าแรงหมอนวด');
    expect(source).toContain('ค่าใช้จ่ายวันนี้');
    expect(source).toContain('กำไรสุทธิ');
    expect(source).not.toContain("<div class=\"section-header\">TODAY'S PAYMENT BREAKDOWN</div>");
    expect(source).not.toContain("<div class=\"section-header\">TODAY'S MASSEUSE PERFORMANCE</div>");
    expect(source).not.toContain('masseuseeFee');
    expect(source).not.toContain('current-user');
  });

  test('styles keep summary cards and status rows compact', () => {
    const source = read('web-app/styles.css');
    expect(source).toContain('.summary-card-button');
    expect(source).toContain('.summary-card-detail');
    expect(source).toContain('.dashboard-grid.summary-compact-grid');
    expect(source).toContain('.summary-status-row');
    expect(source).toContain('.summary-status-summary');
    expect(source).toContain('.summary-finance-section');
    expect(source).toContain('min-height: 0');
    expect(source).toContain('grid-template-columns: minmax(0, 1.4fr) minmax(0, 2fr) auto');
  });

  test('frontend API exposes current shop status endpoint', () => {
    const source = read('web-app/api.js');
    expect(source).toContain('async getCurrentShopStatus()');
    expect(source).toContain('/staff/current-status');
  });
});
