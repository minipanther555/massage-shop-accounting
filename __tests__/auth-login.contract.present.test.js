const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('login and auth contract', () => {
  it('login page composes branch-scoped usernames from branch and role selects', () => {
    const html = read('web-app/login.html');

    expect(html).toContain('id="branch-username"');
    expect(html).toContain('value="top_thai_49"');
    expect(html).toContain('value="top_thai_43"');
    expect(html).toContain('value="top_thai_33"');
    expect(html).toContain('value="top_thai_thonglor_9"');
    expect(html).toContain('const username = selectedRole && selectedBranch ? `${selectedRole}_${selectedBranch}` : \'\';');
    expect(html).toContain('const response = await api.login(username, password)');
    expect(html).not.toContain('reception123');
    expect(html).not.toContain('manager456');
  });

  it('auth user-info returns the stored displayName and reset-rate-limit is production blocked at the route', () => {
    const route = read('backend/routes/auth.js');

    expect(route).toContain('displayName: session.displayName');
    expect(route).not.toContain('displayName: session.username');
    expect(route).toContain("router.post('/reset-rate-limit'");
    expect(route).toContain("process.env.NODE_ENV === 'production'");
    expect(route).toContain("return res.status(403).json({ error: 'Rate limit reset not allowed in production' });");
  });

  it('rate-limit development bypass cannot run in production', () => {
    const limiter = read('backend/middleware/rate-limiter.js');

    expect(limiter).toContain("process.env.NODE_ENV !== 'production' && req.headers['x-dev-bypass'] === 'reset-rate-limit'");
  });

  it('auth docs keep branch login contract and avoid seed-password examples', () => {
    const doc = read('backend/routes/auth.md');

    expect(doc).toContain('reception_top_thai_49');
    expect(doc).toContain('manager_top_thai_thonglor_9');
    expect(doc).toContain('Do not show seed passwords in operator-facing UI or public documentation');
    expect(doc).toContain('<manager-password>');
  });
});
