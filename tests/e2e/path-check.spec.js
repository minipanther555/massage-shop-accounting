import { test, expect } from '@playwright/test';

// Pages we must verify (adjust if you have a layout/template)
const PAGES = ['/staff.html'];

test('all CSS/JS assets load with 200 + correct MIME, not routed via /api', async ({ page }) => {
  for (const path of PAGES) {
    const [resp] = await Promise.all([
      page.waitForResponse(r => r.url().includes(path) && r.status() === 200),
      page.goto(path + `?v=${Date.now()}`)
    ]);
    expect(resp.ok()).toBeTruthy();

    // Observe all network; assert constraints
    const bad = [];
    page.on('response', async (r) => {
      const url = r.url();
      const ok = r.ok();
      
      // Only check static assets (CSS/JS files), not API calls
      if (url.endsWith('.css') || url.endsWith('.js')) {
        if (!ok) bad.push(`Non-200: ${url} (${r.status()})`);
        if (url.includes('/api/')) bad.push(`Asset under /api/: ${url}`);
        
        if (url.endsWith('.css')) {
          const ct = (r.headers()['content-type'] || '').toLowerCase();
          if (!ct.includes('text/css')) bad.push(`Wrong MIME for CSS: ${url} -> ${ct}`);
        }
        if (url.endsWith('.js')) {
          const ct = (r.headers()['content-type'] || '').toLowerCase();
          if (!ct.includes('javascript') && !ct.includes('text/javascript') && !ct.includes('application/javascript')) {
            bad.push(`Wrong MIME for JS: ${url} -> ${ct}`);
          }
        }
      }
    });

    // Give the page some time to pull assets
    await page.waitForTimeout(800);
    expect(bad, bad.join('\n')).toHaveLength(0);
  }
});
