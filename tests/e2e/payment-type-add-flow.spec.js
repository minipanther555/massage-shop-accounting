import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  // Listen for any uncaught exceptions in the browser console
  page.on('pageerror', exception => {
    console.error(`Uncaught exception: "${exception}"`);
  });

  await page.goto('http://localhost:3000/login.html');
  await page.getByLabel('Username').selectOption('manager');
  await page.getByRole('textbox', { name: 'Password' }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('manager456');
  await page.getByRole('button', { name: 'Login' }).click();

  // Wait for the admin-specific link to be visible before clicking
  const paymentTypesLink = page.getByRole('link', { name: '💳 Payment Types' });
  await expect(paymentTypesLink).toBeVisible();
  await paymentTypesLink.click();

  await page.getByRole('button', { name: '➕ Add New Payment Type' }).click();

  // CORRECT VERIFICATION: Based on the source code, clicking the button
  // should make the modal visible. We will wait for the modal's title to appear.
  const modalTitle = page.getByRole('heading', { name: 'Add New Payment Type' });
  await expect(modalTitle).toBeVisible();

  // Verify the modal container has the correct CSS to appear as a pop-up.
  const modalContainer = page.locator('#payment-type-modal');
  await expect(modalContainer).toHaveCSS('display', 'block');
  await expect(modalContainer).toHaveCSS('position', 'fixed');

  // --- Create a new Payment Type ---
  const newPaymentTypeName = `Test Payment ${Date.now()}`;
  await page.getByRole('textbox', { name: /payment method name/i }).fill(newPaymentTypeName);
  await page.getByRole('button', { name: 'Save Payment Type' }).click();

  // --- Verify it was created ---
  // The modal should close, and the new payment type should appear on the page.
  await expect(modalContainer).not.toBeVisible();
  await expect(page.getByRole('heading', { name: newPaymentTypeName })).toBeVisible();

  // --- Teardown: Clean up the created data ---
  // Find the new payment type card and click its deactivate button.
  const newPaymentCard = page.locator('.payment-type-card', { hasText: newPaymentTypeName });
  await newPaymentCard.getByRole('button', { name: 'Deactivate' }).click();

  // Confirm the deletion in the confirmation modal.
  const deleteModal = page.locator('#delete-modal');
  await expect(deleteModal).toBeVisible();
  await deleteModal.getByRole('button', { name: 'Deactivate' }).click();

  // Verify the item is now marked as inactive.
  await expect(deleteModal).not.toBeVisible();
  await expect(newPaymentCard.getByText('Inactive')).toBeVisible();
});