import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('http://localhost:3000/login.html');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('manager456');
  await page.getByRole('textbox', { name: 'Password' }).press('Enter');
  await page.getByRole('link', { name: '👥 Staff Roster' }).click();
  await page.getByRole('link', { name: '💳 New Transaction' }).click();
  await page.getByLabel('Masseuse Name:').selectOption('พี่วัน');
  await page.getByLabel('Service Location:').selectOption('Home Service');
  await page.getByLabel('Service Location:').selectOption('In-Shop');
  await page.getByLabel('Service Type:').selectOption('Body Scrub + oil massage');
  await page.getByLabel('Duration:').selectOption('90');
  await page.getByLabel('Payment Method:').selectOption('Bank Transfer');
  await page.getByRole('button', { name: '💳 Submit Transaction' }).click();
  await page.getByRole('link', { name: '📊 Daily Summary' }).click();
  await page.getByRole('button', { name: '✏️ Edit' }).click();
  await page.getByLabel('Service Location:').selectOption('In-Shop');
  await page.getByLabel('Service Type:').selectOption('Body Scrub + oil massage');
  await page.getByLabel('Duration:').selectOption('90');
  await page.getByLabel('Payment Method:').selectOption('Cash');
  await page.getByRole('button', { name: '💳 Submit Transaction' }).click();
  await page.getByRole('link', { name: '📊 Daily Summary' }).click();
});