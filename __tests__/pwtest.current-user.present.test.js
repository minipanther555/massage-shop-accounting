/* eslint-env jest */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function loadSharedWithStoredUser(storedUser, { search = '', cookie = '' } = {}) {
  const store = new Map();
  if (storedUser !== undefined) {
    store.set('currentUser', JSON.stringify(storedUser));
  }

  const context = {
    console,
    setInterval: jest.fn(),
    setTimeout: jest.fn(),
    localStorage: {
      getItem: jest.fn((key) => store.get(key) || null),
      setItem: jest.fn((key, value) => store.set(key, value)),
      removeItem: jest.fn((key) => store.delete(key))
    },
    document: {
      cookie,
      getElementById: jest.fn(() => null),
      createElement: jest.fn(() => ({ className: '', textContent: '' })),
      body: { appendChild: jest.fn() }
    },
    location: { search },
    window: {}
  };
  context.window = context;

  vm.runInNewContext(read('web-app/shared.js'), context, { filename: 'web-app/shared.js' });
  return context;
}

describe('PWTEST current user display contract', () => {
  test('getCurrentUser repairs stale preview users so headers do not render undefined', () => {
    const context = loadSharedWithStoredUser({ username: 'pwtest' });

    expect(context.getCurrentUser()).toEqual(expect.objectContaining({
      username: 'pwtest',
      role: 'manager',
      displayName: 'PW Test Manager'
    }));
  });

  test('getCurrentUser creates the preview user when PWTEST is active on a fresh port', () => {
    const context = loadSharedWithStoredUser(undefined, { search: '?PWTEST=1' });

    expect(context.getCurrentUser()).toEqual(expect.objectContaining({
      username: 'pwtest',
      role: 'manager',
      displayName: 'PW Test Manager'
    }));
    expect(context.localStorage.setItem).toHaveBeenCalledWith(
      'currentUser',
      expect.stringContaining('"role":"manager"')
    );
  });

  test('Staff page PWTEST shim stores the complete preview user shape', () => {
    const source = read('web-app/staff.html');

    expect(source).toContain("username: 'pwtest'");
    expect(source).toContain("role: 'manager'");
    expect(source).toContain("displayName: 'PW Test Manager'");
  });
});
