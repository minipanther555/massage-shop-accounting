// API client for backend communication
const API_BASE_URL = '/api';

class APIClient {
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
      mode: 'cors',
      credentials: 'include', // Enable cookies to be sent with requests
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // --- CSRF TOKEN HANDLING ---
    // For modifying requests, find and add the CSRF token from the page's meta tag.
    const isModifyingRequest = options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method.toUpperCase());
    if (isModifyingRequest) {
      const csrfTokenMeta = document.querySelector('meta[name="csrf-token"]');
      if (csrfTokenMeta) {
        const csrfToken = csrfTokenMeta.getAttribute('content');
        if (csrfToken && csrfToken !== '{{ an_actual_token }}') {
          config.headers['X-CSRF-Token'] = csrfToken;
          console.log('🚀 DEBUG: CSRF Token found and added to headers.');
        } else {
          console.warn('🚨 WARNING: CSRF meta tag found, but token is missing or is a placeholder.');
        }
      } else {
        console.warn(`🚨 WARNING: CSRF meta tag not found for modifying request to ${url}.`);
      }
    }
    // --- END CSRF TOKEN HANDLING ---

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      console.log(`🚀 DEBUG: Starting API request: ${config.method || 'GET'} ${url}`);
      console.log('🚀 DEBUG: Request config:', config);

      const response = await fetch(url, config);

      console.log(`🚀 DEBUG: Response received - Status: ${response.status} ${response.statusText}`);
      console.log('🚀 DEBUG: Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        console.log('🚀 DEBUG: Response not OK, attempting to parse error');
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status} - ${response.statusText}` }));
        console.error('🚨 API Error Response:', error);
        throw new Error(error.error || `HTTP ${response.status} - ${response.statusText}`);
      }

      console.log('🚀 DEBUG: Attempting to parse response as JSON');
      const data = await response.json();
      console.log(`✅ API SUCCESS for ${endpoint}:`, data);
      return data;
    } catch (error) {
      console.error('🚨 API Request FAILED:', {
        url,
        method: config.method || 'GET',
        error: error.message,
        errorType: error.constructor.name,
        stack: error.stack
      });

      // Check for network connectivity issues
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('🚨 NETWORK ERROR: TypeError with fetch - throwing connection error');
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }

      console.error('🚨 RETHROWING ERROR:', error.message);
      throw error;
    }
  }

  // Transactions
  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.constructor.request(`/transactions${query ? `?${query}` : ''}`);
  }

  async getRecentTransactions(limit = 5) {
    return this.constructor.request(`/transactions/recent?limit=${limit}`);
  }

  async createTransaction(transactionData) {
    return this.constructor.request('/transactions', {
      method: 'POST',
      body: transactionData
    });
  }

  async getLatestTransactionForCorrection() {
    return this.constructor.request('/transactions/latest-for-correction');
  }

  async getTodayTransactionSummary() {
    return this.constructor.request('/reports/summary/today');
  }

  // Staff
  async getStaffRoster() {
    return this.constructor.request('/staff/roster');
  }

  async getAllStaff() {
    return this.constructor.request('/staff/allstaff');
  }

  async updateStaff(position, data) {
    return this.constructor.request(`/staff/roster/${position}`, {
      method: 'PUT',
      body: data
    });
  }

  async removeStaffFromRoster(position) {
    return this.constructor.request(`/staff/roster/${position}`, {
      method: 'DELETE'
    });
  }

  async clearRoster() {
    return this.constructor.request('/staff/roster', {
      method: 'DELETE'
    });
  }

  async serveNextCustomer() {
    return this.constructor.request('/staff/serve-next', {
      method: 'POST'
    });
  }

  async advanceQueue(currentMasseuse) {
    return this.constructor.request('/staff/advance-queue', {
      method: 'POST',
      body: { currentMasseuse }
    });
  }

  async setMasseuseBusy(masseuseName, endTime) {
    return this.constructor.request('/staff/set-busy', {
      method: 'POST',
      body: { masseuseName, endTime }
    });
  }

  async getTodayStaffPerformance() {
    return this.constructor.request('/staff/performance/today');
  }

  // Services
  async getServices() {
    return this.constructor.request('/services');
  }

  async getPaymentMethods() {
    return this.constructor.request('/services/payment-methods');
  }

  async createService(serviceData) {
    return this.constructor.request('/services', {
      method: 'POST',
      body: serviceData
    });
  }

  async createPaymentMethod(methodData) {
    return this.constructor.request('/services/payment-methods', {
      method: 'POST',
      body: methodData
    });
  }

  // Expenses
  async getExpenses(date = null) {
    const query = date ? `?date=${date}` : '';
    return this.constructor.request(`/expenses${query}`);
  }

  async createExpense(expenseData) {
    return this.constructor.request('/expenses', {
      method: 'POST',
      body: expenseData
    });
  }

  async deleteExpense(expenseId) {
    return this.constructor.request(`/expenses/${expenseId}`, {
      method: 'DELETE'
    });
  }

  async getTodayExpenseSummary() {
    return this.constructor.request('/expenses/summary/today');
  }

  // Reports
  async getDailyReport(date = null) {
    const endpoint = date ? `/reports/daily/${date}` : '/reports/daily';
    return this.constructor.request(endpoint);
  }

  async getWeeklyReport() {
    return this.constructor.request('/reports/weekly');
  }

  async getMonthlyReport(year = null, month = null) {
    let endpoint = '/reports/monthly';
    if (year && month) {
      endpoint += `/${year}/${month}`;
    }
    return this.constructor.request(endpoint);
  }

  async endDay() {
    return this.constructor.request('/reports/end-day', {
      method: 'POST'
    });
  }

  // Authentication
  async login(username, password = '') {
    return this.constructor.request('/auth/login', {
      method: 'POST',
      body: { username, password }
    });
  }

  async logout() {
    return this.constructor.request('/auth/logout', {
      method: 'POST'
    });
  }

  async checkSession() {
    return this.constructor.request('/auth/session');
  }

  async getActiveSessions() {
    return this.constructor.request('/auth/sessions');
  }

  // =============================================================================
  // ADMIN API METHODS (Manager Only)
  // =============================================================================

  // Staff Administration
  async getAdminStaff() {
    return this.constructor.request('/admin/staff');
  }

  async addStaff(staffData) {
    return this.constructor.request('/admin/staff', {
      method: 'POST',
      body: staffData
    });
  }

  async updateAdminStaff(staffId, staffData) {
    return this.constructor.request(`/admin/staff/${staffId}`, {
      method: 'PUT',
      body: staffData
    });
  }

  async removeStaff(staffId) {
    return this.constructor.request(`/admin/staff/${staffId}`, {
      method: 'DELETE'
    });
  }

  // Payment Management
  async getStaffPayments(staffId) {
    return this.constructor.request(`/admin/staff/${staffId}/payments`);
  }

  async recordPayment(staffId, paymentData) {
    return this.constructor.request(`/admin/staff/${staffId}/payments`, {
      method: 'POST',
      body: paymentData
    });
  }

  async getOutstandingFees() {
    return this.constructor.request('/admin/staff/outstanding-fees');
  }

  // Staff Performance
  async getStaffPerformance(period = 'week') {
    return this.constructor.request(`/admin/staff/performance?period=${period}`);
  }

  async getStaffRankings() {
    return this.constructor.request('/admin/staff/rankings');
  }
}

// Create and export a single instance of the client
// eslint-disable-next-line no-unused-vars
const api = new APIClient();
