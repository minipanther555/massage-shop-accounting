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
});

