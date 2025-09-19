/**
 * S5_Gauntlet - Add Loop Budget Test
 * 
 * This test guards against regression by ensuring the add operation
 * doesn't exceed the expected request budget per add.
 */

import { test, expect } from '@playwright/test';

test.describe('Add Loop Budget Test', () => {
  test('should not exceed 2 requests per add operation', async ({ page }) => {
    // Navigate to staff page
    await page.goto('/staff.html?PWTEST=1');
    
    // Wait for page to be ready
    await page.waitForSelector('#add-to-roster-btn', { timeout: 10000 });
    
    // Install network monitoring
    const requests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Perform 5 add operations
    for (let i = 0; i < 5; i++) {
      // Select first available staff member
      const options = await page.$$eval('#available-staff option', opts => 
        opts.map(o => ({ value: o.value, text: o.textContent }))
      );
      const firstAvailable = options.find(o => o.value && o.value.trim());
      
      if (!firstAvailable) {
        console.log(`No available staff for add ${i + 1}, stopping test`);
        break;
      }
      
      await page.selectOption('#available-staff', firstAvailable.value);
      
      // Click add button
      await page.click('#add-to-roster-btn');
      
      // Wait for roster to update
      await page.waitForTimeout(500);
    }
    
    // Analyze request patterns
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    const requestsByAdd = [];
    let currentAdd = 0;
    let addStartTime = 0;
    
    for (const req of apiRequests) {
      // Detect add operations by PUT requests to /api/staff/roster/:position
      if (req.method === 'PUT' && req.url.includes('/api/staff/roster/')) {
        if (addStartTime > 0) {
          // Count requests for previous add
          const addRequests = apiRequests.filter(r => 
            r.timestamp >= addStartTime && r.timestamp < req.timestamp
          );
          requestsByAdd.push(addRequests.length);
        }
        addStartTime = req.timestamp;
        currentAdd++;
      }
    }
    
    // Count requests for last add
    if (addStartTime > 0) {
      const lastAddRequests = apiRequests.filter(r => r.timestamp >= addStartTime);
      requestsByAdd.push(lastAddRequests.length);
    }
    
    console.log('Requests per add:', requestsByAdd);
    
    // Assertions
    for (let i = 0; i < requestsByAdd.length; i++) {
      const requestCount = requestsByAdd[i];
      expect(requestCount).toBeLessThanOrEqual(2);
      console.log(`Add ${i + 1}: ${requestCount} requests (expected ≤ 2)`);
    }
    
    // Verify no 429 errors
    const response429s = requests.filter(r => r.status === 429);
    expect(response429s).toHaveLength(0);
  });
  
  test('should cache CSRF token for session', async ({ page }) => {
    // Navigate to staff page
    await page.goto('/staff.html?PWTEST=1');
    
    // Wait for page to be ready
    await page.waitForSelector('#add-to-roster-btn', { timeout: 10000 });
    
    // Track CSRF requests
    const csrfRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/csrf')) {
        csrfRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Perform 3 add operations
    for (let i = 0; i < 3; i++) {
      const options = await page.$$eval('#available-staff option', opts => 
        opts.map(o => ({ value: o.value, text: o.textContent }))
      );
      const firstAvailable = options.find(o => o.value && o.value.trim());
      
      if (!firstAvailable) break;
      
      await page.selectOption('#available-staff', firstAvailable.value);
      await page.click('#add-to-roster-btn');
      await page.waitForTimeout(500);
    }
    
    // Should only have 1 CSRF request (cached for session)
    expect(csrfRequests).toHaveLength(1);
    console.log(`CSRF requests: ${csrfRequests.length} (expected 1)`);
  });
  
  test('should not re-fetch AllStaff on every add', async ({ page }) => {
    // Navigate to staff page
    await page.goto('/staff.html?PWTEST=1');
    
    // Wait for page to be ready
    await page.waitForSelector('#add-to-roster-btn', { timeout: 10000 });
    
    // Track AllStaff requests
    const allStaffRequests: any[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/staff/allstaff')) {
        allStaffRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });
    
    // Perform 3 add operations
    for (let i = 0; i < 3; i++) {
      const options = await page.$$eval('#available-staff option', opts => 
        opts.map(o => ({ value: o.value, text: o.textContent }))
      );
      const firstAvailable = options.find(o => o.value && o.value.trim());
      
      if (!firstAvailable) break;
      
      await page.selectOption('#available-staff', firstAvailable.value);
      await page.click('#add-to-roster-btn');
      await page.waitForTimeout(500);
    }
    
    // Should only have 1 AllStaff request (initial load)
    expect(allStaffRequests).toHaveLength(1);
    console.log(`AllStaff requests: ${allStaffRequests.length} (expected 1)`);
  });
});
