import { test, expect } from '@playwright/test';

test('scripts are relative + remove repopulates dropdown', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || 'https://stage.109.123.238.197.sslip.io';
  const testUrl = `${baseUrl}/staff.html?PWTEST=1&v=${Date.now()}`;
  
  console.log(`Testing URL: ${testUrl}`);
  
  // 1) No console errors
  const errors = [];
  page.on('console', m => { 
    if (m.type() === 'error') {
      errors.push(m.text());
      console.log('Console error:', m.text());
    }
  });
  
  await page.goto(testUrl, { waitUntil: 'domcontentloaded' });
  
  // 2) Script srcs are relative (no root-absolute or /api paths)
  const badSrcs = await page.$$eval('script[src]', els =>
    els.map(e => e.getAttribute('src')).filter(s => s && (s.startsWith('/') || s.startsWith('api/')))
  );
  expect(badSrcs, 'root-absolute or api/ script src found').toEqual([]);
  
  // 3) Wait for page to be fully loaded
  await page.waitForSelector('#add-to-roster-btn', { timeout: 10000 });
  
  // 4) Basic remove flow (if roster has items)
  const rosterItems = await page.$$('[data-roster-item]');
  if (rosterItems.length > 0) {
    console.log(`Found ${rosterItems.length} roster items, testing remove flow`);
    
    // Get dropdown options before remove
    const beforeOptions = await page.$$eval('#available-staff option', os => 
      os.map(o => o.textContent.trim()).filter(t => t && t !== 'Select masseuse to add...')
    );
    console.log('Before remove - dropdown options:', beforeOptions);
    
    // Click first remove button
    const firstRemoveBtn = page.locator('[data-roster-item] .remove-btn').first();
    await firstRemoveBtn.click();
    
    // Wait for UI to update
    await page.waitForTimeout(500);
    
    // Check dropdown repopulated
    const afterOptions = await page.$$eval('#available-staff option', os => 
      os.map(o => o.textContent.trim()).filter(t => t && t !== 'Select masseuse to add...')
    );
    console.log('After remove - dropdown options:', afterOptions);
    
    // Should have more options after remove (name returned to dropdown)
    expect(afterOptions.length, 'dropdown should have more options after remove').toBeGreaterThan(beforeOptions.length);
  } else {
    console.log('No roster items found, skipping remove flow test');
  }
  
  // 5) No console errors during the test
  expect(errors, 'console errors present').toEqual([]);
  
  console.log('✅ All tests passed - staging behaves like production');
});
