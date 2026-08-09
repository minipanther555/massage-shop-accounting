/* eslint-env jest */
/**
 * Runtime contract for the New Customer intake page's category → variant
 * sub-button flow (ISVSB-UI-001). Complements
 * transaction.oil-category-promotion.present.test.js which pins the source
 * shape; this test drives the real DOM: it loads transaction.html into
 * JSDOM, extracts the button-layer functions from the inline <script>,
 * populates the hidden <select id="service"> with a representative
 * fixture, and asserts what a real reception tap produces.
 *
 * See __tests__/transaction.variant-sub-buttons.present.test.md for the
 * assertions this pins and their tie to AC-001..AC-006.
 *
 * FRAGILITY NOTE: the script-extraction regex walks brace depth over the
 * inline <script>. Editing transaction.html in ways that reshape those
 * functions (e.g. converting them to arrow functions) will require the
 * extraction here to be updated. That trade-off is deliberate — the
 * alternative is losing runtime coverage until Playwright-based full-page
 * tests exist for this page, which they do not today.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web-app/transaction.html'), 'utf8');

function setupPage(services) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const { document } = window;

  // Populate the hidden <select id="service"> as updateServiceOptions() would,
  // so getAvailableServiceNames() reflects the test fixture.
  const serviceSelect = document.getElementById('service');
  serviceSelect.innerHTML = '<option value="">เลือกบริการ...</option>';
  const seenNames = new Set();
  services.forEach(s => {
    if (seenNames.has(s.name)) return;
    seenNames.add(s.name);
    const opt = document.createElement('option');
    opt.value = s.name;
    opt.textContent = s.name;
    serviceSelect.appendChild(opt);
  });

  // Ensure duration <select> exists and is empty (renderServiceButtons reads it).
  const durationSelect = document.getElementById('duration');
  durationSelect.innerHTML = '<option value="">เลือกระยะเวลา...</option>';

  // Extract the inline script body between the first <script> tag containing
  // 'serviceCategoryDefinitions' and its closing </script>.
  const scriptMatch = html.match(/<script>([\s\S]*?renderServiceButtons[\s\S]*?)<\/script>/);
  if (!scriptMatch) throw new Error('inline script with renderServiceButtons not found');
  const scriptBody = scriptMatch[1];

  // Build a scoped evaluator: expose only the functions we need under test.
  // The full script also calls loadData/appData etc; we extract the four
  // functions we care about by regexing them out, plus their helpers.
  const wanted = [
    'getServiceDisplayName',
    'getServiceThaiHint',
    'serviceCategoryDefinitions',
    'isComboService',
    'getServiceCategory',
    'sortComboServices',
    'sortVariantServices',
    'getAvailableServiceNames',
    'setActiveChoice',
    'selectServiceValue',
    'selectDurationValue',
    'selectPaymentValue',
    'renderButton',
    'openVariantPanel',
    'renderServiceButtons',
    'updateServiceButtonState',
    'renderDurationButtons',
    'updateDurationButtonState',
    'renderPaymentButtons',
    'updatePaymentButtonState',
  ];

  const functionBlocks = [];
  const constBlocks = [];
  wanted.forEach(name => {
    // Match either `function name(...)` or `const/let name = ...`.
    const fnRe = new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`, 'g');
    let m = fnRe.exec(scriptBody);
    if (m) {
      const start = m.index;
      // Balance braces starting at the opening `{`.
      const openBrace = scriptBody.indexOf('{', start);
      let depth = 1;
      let i = openBrace + 1;
      while (i < scriptBody.length && depth > 0) {
        const ch = scriptBody[i];
        if (ch === '{') depth += 1;
        else if (ch === '}') depth -= 1;
        i += 1;
      }
      functionBlocks.push(scriptBody.slice(start, i));
      return;
    }
    const constRe = new RegExp(`const\\s+${name}\\s*=\\s*`, 'g');
    m = constRe.exec(scriptBody);
    if (m) {
      // Find the matching semicolon at depth 0 (for arrays/objects).
      const start = m.index;
      let depth = 0;
      let i = m.index;
      while (i < scriptBody.length) {
        const ch = scriptBody[i];
        if (ch === '[' || ch === '(' || ch === '{') depth += 1;
        else if (ch === ']' || ch === ')' || ch === '}') depth -= 1;
        else if (ch === ';' && depth === 0) { i += 1; break; }
        i += 1;
      }
      constBlocks.push(scriptBody.slice(start, i));
    }
  });

  // Assemble the payload and eval in the window's global scope.
  const payload = `
    ${constBlocks.join('\n')}
    ${functionBlocks.join('\n')}
    window.__test = { renderServiceButtons, updateServiceButtonState, sortVariantServices, getServiceCategory, serviceCategoryDefinitions };
  `;
  window.eval(payload);

  return { window, document, api: window.__test };
}

describe('ISVSB-UI-001 runtime smoke — sub-panel opens for multi-variant categories', () => {
  const fixture = [
    { name: 'Thai Massage', location: 'In-Shop' },
    { name: 'Foot massage', location: 'In-Shop' },
    { name: 'Oil massage', location: 'In-Shop' },
    { name: 'Deep oil', location: 'In-Shop' },
    { name: 'Aroma massage', location: 'In-Shop' },
    { name: 'Deep aroma', location: 'In-Shop' },
    { name: 'Coconut lovers - coconut oil massage', location: 'In-Shop' },
    { name: 'Body Scrub', location: 'In-Shop' },
    { name: 'Body Scrub + oil massage', location: 'In-Shop' },
    { name: 'Foot + oil Massage', location: 'In-Shop' },
  ];

  test('Oil button opens a sub-panel with exactly Oil massage + Deep oil (no Coconut)', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    const oilButton = document.querySelector('[data-service-category="oil"]');
    expect(oilButton).toBeTruthy();
    oilButton.click();
    const panel = document.getElementById('variant-service-panel');
    const buttons = document.querySelectorAll('#variant-service-buttons [data-service-value]');
    expect(panel.hidden).toBe(false);
    const values = Array.from(buttons).map(b => b.getAttribute('data-service-value'));
    expect(values).toEqual(['Oil massage', 'Deep oil']); // regular first, Deep last
    expect(values).not.toContain('Coconut lovers - coconut oil massage');
  });

  test('Aroma button opens a sub-panel with exactly Aroma massage + Deep aroma', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    document.querySelector('[data-service-category="aroma"]').click();
    const values = Array.from(document.querySelectorAll('#variant-service-buttons [data-service-value]'))
      .map(b => b.getAttribute('data-service-value'));
    expect(values).toEqual(['Aroma massage', 'Deep aroma']);
  });

  test('Tapping a Deep sub-button sets #service.value and dispatches change', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    document.querySelector('[data-service-category="oil"]').click();
    const deepBtn = document.querySelector('[data-service-value="Deep oil"]');
    let changed = 0;
    document.getElementById('service').addEventListener('change', () => { changed += 1; });
    deepBtn.click();
    expect(document.getElementById('service').value).toBe('Deep oil');
    expect(changed).toBe(1);
  });

  test('Single-variant categories select on one tap and keep the sub-panel hidden', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    const thaiBtn = document.querySelector('[data-service-category="thai"]');
    thaiBtn.click();
    expect(document.getElementById('service').value).toBe('Thai Massage');
    expect(document.getElementById('variant-service-panel').hidden).toBe(true);
  });

  test('Coconut button now renders and single-taps (fixes pre-existing hidden-button bug)', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    const coconutBtn = document.querySelector('[data-service-category="coconut"]');
    expect(coconutBtn).toBeTruthy();
    coconutBtn.click();
    expect(document.getElementById('service').value).toBe('Coconut lovers - coconut oil massage');
  });

  test('Combo button still opens the sub-panel with combo services (regression guard)', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    document.querySelector('[data-service-category="combo"]').click();
    const values = Array.from(document.querySelectorAll('#variant-service-buttons [data-service-value]'))
      .map(b => b.getAttribute('data-service-value'));
    expect(values.length).toBeGreaterThanOrEqual(2);
    expect(values).toEqual(expect.arrayContaining(['Body Scrub + oil massage', 'Foot + oil Massage']));
  });

  test('Active state persists on both category button and sub-button after selection', () => {
    const { document, api } = setupPage(fixture);
    api.renderServiceButtons();
    document.querySelector('[data-service-category="oil"]').click();
    document.querySelector('[data-service-value="Deep oil"]').click();
    expect(document.querySelector('[data-service-category="oil"]').classList.contains('is-active')).toBe(true);
    expect(document.querySelector('[data-service-value="Deep oil"]').classList.contains('is-active')).toBe(true);
  });
});
