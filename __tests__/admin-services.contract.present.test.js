const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('admin services page API/database contract', () => {
  it('loads and mutates services through the shared CSRF-aware API client', () => {
    const html = read('web-app/admin-services.html');
    const script = html.slice(html.indexOf('<script>'));

    expect(script).toContain('api.getServices({ includeInactive: true })');
    expect(script).toContain('api.createService(serviceData)');
    expect(script).toContain('api.updateService(serviceId, serviceData)');
    expect(script).toContain('api.updateService(serviceId, { active: newStatus })');
    expect(script).toContain('api.deleteService(serviceId)');
    expect(script).not.toContain("fetch('/api/services");
    expect(script).not.toContain('fetch(`/api/services/${serviceId}`');
  });

  it('escapes service database strings rendered through innerHTML templates', () => {
    const html = read('web-app/admin-services.html');

    expect(html).toContain('function escapeServiceHtml(value)');
    expect(html).toContain('const serviceName = escapeServiceHtml(service.service_name)');
    expect(html).toContain('const location = escapeServiceHtml(service.location)');
    expect(html).toContain('<h3>${escapeServiceHtml(service.service_name)}</h3>');
    expect(html).toContain('<p><strong>Location:</strong> ${escapeServiceHtml(service.location)}</p>');
  });

  it('exposes service update/delete/bulk wrappers in api.js', () => {
    const api = read('web-app/api.js');

    expect(api).toContain('async getServices(options = {})');
    expect(api).toContain("options.includeInactive ? '?includeInactive=true' : ''");
    expect(api).toContain('async updateService(serviceId, serviceData)');
    expect(api).toContain('async deleteService(serviceId)');
    expect(api).toContain('async bulkUpdateServices(updateData)');
    expect(api).toContain("this.request('/services/bulk/update'");
  });

  it('registers /bulk/update before /:id so Express does not treat bulk as an id', () => {
    const route = read('backend/routes/services.js');

    const bulkIndex = route.indexOf("router.patch('/bulk/update'");
    const idIndex = route.indexOf("router.patch('/:id'");

    expect(bulkIndex).toBeGreaterThan(-1);
    expect(idIndex).toBeGreaterThan(-1);
    expect(bulkIndex).toBeLessThan(idIndex);
    expect(route).not.toContain("console.log('🔍 DEBUG");
  });
});
