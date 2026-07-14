const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('home dashboard API/data contract', () => {
  const pages = ['web-app/index.html', 'web-app/index.ejs'];

  it.each(pages)('%s loads API-backed state before rendering dashboard widgets', (page) => {
    const source = read(page);

    expect(source).toContain('await loadData();');
    expect(source).toContain('await updateDashboard();');
    expect(source).toContain('await updateRecentActivity();');
    expect(source).toContain('await updatePaymentBreakdown();');
    expect(source).toContain('setInterval(async () => {');
  });

  it.each(pages)('%s escapes dynamic activity and payment labels rendered with innerHTML', (page) => {
    const source = read(page);

    expect(source).toContain('function escapeHomeHtml(value)');
    expect(source).toContain('const description = escapeHomeHtml(activity.description)');
    expect(source).toContain('const masseuse = escapeHomeHtml(activity.masseuse)');
    expect(source).toContain('${escapeHomeHtml(method)}');
  });

  it('keeps index.html and index.ejs mirrored for behavior-critical script', () => {
    const html = read('web-app/index.html');
    const ejs = read('web-app/index.ejs');

    const htmlScript = html.slice(html.indexOf('<script>'), html.indexOf('</script>', html.indexOf('<script>')));
    const ejsScript = ejs.slice(ejs.indexOf('<script>'), ejs.indexOf('</script>', ejs.indexOf('<script>')));

    expect(ejsScript).toBe(htmlScript);
  });
});
