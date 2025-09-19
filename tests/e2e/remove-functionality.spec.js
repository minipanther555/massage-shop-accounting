const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const URL = `${BASE}/staff.html?PWTEST=1&v=${Date.now()}`;

test('remove functionality works without console errors', async ({ page }) => {
  const consoleErrors = [];
  const pageErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      consoleErrors.push(msg.text());
      console.log('CONSOLE:', msg.type(), msg.text());
    }
  });
  
  page.on('pageerror', error => {
    pageErrors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  // Track requests
  const requests = [];
  page.on('request', req => {
    requests.push({
      method: req.method(),
      url: new URL(req.url()).pathname,
      timestamp: Date.now()
    });
  });

  await page.goto(URL);
  await page.waitForSelector('#available-staff', { timeout: 10000 });
  
  // Add a staff member first
  const firstOption = await page.$eval('#available-staff', sel => {
    const options = Array.from(sel.options);
    const first = options.find(o => o.value && o.value.trim());
    return first ? first.value : null;
  });
  
  expect(firstOption).toBeTruthy();
  await page.selectOption('#available-staff', firstOption);
  
  // Clear request log before add
  requests.length = 0;
  await page.click('#add-to-roster-btn');
  await page.waitForSelector('#roster-list .roster-item', { timeout: 5000 });
  
  console.log('Add requests:', requests.map(r => `${r.method} ${r.url}`));
  
  // Clear request log before remove
  requests.length = 0;
  
  // Click remove button
  const removeButton = await page.$('#roster-list .roster-item button[data-action="remove"]');
  expect(removeButton).toBeTruthy();
  
  await removeButton.click();
  await page.waitForTimeout(1000);
  
  console.log('Remove requests:', requests.map(r => `${r.method} ${r.url}`));
  
  // Check for critical errors
  const criticalErrors = [...consoleErrors, ...pageErrors].filter(err => 
    err.includes('ReferenceError') || 
    err.includes('allStaffCache') ||
    err.includes('rosterCache') ||
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
  
  // Verify request budget (should be ≤2 for remove)
  const removeRequests = requests.filter(r => 
    r.method === 'DELETE' && r.url.startsWith('/api/staff/roster/') ||
    r.method === 'GET' && r.url === '/api/staff/roster'
  );
  
  expect(removeRequests.length).toBeLessThanOrEqual(2);
  
  // Verify staff member reappears in dropdown
  const dropdownOptions = await page.$$eval('#available-staff option', opts => 
    opts.map(o => o.textContent.trim()).filter(t => t)
  );
  
  expect(dropdownOptions).toContain(firstOption);
});
