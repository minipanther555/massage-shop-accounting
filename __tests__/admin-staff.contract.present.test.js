const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin staff payday contract', () => {
  test('payment history handles the backend response shape', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain('const response = await api.getStaffPayments(staffId)');
    expect(html).toContain('Array.isArray(response.payments) ? response.payments : []');
    expect(html).not.toContain('const payments = await api.getStaffPayments(staffId)');
  });

  test('outstanding fees uses backend masseuse_name field', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain("const staffName = staff.masseuse_name || staff.name || ''");
    expect(html).toContain('escapeAdminStaffHtml(staffName)');
  });

  test('database-backed dynamic staff and payment strings are escaped before innerHTML rendering', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain('function escapeAdminStaffHtml(value)');
    expect(html).toContain('escapeAdminStaffHtml(member.name ||');
    expect(html).toContain('escapeAdminStaffHtml(payment.notes)');
    expect(html).toContain('escapeAdminStaffHtml(staff.payment_status ||');
  });

  test('page uses centralized API methods for payday mutations', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain('api.getAdminStaff()');
    expect(html).toContain('api.addStaff(staffData)');
    expect(html).toContain('api.updateAdminStaff(currentStaffId, staffData)');
    expect(html).toContain('api.removeStaff(staffId)');
    expect(html).toContain('api.recordPayment(currentStaffId, paymentData)');
    expect(html).toContain('api.getOutstandingFees()');
  });

  test('payday summary cards and staff names expose inline expandable detail tables', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain('data-summary-card="total-outstanding"');
    expect(html).toContain('setupSummaryCardToggles()');
    expect(html).toContain('toggleSummaryCardDetail(card.dataset.summaryCard)');
    expect(html).toContain('renderSummaryCardDetail(cardName)');
    expect(html).toContain('div.dataset.staffId = String(member.id)');
    expect(html).toContain('class="staff-name-toggle"');
    expect(html).toContain('toggleStaffDetail(member, div)');
    expect(html).toContain('renderStaffMassageTable(member)');
    expect(html).toContain('admin-staff-massage-table');
    expect(html).toContain('admin-staff-total-row');
    expect(html).toContain('ฐาน');
    expect(html).toContain('ค่าจอง');
    expect(html).toContain('รวม');
  });

  test('admin staff route includes bounded weekly massage rows with booking credit values', () => {
    const route = read('backend/routes/admin.js');

    expect(route).toContain('const weeklyTransactions = await database.all');
    expect(route).toContain('LEFT JOIN booking_credits bc');
    expect(route).toContain('booking_credit_amount');
    expect(route).toContain('this_week_transactions');
    expect(route).toContain('weeklyTransactionsByStaff');
  });

  test('payday table header is compact and Thai-first', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain('<span class="label-th">พนักงาน</span>');
    expect(html).toContain('<span class="label-en">Staff</span>');
    expect(html).toContain('<span class="label-th">ค้างจ่าย</span>');
    expect(html).toContain('<span class="label-th">สถานะ</span>');
    expect(html).toContain('<span class="label-th">งานสัปดาห์นี้</span>');
    expect(html).toContain('<span class="label-th">จ่ายล่าสุด</span>');
    expect(html).toContain('<span class="label-th">จัดการ</span>');
    expect(html).toContain('.staff-grid.header .label-th');
    expect(html).toContain('.staff-grid.header .label-en');
  });

  test('staff detail dynamic transaction strings are escaped before table rendering', () => {
    const html = read('web-app/admin-staff.html');

    expect(html).toContain('escapeAdminStaffHtml(transaction.service_type ||');
    expect(html).toContain('escapeAdminStaffHtml(formatAdminStaffTransactionTime(transaction))');
    expect(html).toContain('toggleStaffDetail(member, div)');
    expect(html).toContain('toggleButton.setAttribute(\'aria-expanded\'');
  });
});
