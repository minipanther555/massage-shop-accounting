import { test, expect } from '@playwright/test';

test('debug add operation', async ({ page }) => {
  const consoleMessages = [];
  page.on('console', msg => consoleMessages.push(`${msg.type()}: ${msg.text()}`));

  await page.goto(`${process.env.BASE_URL}/staff.html?PWTEST=1&v=${Date.now()}`, { waitUntil: 'networkidle' });

  // Wait for controller readiness
  await expect.poll(async () => page.evaluate(() => window.__staffTest?.ready === true)).toBe(true);

  // Check if dropdown has options
  const dropdown = page.locator('#available-staff');
  await expect(dropdown).toBeVisible();
  
  const optionCount = await dropdown.locator('option').count();
  console.log('Dropdown option count:', optionCount);
  
  if (optionCount > 1) { // More than just the placeholder
    // Try to select the first real option
    const firstOption = dropdown.locator('option').nth(1); // Skip placeholder
    const optionText = await firstOption.textContent();
    console.log('First option text:', optionText);
    
    // Use selectOption instead of clicking
    await dropdown.selectOption({ index: 1 });
    
    // Try to click add button
    const addButton = page.locator('#add-to-roster-btn');
    await expect(addButton).toBeVisible();
    console.log('Add button visible, clicking...');
    
    await addButton.click();
    
    // Wait a bit and check for errors
    await page.waitForTimeout(1000);
    
    console.log('Console messages after add:', consoleMessages.filter(m => m.includes('🔧') || m.includes('Error') || m.includes('error')));
    
    // Check if lastOp was set
    const lastOp = await page.evaluate(() => window.__staffTest?.lastOp);
    console.log('LastOp after add:', lastOp);
  }
});
