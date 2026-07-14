const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin Users page contract', () => {
  test('uses real APIClient user list methods and no fake add-user workflow', () => {
    const html = read('web-app/admin-users.html');

    expect(html).toContain('api.getUsers()');
    expect(html).toContain('api.getUsersByLocation(locationId)');
    expect(html).not.toContain('apiCall(');
    expect(html).not.toContain('addUserForm');
    expect(html).not.toContain('showAddUserModal');
    expect(html).not.toContain('User creation endpoint not yet implemented');
  });

  test('renders returned user fields through DOM text assignment', () => {
    const html = read('web-app/admin-users.html');

    expect(html).toContain('function createUserCard(user)');
    expect(html).toContain('title.textContent = user.displayName');
    expect(html).toContain('role.textContent = user.role');
    expect(html).toContain('location.textContent = user.location_name');
    expect(html).not.toMatch(/card\.innerHTML\s*=/);
  });

  test('derives location filter options from returned users', () => {
    const html = read('web-app/admin-users.html');

    expect(html).toContain('function populateLocationFilter(users)');
    expect(html).toContain('user.location_id');
    expect(html).not.toContain('<option value="1">Main Branch</option>');
    expect(html).not.toContain('<option value="2">Downtown</option>');
    expect(html).not.toContain('<option value="3">Suburban</option>');
  });

  test('admin router serves the users page behind manager middleware', () => {
    const router = read('backend/routes/admin.js');

    expect(router).toContain('router.use(authenticateToken)');
    expect(router).toContain("router.use(authorizeRole('manager'))");
    expect(router).toContain("router.get('/users-page'");
    expect(router).toContain("web-app', 'admin-users.html'");
  });

  test('api client exposes auth user list methods', () => {
    const api = read('web-app/api.js');

    expect(api).toContain('async getUsers()');
    expect(api).toContain("return this.request('/auth/users')");
    expect(api).toContain('async getUsersByLocation(locationId)');
    expect(api).toContain('/auth/users/location/');
  });
});

