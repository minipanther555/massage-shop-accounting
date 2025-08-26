import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login.html');
  await page.getByLabel('Username').selectOption('manager');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('manager456');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: '💳 Payment Types' }).click();
  await page.getByRole('button', { name: '➕ Add New Payment Type' }).click();
});