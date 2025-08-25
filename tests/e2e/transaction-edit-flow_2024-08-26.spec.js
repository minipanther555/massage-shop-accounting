const { test, expect } = require('@playwright/test');

test.describe('Transaction Edit End-to-End Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Capture and log all browser console messages
    page.on('console', msg => {
      console.log(` BROWSER_LOG: ${msg.type()}: ${msg.text()}`);
    });

    // Navigate to the login page (uses baseURL from config)
    await page.goto('/login.html');

    // Fill in the login form
    await page.selectOption('#username', 'manager');
    await page.fill('#password', 'manager456');

    // Submit the form
    await page.click('#login-btn');

    // Wait for the main page to load
    await expect(page).toHaveURL('/index.html');
  });

  test('should allow a manager to edit a past transaction from the summary page', async ({ page }) => {
    // Step 1: Navigate to the transaction page to create the initial data
    await page.goto('/transaction.html');

    // --- Create Transaction 1 ---
    await page.selectOption('#masseuse', 'Alice'); 
    await page.selectOption('#location', 'In-Shop');
    await page.selectOption('#service', 'Thai Massage');
    await page.selectOption('#duration', '60');
    await page.selectOption('#payment', 'Cash');
    await page.click('button[type="submit"]');

    // Wait for a confirmation toast to appear and disappear, signaling completion
    await expect(page.locator('.toast-message')).toContainText('Transaction submitted!');
    await expect(page.locator('.toast-message')).not.toBeVisible({ timeout: 10000 });

    // --- Create Transaction 2 (The one we will edit) ---
    await page.selectOption('#masseuse', 'Bob');
    await page.selectOption('#location', 'In-Shop');
    await page.selectOption('#service', 'Oil Massage');
    await page.selectOption('#duration', '90');
    await page.selectOption('#payment', 'Credit Card');
    await page.click('button[type="submit"]');

    // Wait for confirmation
    await expect(page.locator('.toast-message')).toContainText('Transaction submitted!');
    await expect(page.locator('.toast-message')).not.toBeVisible({ timeout: 10000 });

    // --- Create Transaction 3 ---
    await page.selectOption('#masseuse', 'Charlie');
    await page.selectOption('#location', 'Home Service');
    await page.selectOption('#service', 'Foot Massage');
    await page.selectOption('#duration', '60');
    await page.selectOption('#payment', 'QR Code');
    await page.click('button[type="submit"]');

    // Wait for confirmation
    await expect(page.locator('.toast-message')).toContainText('Transaction submitted!');
    await expect(page.locator('.toast-message')).not.toBeVisible({ timeout: 10000 });

    // Step 2: Navigate to the summary page to find the transactions
    await page.goto('/summary.html');
    await expect(page.locator('#all-transactions')).toContainText('Bob');

    // Step 3: Find the transaction for "Bob" and click the Edit button
    const transactionToEdit = page.locator('.transaction-item:has-text("Bob")');
    await transactionToEdit.getByRole('button', { name: '✏️ Edit' }).click();

    // Step 4: Verify the page has entered edit mode
    await expect(page).toHaveURL('/transaction.html');
    await expect(page.locator('#correction-banner')).toContainText('EDIT MODE');

    // Step 5: Change the payment method and submit the correction
    await page.selectOption('#payment', 'Cash');
    await page.click('button[type="submit"]');

    // Wait for confirmation
    await expect(page.locator('.toast-message')).toContainText('Transaction submitted!');
    await expect(page.locator('.toast-message')).not.toBeVisible({ timeout: 10000 });

    // Step 6: Go back to the summary page to verify the changes
    await page.goto('/summary.html');

    // Step 7: Verify the transaction for "Bob" has been updated
    const updatedTransaction = page.locator('.transaction-item:has-text("Bob")');
    await expect(updatedTransaction).toBeVisible();
    await expect(updatedTransaction).toContainText('Cash');
    await expect(updatedTransaction).not.toContainText('Credit Card');

    // Step 8: Verify the other transactions are untouched
    const transaction1 = page.locator('.transaction-item:has-text("Alice")');
    await expect(transaction1).toContainText('Cash'); // Original was Cash

    const transaction3 = page.locator('.transaction-item:has-text("Charlie")');
    await expect(transaction3).toContainText('QR Code'); // Original was QR Code
  });
});
