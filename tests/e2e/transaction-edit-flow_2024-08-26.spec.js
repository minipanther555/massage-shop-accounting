const { test, expect } = require('@playwright/test');
const AuthHelper = require('./helpers/authHelper');
const TransactionPage = require('./page-objects/TransactionPage');
const SummaryPage = require('./page-objects/SummaryPage');

test.describe('Transaction Edit End-to-End Flow', () => {
  let authHelper;
  let transactionPage;
  let summaryPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page objects and helpers
    authHelper = new AuthHelper(page);
    transactionPage = new TransactionPage(page);
    summaryPage = new SummaryPage(page);

    // Capture browser console logs for debugging
    page.on('console', (msg) => {
      console.log(` BROWSER_LOG: ${msg.type()}: ${msg.text()}`);
    });

    // Login as manager before each test
    await authHelper.loginAs('manager');
  });

  test('should allow a manager to edit a past transaction from the summary page', async ({ page }) => {
    // Step 1: Discover available data from the transaction page UI
    console.log('🔄 Step 1: Discovering available data from the UI...');
    await transactionPage.navigate();
    await transactionPage.waitForPageLoad();

    // Get the first 3 available masseuses from the dropdown
    const masseuses = await page.locator('#masseuse option').allTextContents();
    const availableMasseuses = masseuses.filter(name => name !== 'Select Masseuse').slice(0, 3);
    expect(availableMasseuses.length).toBeGreaterThanOrEqual(3);
    console.log(`✅ Discovered masseuses: ${availableMasseuses.join(', ')}`);

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
    console.log('🔄 Step 2: Creating three distinct transactions...');

    // Create Transaction 1
    await transactionPage.fillTransactionData(transaction1Data);
    await transactionPage.submitTransaction();
    console.log(`✅ Transaction 1 created for ${transaction1Data.masseuse}`);

    // Create Transaction 2 (the one we will edit)
    // Need to re-navigate or reset the form if it doesn't auto-reset
    await transactionPage.navigate(); 
    await transactionPage.waitForPageLoad();
    await transactionPage.fillTransactionData(transaction2Data);
    await transactionPage.submitTransaction();
    console.log(`✅ Transaction 2 created for ${transaction2Data.masseuse}`);

    // Create Transaction 3
    await transactionPage.navigate();
    await transactionPage.waitForPageLoad();
    await transactionPage.fillTransactionData(transaction3Data);
    await transactionPage.submitTransaction();
    console.log(`✅ Transaction 3 created for ${transaction3Data.masseuse}`);

    // Step 3: Navigate to summary page to find the transactions
    console.log('🔄 Step 3: Navigating to summary page...');
    await summaryPage.navigate();
    await summaryPage.waitForTransactions();

    // Verify all three transactions exist
    await summaryPage.verifyTransactionExists(transaction1Data.masseuse);
    await summaryPage.verifyTransactionExists(transaction2Data.masseuse);
    await summaryPage.verifyTransactionExists(transaction3Data.masseuse);

    console.log('✅ All three transactions verified on summary page');

    // Step 4: Edit the second transaction
    console.log(`🔄 Step 4: Editing transaction for ${transaction2Data.masseuse}...`);
    await summaryPage.editTransaction(transaction2Data.masseuse);

    // Step 5: Verify we're in edit mode
    const isEditMode = await transactionPage.isInEditMode();
    expect(isEditMode).toBe(true);
    console.log('✅ Successfully entered edit mode');

    // Step 6: Modify the transaction (change payment method to Cash)
    console.log('🔄 Step 6: Modifying transaction payment method...');
    await transactionPage.selectPayment('Cash');
    await transactionPage.submitTransaction();
    console.log('✅ Transaction modification submitted successfully');

    // Step 7: Go back to summary page to verify the changes
    console.log('🔄 Step 7: Verifying changes on summary page...');
    await summaryPage.navigate();
    await summaryPage.waitForTransactions();

    // Step 8: Verify the transaction has been updated
    await summaryPage.verifyTransactionExists(transaction2Data.masseuse, {
      payment: 'Cash' // Should now show Cash
    });
    console.log(`✅ Transaction for ${transaction2Data.masseuse} updated successfully`);

    // Step 9: Verify other transactions are untouched
    await summaryPage.verifyTransactionExists(transaction1Data.masseuse, {
      payment: transaction1Data.payment
    });
    await summaryPage.verifyTransactionExists(transaction3Data.masseuse, {
      payment: transaction3Data.payment
    });

    console.log('✅ Other transactions remain unchanged');
    console.log('🎉 Transaction edit workflow test completed successfully!');
  });
});
