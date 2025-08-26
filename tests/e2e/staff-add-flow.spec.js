import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login.html');
  await page.getByLabel('Username').selectOption('manager');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('manager456');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('link', { name: '👥 Staff Administration' }).click();
  await page.getByRole('button', { name: '➕ Add New Staff' }).click();

  // Verify the modal appears correctly
  const modalTitle = page.getByRole('heading', { name: 'Add New Staff Member' });
  await expect(modalTitle).toBeVisible();
  const modalContainer = page.locator('#staff-modal');
  await expect(modalContainer).toHaveCSS('display', 'block');

  await page.getByRole('textbox', { name: 'Staff Name:' }).click();
  await page.getByRole('textbox', { name: 'Staff Name:' }).fill('test');
  await page.getByRole('textbox', { name: 'Hire Date:' }).fill('2025-08-26');
  await page.getByRole('textbox', { name: 'Notes:' }).click();
  await page.getByRole('textbox', { name: 'Notes:' }).click();
  await page.getByRole('textbox', { name: 'Notes:' }).fill('test');
  await page.getByRole('button', { name: 'Save Staff Member' }).click();
});