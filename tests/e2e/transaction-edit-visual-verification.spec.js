import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login.html');
  await page.getByLabel('Username').selectOption('manager');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('manager456');
  await page.getByRole('button', { name: 'Login' }).click();

  // --- Create a new transaction to be edited ---
  await page.getByRole('link', { name: '💳 New Transaction' }).click();
  
  // Add delays between dropdown selections to handle sequential loading
  await page.getByLabel('Masseuse Name:').selectOption('พี่วัน');
  await page.waitForTimeout(500);
  
  await page.getByLabel('Service Location:').selectOption('In-Shop');
  await page.waitForTimeout(500);
  
  await page.getByLabel('Service Type:').selectOption('Body Scrub + oil massage');
  await page.waitForTimeout(500);
  
  await page.getByLabel('Duration:').selectOption('90');
  await page.waitForTimeout(500);
  
  // Use a unique payment method to easily identify this transaction later
  const uniquePaymentMethod = `Cash-${Date.now()}`;
  // NOTE: This assumes the 'Cash' payment method exists. We need a dynamic way.
  // For now, we will assume it does and create a new one for uniqueness in test scope.
  // This is a placeholder for a more robust test data setup.
  // Let's find a real payment method from the list instead.
  
  // Just select the first available payment method
  await page.getByLabel('Payment Method:').selectOption('Cash');
  await page.waitForTimeout(500);
  
  await page.getByRole('button', { name: '💳 Submit Transaction' }).click();

  // --- Navigate to summary and find the transaction ---
  await page.getByRole('link', { name: '📊 Daily Summary' }).click();

  // Locate the original transaction row. We'll find it by looking for the service and masseuse.
  const originalTransactionRow = page.locator('.transaction-item', { 
    hasText: 'Body Scrub + oil massage' 
  }).filter({
    has: page.locator('div', { hasText: 'พี่วัน' })
  }).first();

  await expect(originalTransactionRow).toBeVisible();

  // --- Edit the transaction ---
  await originalTransactionRow.getByRole('button', { name: '✏️ Edit' }).click();
  
  // Wait for the edit form to be visible
  await page.waitForTimeout(1000);

  // Change the payment method with delay
  await page.getByLabel('Payment Method:').selectOption('Cash'); // Assuming 'Cash' exists
  await page.waitForTimeout(500);
  
  await page.getByRole('button', { name: '💳 Submit Transaction' }).click();

  // --- Verify the original transaction is now marked as edited ---
  await page.getByRole('link', { name: '📊 Daily Summary' }).click();

  // Wait for data to refresh
  await page.waitForTimeout(2000);

  // The original row should now have the 'edited-transaction' class.
  await expect(originalTransactionRow).toHaveClass(/edited-transaction/);
  
  // It should contain the (EDITED) badge.
  await expect(originalTransactionRow.locator('.edited-status-badge')).toBeVisible();

  // The edit button within the original row should now be disabled.
  await expect(originalTransactionRow.getByRole('button', { name: '✏️ Edit' })).toBeDisabled();
  
  // Additional styling verifications
  // Check if the text has strikethrough (CSS text-decoration: line-through)
  const hasStrikethrough = await originalTransactionRow.evaluate(el => {
    const style = window.getComputedStyle(el);
    return style.textDecoration.includes('line-through');
  });
  expect(hasStrikethrough).toBe(true);
  
  // Check if it has red background (CSS background-color)
  const hasRedBackground = await originalTransactionRow.evaluate(el => {
    const style = window.getComputedStyle(el);
    return style.backgroundColor.includes('rgb(255, 235, 238)') || style.backgroundColor.includes('#ffebee');
  });
  expect(hasRedBackground).toBe(true);
});