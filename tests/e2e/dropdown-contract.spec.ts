import { test, expect } from '@playwright/test';

test.describe('Dropdown Contract Tests', () => {
  test('dropdown set-difference contract', async ({ page }) => {
    // Navigate to staff page
    await page.goto('https://109.123.238.197.sslip.io/login.html');
    await page.selectOption('#username', 'manager');
    await page.fill('#password', 'manager456');
    await Promise.all([
      page.waitForNavigation(),
      page.click('#login-btn'),
    ]);
    await page.goto('https://109.123.238.197.sslip.io/staff.html');
    await page.waitForSelector('#add-to-roster-btn', { timeout: 30000 });

    // Add 3 staff members
    const staffOptions = await page.$$eval('#available-staff option', opts => 
      opts.map(o => ({ value: o.value, text: o.textContent })).filter(o => o.value)
    );
    
    for (let i = 0; i < 3 && i < staffOptions.length; i++) {
      await page.selectOption('#available-staff', staffOptions[i].value);
      await page.click('#add-to-roster-btn');
      await page.waitForTimeout(500);
    }

    // Verify roster has 3 members with labels 1, 2, 3
    const rosterItems = await page.$$eval('#roster-list .roster-item', items => 
      items.map(item => ({
        label: item.querySelector('.position-label')?.textContent,
        name: item.querySelector('.staff-name')?.textContent
      }))
    );
    
    expect(rosterItems).toHaveLength(3);
    expect(rosterItems.map(r => r.label)).toEqual(['1', '2', '3']);

    // Remove middle staff member (position 2)
    const removeBtn = page.locator('#roster-list .roster-item').nth(1).locator('button[data-action="remove"]');
    await removeBtn.click();
    await page.waitForTimeout(500);

    // Verify roster now has 2 members with labels 1, 2
    const updatedRosterItems = await page.$$eval('#roster-list .roster-item', items => 
      items.map(item => ({
        label: item.querySelector('.position-label')?.textContent,
        name: item.querySelector('.staff-name')?.textContent
      }))
    );
    
    expect(updatedRosterItems).toHaveLength(2);
    expect(updatedRosterItems.map(r => r.label)).toEqual(['1', '2']);

    // Verify dropdown includes the removed name
    const dropdownOptions = await page.$$eval('#available-staff option', opts => 
      opts.map(o => o.textContent).filter(text => text && text.trim())
    );
    
    // The removed staff member should be back in the dropdown
    const removedName = rosterItems[1].name;
    expect(dropdownOptions).toContain(removedName);

    // Verify no console errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('ReferenceError')) {
        consoleErrors.push(msg.text());
      }
    });
    
    expect(consoleErrors).toHaveLength(0);
  });

  test('request budget smoke test', async ({ page }) => {
    const requests: Array<{method: string, url: string, timestamp: number}> = [];
    
    // Intercept all requests
    page.on('request', request => {
      requests.push({
        method: request.method(),
        url: request.url(),
        timestamp: Date.now()
      });
    });

    // Navigate to staff page
    await page.goto('https://109.123.238.197.sslip.io/login.html');
    await page.selectOption('#username', 'manager');
    await page.fill('#password', 'manager456');
    await Promise.all([
      page.waitForNavigation(),
      page.click('#login-btn'),
    ]);
    await page.goto('https://109.123.238.197.sslip.io/staff.html');
    await page.waitForSelector('#add-to-roster-btn', { timeout: 30000 });

    // Clear any initial requests
    requests.length = 0;

    // Add 2 staff members
    const staffOptions = await page.$$eval('#available-staff option', opts => 
      opts.map(o => ({ value: o.value, text: o.textContent })).filter(o => o.value)
    );
    
    for (let i = 0; i < 2 && i < staffOptions.length; i++) {
      await page.selectOption('#available-staff', staffOptions[i].value);
      await page.click('#add-to-roster-btn');
      await page.waitForTimeout(500);
    }

    // Analyze requests
    const rosterRequests = requests.filter(r => r.url.includes('/api/staff/roster'));
    const putRequests = rosterRequests.filter(r => r.method === 'PUT');
    const getRequests = rosterRequests.filter(r => r.method === 'GET');
    const allStaffRequests = requests.filter(r => r.url.includes('/api/staff/allstaff'));

    // Assertions
    expect(putRequests).toHaveLength(2); // 2 PUT requests for 2 adds
    expect(getRequests.length).toBeLessThanOrEqual(2); // At most 2 GET requests
    expect(allStaffRequests).toHaveLength(0); // No AllStaff re-fetch after adds
  });
});
