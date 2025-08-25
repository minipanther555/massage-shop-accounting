class SummaryPage {
  constructor(page) {
    this.page = page;
    
    // Stable selectors
    this.selectors = {
      allTransactions: '#all-transactions',
      transactionItem: '.transaction-item',
      editButton: 'button:has-text("✏️ Edit")',
      transactionRow: '.transaction-item:has-text("{text}")'
    };
  }

  async navigate() {
    await this.page.goto('/summary.html');
    
    // Wait for the page to load and transactions to be visible
    await this.page.waitForSelector(this.selectors.allTransactions, { 
      state: 'visible',
      timeout: 10000 
    });
  }

  async waitForTransactions() {
    // Wait for at least one transaction to be loaded
    await this.page.waitForSelector(this.selectors.transactionItem, { 
      state: 'visible',
      timeout: 10000 
    });
  }

  async findTransactionByMasseuse(masseuseName) {
    // Wait for the specific transaction to be visible
    const transactionLocator = this.page.locator(
      this.selectors.transactionRow.replace('{text}', masseuseName)
    );
    
    await transactionLocator.waitFor({ 
      state: 'visible',
      timeout: 10000 
    });
    
    return transactionLocator;
  }

  async editTransaction(masseuseName) {
    const transaction = await this.findTransactionByMasseuse(masseuseName);
    
    // Find the edit button within this transaction
    const editButton = transaction.locator(this.selectors.editButton);
    
    // Wait for the edit button to be visible and clickable
    await editButton.waitFor({ 
      state: 'visible',
      timeout: 10000 
    });
    
    await editButton.click();
    
    // Wait for navigation to transaction page
    await this.page.waitForURL('/transaction.html', { timeout: 10000 });
  }

  async verifyTransactionExists(masseuseName, expectedData = {}) {
    const transaction = await this.findTransactionByMasseuse(masseuseName);
    
    // Verify the transaction contains expected data
    if (expectedData.service) {
      await expect(transaction).toContainText(expectedData.service);
    }
    
    if (expectedData.payment) {
      await expect(transaction).toContainText(expectedData.payment);
    }
    
    if (expectedData.amount) {
      await expect(transaction).toContainText(expectedData.amount);
    }
    
    return transaction;
  }

  async getTransactionCount() {
    const transactions = this.page.locator(this.selectors.transactionItem);
    return await transactions.count();
  }
}

module.exports = SummaryPage;
