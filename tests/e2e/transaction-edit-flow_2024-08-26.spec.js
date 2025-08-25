const { test, expect } = require('@playwright/test');
const AuthHelper = require('./helpers/authHelper');
const TransactionPage = require('./page-objects/TransactionPage');
const { SummaryPage } = require('./page-objects/SummaryPage');
const LoginPage = require('./page-objects/LoginPage');

test.describe('Transaction Edit End-to-End Flow', () => {
  let authHelper;
  let transactionPage;
  let summaryPage;
  let loginPage;

  test.beforeEach(async ({ page }) => {
    // Initialize helpers and page objects
    loginPage = new LoginPage(page);
    authHelper = new AuthHelper(page, loginPage);
    transactionPage = new TransactionPage(page);
    summaryPage = new SummaryPage(page);

    // With CSRF disabled for the test environment, we only need to log in.
    await authHelper.loginAs('manager', 'manager456');
  });

  test('should allow a manager to edit a past transaction from the summary page', async ({ page }) => {
    // Step 1: Discover available data from the transaction page UI
    await transactionPage.navigate();
    await transactionPage.waitForPageLoad();

    // Get the first 3 available masseuses from the dropdown
    const masseuses = await page.locator('#masseuse option').allTextContents();
    const availableMasseuses = masseuses.filter(name => name !== 'Select Masseuse').slice(0, 3);
    expect(availableMasseuses.length).toBeGreaterThanOrEqual(3);

    // Dynamically create test data using discovered names
    const transaction1Data = {
      masseuse: availableMasseuses[0],
      location: 'In-Shop',
      service: 'Aroma massage',
      duration: '60',
      payment: 'Cash'
    };

    const transaction2Data = {
      masseuse: availableMasseuses[1],
      location: 'In-Shop',
      service: 'Back, Neck & shoulder',
      duration: '90',
      payment: 'Credit Card'
    };

    const transaction3Data = {
      masseuse: availableMasseuses[2],
      location: 'In-Shop',
      service: 'Foot massage',
      duration: '30',
      payment: 'QR Credit Pay'
    };

    // Step 2: Create three distinct transactions

    // Create Transaction 1
    await transactionPage.fillTransactionData(transaction1Data);
    await transactionPage.submitTransaction();

    // Create Transaction 2 (the one we will edit)
    await transactionPage.navigate(); 
    await transactionPage.waitForPageLoad();
    await transactionPage.fillTransactionData(transaction2Data);
    await transactionPage.submitTransaction();

    // Create Transaction 3
    await transactionPage.navigate();
    await transactionPage.waitForPageLoad();
    await transactionPage.fillTransactionData(transaction3Data);
    await transactionPage.submitTransaction();

    // Step 3: Navigate to summary page to find the transactions
    await summaryPage.navigate();

    // Verify all three newly created transactions exist
    await summaryPage.verifyTransactionExists(transaction1Data.masseuse);
    await summaryPage.verifyTransactionExists(transaction2Data.masseuse);
    await summaryPage.verifyTransactionExists(transaction3Data.masseuse);

    // Step 4: Edit the second transaction
    await summaryPage.editTransaction(transaction2Data.masseuse);

    // Step 5: Verify we're in edit mode
    const isEditMode = await transactionPage.isInEditMode();
    expect(isEditMode).toBe(true);

    // Step 6: Modify the transaction (change payment method to Cash)
    await transactionPage.selectPayment('Cash');
    await transactionPage.submitTransaction();

    // Step 7: Go back to summary page to verify the changes
    await summaryPage.navigate();

    // Step 8: Verify the transaction has been updated
    await summaryPage.verifyTransactionExists(transaction2Data.masseuse, {
      payment: 'Cash' // Should now show Cash
    });

    // Step 9: Verify other transactions are untouched
    await summaryPage.verifyTransactionExists(transaction1Data.masseuse, {
      payment: transaction1Data.payment
    });
    await summaryPage.verifyTransactionExists(transaction3Data.masseuse, {
      payment: transaction3Data.payment
    });

  });
});
