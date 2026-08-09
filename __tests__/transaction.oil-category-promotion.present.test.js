/* eslint-env jest */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('New Customer Oil/Aroma sub-button contract', () => {
  const templates = ['web-app/transaction.html', 'web-app/transaction.ejs'];

  test.each(templates)('%s opens a sub-panel for multi-variant categories instead of auto-selecting a preferred name', (template) => {
    const source = read(template);

    // The old auto-select-by-hardcoded-preference logic must be gone.
    // These strings pinned the pre-ISVSB behavior where tapping Oil forced 'Oil massage'
    // and made Deep oil unreachable. See ISVSB-UI-001 in
    // 00-project-docs/steps/intake-service-variant-sub-buttons-steps.md
    expect(source).not.toContain("oil: 'Oil massage'");
    expect(source).not.toMatch(/function getPreferredCategoryService/);
    expect(source).not.toMatch(/preferredServiceNames/);

    // The new sub-panel branch: any category resolving to >=2 services opens a sub-panel
    // (D-02 in the steps file). The exact expression may vary; the load-bearing predicate
    // must be a length >= 2 check inside the render loop.
    expect(source).toMatch(/\.length\s*>=\s*2/);

    // A sort helper for regular-first / Deep-last ordering must exist (FR-005).
    // Look for either a named helper OR the Deep-last discriminator in the source.
    expect(source).toMatch(/Deep\s+/);
    expect(source).toMatch(/startsWith\(['"]Deep\s['"]\)|deep|Deep\s*['"]?\)?\s*\?\s*1\s*:\s*-1/);
  });

  test.each(templates)('%s categorizes Coconut before Oil so "Coconut lovers - coconut oil massage" does not appear in the Oil sub-panel', (template) => {
    const source = read(template);

    // serviceCategoryDefinitions is a positional array; getServiceCategory uses .find(),
    // so the first matching category wins. "Coconut lovers - coconut oil massage" contains
    // both "oil" and "coconut" — coconut MUST come first so the Oil sub-panel does not
    // include it. This also fixes the pre-existing bug where the Coconut category button
    // was hidden because its only service was being stolen by Oil.
    const coconutIdx = source.indexOf("key: 'coconut'");
    const oilIdx = source.indexOf("key: 'oil'");
    expect(coconutIdx).toBeGreaterThan(-1);
    expect(oilIdx).toBeGreaterThan(-1);
    expect(coconutIdx).toBeLessThan(oilIdx);
  });

  test.each(templates)('%s exposes a sub-panel DOM element the render loop can toggle for any multi-variant category', (template) => {
    const source = read(template);

    // Either the existing #combo-service-panel is generalized (renamed to variant-*)
    // OR a sibling #variant-service-panel exists. In either case the render loop
    // must reference an id ending in -service-panel with a title and buttons container.
    expect(source).toMatch(/id="(variant|combo)-service-panel"/);
    expect(source).toMatch(/id="(variant|combo)-service-buttons"/);
  });
});
