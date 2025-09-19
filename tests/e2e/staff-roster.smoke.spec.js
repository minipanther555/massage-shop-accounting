const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const URL = `${BASE}/staff.html?PWTEST=1&v=${Date.now()}`;

// Helper to add cache-busting to any URL
function addCacheBust(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${Date.now()}`;
}

test('add/remove keeps dropdown = AllStaff - Roster and labels 1..n', async ({ page }) => {
  await page.goto(URL);
  // wait for controller beacon if you have one; otherwise wait for dropdown present
  await page.waitForSelector('#available-staff');

  // capture initial sizes
  const initialOptions = await page.$$eval('#available-staff option', opts => 
    opts.map(o => o.textContent.trim()).filter(text => text && text !== '—')
  );
  expect(initialOptions.length).toBeGreaterThan(0);

  // pick first available staff
  const first = initialOptions[0];
  await page.selectOption('#available-staff', { label: first });
  await page.click('#add-to-roster-btn');

  // expect roster has 1 item labeled "1"
  await page.waitForSelector('#roster-list .roster-item');
  const labels1 = await page.$$eval('#roster-list .roster-item .position-label', els => 
    els.map(e => e.textContent.trim())
  );
  expect(labels1).toEqual(['1']);

  // removed name should disappear from dropdown
  const optionsAfterAdd = await page.$$eval('#available-staff option', opts => 
    opts.map(o => o.textContent.trim()).filter(text => text && text !== '—')
  );
  expect(optionsAfterAdd).not.toContain(first);

  // remove that item
  await page.click('#roster-list .roster-item button[data-action="remove"]');

  // removed name should reappear
  const optionsAfterRemove = await page.$$eval('#available-staff option', opts => 
    opts.map(o => o.textContent.trim()).filter(text => text && text !== '—')
  );
  expect(optionsAfterRemove).toContain(first);

  // labels should be 1..n (here n=0)
  const labels2 = await page.$$eval('#roster-list .roster-item .position-label', els => 
    els.map(e => e.textContent.trim())
  );
  expect(labels2).toEqual([]);
});

test('request budget: 1 PUT + 1 GET per add, no GET /allstaff on add', async ({ page }) => {
  await page.route('**/*', route => route.continue());
  const calls = [];
  page.on('request', req => calls.push({ 
    method: req.method(), 
    url: new URL(req.url()).pathname 
  }));

  await page.goto(URL);
  await page.waitForSelector('#available-staff');

  const first = await page.$eval('#available-staff', sel => {
    const o = Array.from(sel.options).find(o => o.value && o.value !== '');
    return o ? o.textContent.trim() : null;
  });
  await page.selectOption('#available-staff', { label: first });
  calls.length = 0;  // reset after page load noise
  await page.click('#add-to-roster-btn');
  await page.waitForSelector('#roster-list .roster-item');

  const getsRoster = calls.filter(c => c.method === 'GET' && c.url === '/api/staff/roster').length;
  const puts = calls.filter(c => c.method === 'PUT' && c.url.startsWith('/api/staff/roster/')).length;
  const getsAll = calls.filter(c => c.method === 'GET' && c.url === '/api/staff/allstaff').length;

  // STRICT: Fail if request budget exceeds 2 requests per add
  const totalRequests = calls.length;
  expect(totalRequests).toBeLessThanOrEqual(2);
  expect(puts).toBe(1);
  expect(getsRoster).toBeGreaterThanOrEqual(0).toBeLessThanOrEqual(1); // allow 0–1 per your policy
  expect(getsAll).toBe(0);
});

test('no console errors during add/remove operations', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push(error.message);
  });

  await page.goto(URL);
  await page.waitForSelector('#available-staff');

  // Add a staff member
  const first = await page.$eval('#available-staff', sel => {
    const o = Array.from(sel.options).find(o => o.value && o.value !== '');
    return o ? o.textContent.trim() : null;
  });
  await page.selectOption('#available-staff', { label: first });
  await page.click('#add-to-roster-btn');
  await page.waitForSelector('#roster-list .roster-item');

  // Remove the staff member
  await page.click('#roster-list .roster-item button[data-action="remove"]');
  await page.waitForTimeout(500);

  // Check for critical errors that would break functionality
  const criticalErrors = [...consoleErrors, ...pageErrors].filter(err => 
    err.includes('ReferenceError') || 
    err.includes('allStaffCache') ||
    err.includes('TypeError') ||
    err.includes('429') ||
    err.includes('csrf')
  );
  
  if (criticalErrors.length > 0) {
    console.log('Critical errors found:', criticalErrors);
    console.log('All console errors:', consoleErrors);
    console.log('All page errors:', pageErrors);
  }
  
  expect(criticalErrors).toHaveLength(0);
});

test('staging version endpoint works', async ({ page }) => {
  const healthUrl = addCacheBust(`${BASE}/api/_health`);
  const response = await page.goto(healthUrl);
  expect(response.status()).toBe(200);
  
  const health = await response.json();
  expect(health.ok).toBe(true);
  expect(health.version).toBeDefined();
  expect(health.timestamp).toBeDefined();
});

test('staging version file accessible', async ({ page }) => {
  const versionUrl = addCacheBust(`${BASE}/_stage_version.json`);
  const response = await page.goto(versionUrl);
  expect(response.status()).toBe(200);
  
  const version = await response.json();
  expect(version.stamp).toBeDefined();
  expect(version.ts).toBeDefined();
});
