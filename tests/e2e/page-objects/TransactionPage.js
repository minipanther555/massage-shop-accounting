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
    // This is the key fix. We wait for the network calls initiated by loadData() to complete.
    // This is a reliable way to know the async data loading and dropdown population is finished.
    await this.page.waitForResponse(resp => resp.url().includes('/api/staff/roster') && resp.status() === 200);
    await this.page.waitForResponse(resp => resp.url().includes('/api/services') && resp.status() === 200);
    console.log('✅ Page Object: All critical network requests for page load have completed.');
  }

  async selectMasseuse(masseuseName) {
    // With the improved waitForPageLoad, we no longer need a complex waitForFunction here.
    // By the time we call this, the options should already be in the DOM.
    await this.page.selectOption(this.selectors.masseuse, masseuseName);
  }

  async selectLocation(locationName) {
    await this.page.selectOption(this.selectors.location, locationName);
    
    // Wait for the service dropdown to be populated as a result
    await this.page.waitForFunction(
      (selector) => {
        const select = document.querySelector(selector);
        return select && select.options.length > 1; // More than just the default option
      },
      this.selectors.service,
      { timeout: 10000 }
    );
  }

  async selectService(serviceName) {
    // Wait for the specific service option to be available
    await this.page.waitForFunction(
      (selector, name) => {
        const select = document.querySelector(selector);
        return select && Array.from(select.options).some(option => option.value === name);
      },
      this.selectors.service,
      serviceName,
      { timeout: 10000 }
    );
    
    await this.page.selectOption(this.selectors.service, serviceName);
    
    // Wait for the duration dropdown to be populated
    await this.page.waitForFunction(
      (selector) => {
        const select = document.querySelector(selector);
        return select && select.options.length > 1;
      },
      this.selectors.duration,
      { timeout: 10000 }
    );
  }

  async selectDuration(durationValue) {
    await this.page.selectOption(this.selectors.duration, durationValue);
    
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
    
    // Wait for the success toast to appear
    await this.page.waitForSelector(this.selectors.toast, { 
      state: 'visible',
      timeout: 10000 
    });
    
    // Wait for the toast to contain success message
    await this.page.waitForFunction(
      (selector) => {
        const toast = document.querySelector(selector);
        return toast && toast.textContent.includes('Transaction submitted!');
      },
      this.selectors.toast,
      { timeout: 10000 }
    );
    
    // Wait for the toast to disappear
    await this.page.waitForSelector(this.selectors.toast, { 
      state: 'hidden',
      timeout: 15000 
    });
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
