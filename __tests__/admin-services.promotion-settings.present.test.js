/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Services & Pricing time-window manager controls', () => {
  test('manager page exposes a dedicated promotion settings panel', () => {
    const source = read('web-app/admin-services.html');
    expect(source).toContain('id="time-window-promotion-settings"');
    expect(source).toContain('id="promotion-enabled"');
    expect(source).toContain('id="promotion-start-time"');
    expect(source).toContain('id="promotion-end-time"');
    expect(source).toContain('id="promotion-grace-minutes"');
    expect(source).toContain('async function loadPromotionSettings()');
    expect(source).toContain('async function savePromotionSettings(event)');
  });

  test('shared API and service route keep promotion writes manager-only', () => {
    const api = read('web-app/api.js');
    const route = read('backend/routes/services.js');
    expect(api).toContain('async getPromotionSettings()');
    expect(api).toContain('async updatePromotionSettings(settings)');
    expect(route).toContain("router.get('/promotion-settings', ...requireManagerAuth");
    expect(route).toContain("router.put('/promotion-settings', ...requireManagerAuth");
    expect(route.indexOf("router.get('/promotion-settings'"))
      .toBeLessThan(route.indexOf("router.get('/:id'"));
  });
});
