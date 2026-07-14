const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('admin payment types page API/database contract', () => {
  it('loads and mutates payment types through shared api.js methods', () => {
    const html = read('web-app/admin-payment-types.html');
    const script = html.slice(html.indexOf('<script>'));

    expect(script).toContain('currentPaymentTypes = await api.getPaymentTypes()');
    expect(script).toContain('await api.createPaymentType(formData)');
    expect(script).toContain('await api.updatePaymentType(editingPaymentType.id, formData)');
    expect(script).toContain('await api.deletePaymentType(deletingPaymentType.id)');
    expect(script).not.toContain("fetch('/api/payment-types");
    expect(script).not.toContain('new APIClient()');
    expect(script).not.toContain('api.request(`/api/payment-types');
  });

  it('escapes database-provided payment type strings before rendering cards', () => {
    const html = read('web-app/admin-payment-types.html');

    expect(html).toContain('function escapePaymentTypeHtml(value)');
    expect(html).toContain('const methodName = escapePaymentTypeHtml(paymentType.method_name)');
    expect(html).toContain('const description = escapePaymentTypeHtml(paymentType.description)');
    expect(html).toContain('<h4>${methodName}</h4>');
    expect(html).toContain('<p class="description">${description}</p>');
  });

  it('exposes payment type admin wrappers in api.js', () => {
    const api = read('web-app/api.js');

    expect(api).toContain('async getPaymentTypes()');
    expect(api).toContain("return this.request('/payment-types');");
    expect(api).toContain('async createPaymentType(paymentTypeData)');
    expect(api).toContain('async updatePaymentType(paymentTypeId, paymentTypeData)');
    expect(api).toContain('async deletePaymentType(paymentTypeId)');
  });

  it('keeps payment type writes manager-gated on the backend', () => {
    const route = read('backend/routes/payment-types.js');

    expect(route).toContain("router.post('/', ...requireManagerAuth");
    expect(route).toContain("router.put('/:id', ...requireManagerAuth");
    expect(route).toContain("router.delete('/:id', ...requireManagerAuth");
    expect(route).toContain('DELETE FROM payment_methods WHERE id = ?');
  });
});
