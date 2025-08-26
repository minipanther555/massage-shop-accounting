import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login.html');
  await page.getByLabel('Username').selectOption('manager');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('manager456');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: '💳 Payment Types' }).click();
  await page.locator('#payment-types-grid div').filter({ hasText: 'Test Frontend Active Testing' }).getByRole('button').nth(1).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
});