const { expect } = require('@playwright/test');

class TransactionPage {
  constructor(page) {
    this.page = page;
    
    // Stable selectors
    this.selectors = {
      masseuse: '#masseuse',
      location: '#location',
      service: '#service',
      duration: '#duration',
      payment: '#payment',
      startTime: '#startTime',
      endTime: '#endTime',
      customerContact: '#customerContact',
      submitButton: 'button[type="submit"]',
      toast: '.toast',
      correctionBanner: '#correction-banner'
    };
  }

  async navigate() {
    await this.page.goto('/transaction.html');
  }

  async waitForPageLoad() {
    // THIS IS THE DEFINITIVE FIX.
    // We are now waiting for the VISIBLE RESULT of the async operation.
    // This waits for the SECOND <option> element to be attached to the DOM,
    // which proves the entire chain (API call -> JS processing -> DOM update) is complete.
    await expect(this.page.locator(`${this.selectors.masseuse} option`).nth(1)).toBeAttached({ timeout: 10000 });
    console.log('✅ Page Object: Dropdown is populated. Page is ready.');
  }

  async selectMasseuse(masseuseName) {
    // With the improved waitForPageLoad, this becomes a simple, reliable action.
    await this.page.selectOption(this.selectors.masseuse, masseuseName);
  }

  async selectLocation(locationName) {
    // This action triggers a CLIENT-SIDE filtering and re-population of the service dropdown.
    // There is NO network request.
    await this.page.selectOption(this.selectors.location, locationName);
    console.log(`✅ Page Object: Location selected "${locationName}".`);
  }

  async selectService(serviceName) {
    // We must wait for the service dropdown to be repopulated by the client-side logic
    // that runs after a location is selected. Waiting for our specific option to be attached
    // is the most reliable way to do this.
    await expect(this.page.locator(`${this.selectors.service} option[value="${serviceName}"]`)).toBeAttached({ timeout: 10000 });
    await this.page.selectOption(this.selectors.service, serviceName);
  }

  async selectDuration(durationValue) {
    // The value in the dropdown is the 'duration_minutes' from the API response.
    await this.page.selectOption(this.selectors.duration, { value: durationValue });
    
    // Wait for the end time to be calculated and populated
    await this.page.waitForFunction(
      (selector) => {
        const select = document.querySelector(selector);
        return select && select.options.length > 1;
      },
      this.selectors.endTime,
      { timeout: 10000 }
    );
  }

  async selectPayment(paymentMethod) {
    await this.page.selectOption(this.selectors.payment, paymentMethod);
  }

  async submitTransaction() {
    await this.page.click(this.selectors.submitButton);

    // Use a robust locator-based wait and assertion.
    // This will wait for the toast to appear and check its content in one step.
    await expect(this.page.locator(this.selectors.toast)).toContainText('Transaction submitted!', { timeout: 10000 });
    
    // It's good practice to wait for the toast to disappear to ensure the app is ready for the next action.
    await expect(this.page.locator(this.selectors.toast)).not.toBeVisible({ timeout: 10000 });
  }

  async isInEditMode() {
    try {
      await this.page.waitForSelector(this.selectors.correctionBanner, { 
        state: 'visible',
        timeout: 5000 
      });
      return true;
    } catch {
      return false;
    }
  }

  async fillTransactionData(data) {
    await this.selectMasseuse(data.masseuse);
    // Select Location FIRST to trigger the service dropdown population
    await this.selectLocation(data.location);
    await this.selectService(data.service);
    await this.selectDuration(data.duration);
    await this.selectPayment(data.payment);

    if (data.customerContact) {
      await this.page.fill(this.selectors.customerContact, data.customerContact);
    }
  }
}

module.exports = TransactionPage;
