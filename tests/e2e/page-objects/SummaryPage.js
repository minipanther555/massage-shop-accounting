const { expect } = require('@playwright/test');

class SummaryPage {
  constructor(page) {
    this.page = page;
    // Stable selectors
    this.selectors = {
      transactionList: '#all-transactions', // Corrected selector
      transactionItem: '.transaction-item',
      editButton: '.edit-btn',
    };
  }

  async navigate() {
    await this.page.goto('/summary.html');
    // Ensure the page has settled and all network activity is idle.
    await this.page.waitForLoadState('networkidle', { timeout: 15000 });
  }

  async findTransactionByMasseuse(masseuseName) {
    const transactionLocator = this.page.locator(`${this.selectors.transactionItem}:has-text("${masseuseName}")`);
    await expect(transactionLocator).toBeVisible({ timeout: 10000 });
    return transactionLocator;
  }

  async editTransaction(masseuseName) {
    const transactionLocator = await this.findTransactionByMasseuse(masseuseName);
    await transactionLocator.locator(this.selectors.editButton).click();
  }

  async verifyTransactionExists(masseuseName, expectedData = {}) {
    // Wait for the list container to be present first to ensure the page is ready.
    const listLocator = this.page.locator(this.selectors.transactionList);
    await expect(listLocator).toBeAttached({ timeout: 10000 });
    
    const transactionLocator = await this.findTransactionByMasseuse(masseuseName);

    // Verify the transaction contains expected data
    if (expectedData.service) {
      await expect(transactionLocator).toContainText(expectedData.service);
    }

    if (expectedData.payment) {
      await expect(transactionLocator).toContainText(expectedData.payment);
    }

    if (expectedData.amount) {
      await expect(transactionLocator).toContainText(expectedData.amount);
    }

    return transactionLocator;
  }
}

module.exports = { SummaryPage };
