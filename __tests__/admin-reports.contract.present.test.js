const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('admin reports page API/database contract', () => {
  it('loads filters and financial reports through shared api.js methods', () => {
    const html = read('web-app/admin-reports.html');
    const script = html.slice(html.indexOf('<script>'));

    expect(script).toContain('api.getReportStaff()');
    expect(script).toContain('api.getReportServiceTypes()');
    expect(script).toContain('api.getReportLocations()');
    expect(script).toContain('currentReports = await api.getFinancialReport({');
    expect(script).not.toContain("fetch('/api/");
    expect(script).not.toContain('fetch(`/api/');
    expect(script).not.toContain('new APIClient()');
  });

  it('uses explicit tab context and renders report strings through escaping', () => {
    const html = read('web-app/admin-reports.html');

    expect(html).toContain("onclick=\"setTimePeriod('today', this)\"");
    expect(html).toContain('function setTimePeriod(period, clickedTab = null)');
    expect(html).not.toContain('event.target.classList.add');
    expect(html).toContain('function escapeReportHtml(value)');
    expect(html).toContain('${escapeReportHtml(paymentType.payment_method)}');
    expect(html).toContain('${escapeReportHtml(service.serviceName)}');
    expect(html).toContain('${escapeReportHtml(staff.staffName)}');
  });

  it('keeps exports honest: CSV generates a file and PDF placeholder button is absent', () => {
    const html = read('web-app/admin-reports.html');

    expect(html).toContain("onclick=\"exportReport('csv')\"");
    expect(html).toContain('const blob = new Blob([csv]');
    expect(html).toContain('link.download = `financial-report-');
    expect(html).not.toContain("onclick=\"exportReport('pdf')\"");
    expect(html).not.toContain('function exportToPDF()');
  });

  it('financial endpoint applies location to transaction queries and returns staff breakdown', () => {
    const route = read('backend/routes/reports.js');

    expect(route).toContain("whereClause += ' AND t.location = ?'");
    expect(route).toContain('const staffBreakdown = await database.all');
    expect(route).toContain('t.masseuse_name as staffName');
    expect(route).toContain('staffBreakdown,');
    expect(route).toContain('GROUP BY t.location');
  });

  it('exposes report filter and financial wrappers in api.js', () => {
    const api = read('web-app/api.js');

    expect(api).toContain('async getFinancialReport(filters = {})');
    expect(api).toContain('async getReportStaff()');
    expect(api).toContain('async getReportServiceTypes()');
    expect(api).toContain('async getReportLocations()');
  });
});
