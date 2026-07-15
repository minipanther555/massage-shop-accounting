const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('home dashboard API/data contract', () => {
  const pages = ['web-app/index.html', 'web-app/index.ejs'];

  it.each(pages)('%s loads API-backed state before rendering dashboard widgets', (page) => {
    const source = read(page);
    const refreshStart = source.indexOf('async function refreshHomeData()');
    const refreshEnd = source.indexOf('async function updateDashboard()', refreshStart);
    const refreshSource = source.slice(refreshStart, refreshEnd);

    expect(source).toContain('await refreshHomeData();');
    expect(refreshSource.indexOf('await loadData();')).toBeLessThan(refreshSource.indexOf('await updateDashboard();'));
    expect(refreshSource.indexOf('await loadData();')).toBeLessThan(refreshSource.indexOf('updateRecentActivity();'));
    expect(refreshSource.indexOf('await loadData();')).toBeLessThan(refreshSource.indexOf('await updatePaymentBreakdown();'));
    expect(source).toContain('setInterval(async () => {');
  });

  it.each(pages)('%s escapes dynamic activity and payment labels rendered with innerHTML', (page) => {
    const source = read(page);

    expect(source).toContain('function escapeHomeHtml(value)');
    expect(source).toContain('const description = escapeHomeHtml(activity.description)');
    expect(source).toContain('const masseuse = escapeHomeHtml(activity.masseuse)');
    expect(source).toContain('${escapeHomeHtml(method)}');
  });

  it.each(pages)('%s renders compact clickable dashboard drilldown cards', (page) => {
    const source = read(page);

    expect(source).toContain('home-dashboard-grid');
    expect(source).toContain('data-home-card="revenue"');
    expect(source).toContain('data-home-card="staff"');
    expect(source).toContain('data-home-card="expenses"');
    expect(source).toContain('aria-expanded="false"');
    expect(source).toContain('toggleHomeDetail(');
    expect(source).toContain('renderHomeRevenueDetail()');
    expect(source).toContain('renderHomeStaffDetail()');
    expect(source).toContain('renderHomeExpensesDetail()');
  });

  it.each(pages)('%s keeps manager navigation in the top navigation group', (page) => {
    const source = read(page);
    const topNavigationStart = source.indexOf('<div class="nav-buttons">');
    const dashboardStart = source.indexOf('<!-- Dashboard Overview -->');
    const topNavigation = source.slice(topNavigationStart, dashboardStart);

    expect(topNavigation).toContain('id="admin-navigation"');
    expect(topNavigation).toContain('/api/admin/staff-page');
    expect(topNavigation).toContain('/api/admin/services-page');
    expect(topNavigation).toContain('/api/admin/reports-page');
    expect(topNavigation).toContain('/api/admin/payment-types-page');
    expect(source).not.toContain('id="admin-section"');
  });

  it.each(pages)('%s renders truthful loading/error state and trusts date-scoped transaction state', (page) => {
    const source = read(page);

    expect(source).toContain('id="home-data-status"');
    expect(source).toContain("setHomeDataStatus('loading')");
    expect(source).toContain("setHomeDataStatus('error')");
    expect(source).toContain("setHomeDataStatus('success')");
    expect(source).not.toContain('transaction.date === today');
  });

  it.each(pages)('%s includes bookings in clickable Recent Activity detail', (page) => {
    const source = read(page);

    expect(source).toContain('let homeRecentBookings = []');
    expect(source).toContain('homeRecentBookings = await api.getUpcomingBookings();');
    expect(source).toContain("type: 'booking'");
    expect(source).toContain('div.dataset.activityIndex');
    expect(source).toContain('toggleHomeActivityDetail(activity, div)');
    expect(source).toContain('row.insertAdjacentElement(\'afterend\', detail)');
    expect(source).toContain('aria-expanded');
    expect(source).not.toContain('id="home-activity-detail"');
  });

  it.each(pages)('%s does not present future bookings as financial activity', (page) => {
    const source = read(page);
    const bookingBlockStart = source.indexOf("type: 'booking'");
    const bookingBlockEnd = source.indexOf("details: booking", bookingBlockStart);
    const bookingBlock = source.slice(bookingBlockStart, bookingBlockEnd);

    expect(bookingBlock).toContain('amount: null');
    expect(bookingBlock).not.toContain('amount: 50');
    expect(source).toContain('const amountLabel = activity.type === \'booking\'');
    expect(source).toContain("'ยังไม่ชำระ'");
  });

  it.each(pages)('%s exposes expandable payment rows and a Recent Activity show-more control', (page) => {
    const source = read(page);
    expect(source).toContain('home-payment-breakdown-row');
    expect(source).toContain('toggleHomePaymentBreakdown');
    expect(source).toContain('Show more');
    expect(source).toContain('homeRecentActivityLimit');
  });

  it.each(pages)('%s derives staff availability from the same live staff status list used by the detail', (page) => {
    const source = read(page);
    expect(source).toContain('getHomeStaffStatusRows()');
    expect(source).toContain('availableStaff = staffStatusRows.filter');
  });

  it.each(pages)('%s explains staff busy and booking-buffer times in receptionist language', (page) => {
    const source = read(page);
    expect(source).toContain('function getHomeStaffStatusMessage(staff)');
    expect(source).toContain('กำลังนวด · เริ่ม');
    expect(source).toContain('เว้น ${bufferMinutes} นาที');
    expect(source).toContain('รับลูกค้าใหม่ได้');
    expect(source).not.toContain('${state} · ${count} today');
  });

  it.each(pages)('%s escapes dynamic dashboard detail labels', (page) => {
    const source = read(page);

    expect(source).toContain('escapeHomeHtml(transaction.service)');
    expect(source).toContain('escapeHomeHtml(transaction.masseuse)');
    expect(source).toContain('escapeHomeHtml(staff.masseuse_name || staff.name)');
    expect(source).toContain('escapeHomeHtml(expense.description)');
  });

  it('keeps index.html and index.ejs mirrored for behavior-critical script', () => {
    const html = read('web-app/index.html');
    const ejs = read('web-app/index.ejs');

    const htmlScript = html.slice(html.indexOf('<script>'), html.indexOf('</script>', html.indexOf('<script>')));
    const ejsScript = ejs.slice(ejs.indexOf('<script>'), ejs.indexOf('</script>', ejs.indexOf('<script>')));

    expect(ejsScript).toBe(htmlScript);
  });
});
