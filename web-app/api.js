// API client for backend communication
class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
  }

  // Get CSRF token from /csrf endpoint
  async getCsrfToken() {
    try {
      // Fetch CSRF token from the dedicated endpoint
      const response = await fetch('/csrf', {
        method: 'GET',
        credentials: 'include', // Include cookies for CSRF validation
        cache: 'no-cache' // Prevent caching of CSRF tokens
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch CSRF token: ${response.status}`);
      }
      
      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('[API_CLIENT] Failed to fetch CSRF token:', error);
      return null;
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;

    if (options.method === 'GET' || options.method === undefined) {
      options.cache = 'no-cache';
    }

    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Ensures cookies (incl. CSRF secret) are sent
      ...options,
    };

    // For non-GET requests, first fetch a CSRF token, then proceed.
    if (config.method !== 'GET') {
      try {
        const csrfToken = await this.getCsrfToken();
        if (csrfToken) {
          config.headers['X-CSRF-Token'] = csrfToken;
        } else {
          // If we can't get a token, we must stop the request.
          throw new Error('CSRF token not available. Request blocked.');
        }
      } catch (error) {
        console.error(`[API_CLIENT] CSRF token fetch failed, blocking request to ${url}:`, error);
        throw error; // Re-throw to prevent the request from proceeding
      }
    }

    if (config.body) {
      config.body = JSON.stringify(config.body);
    }

    console.log(`[API_CLIENT] ${new Date().toISOString()} - Making request: ${config.method} ${url}`);

    try {
      const response = await fetch(url, config);
      console.log(`[API_CLIENT] ${new Date().toISOString()} - Response received for ${config.method} ${url}. Status: ${response.status}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: `HTTP ${response.status} - ${response.statusText}` }));
        // Use the detailed error from the server if available
        throw new Error(error.details || error.error || `HTTP ${response.status} - ${response.statusText}`);
      }
      // Handle cases where the response body might be empty
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.error(`[API_CLIENT] ${new Date().toISOString()} - Request failed for ${config.method} ${url}:`, error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      throw error;
    }
  }

  // All other methods (login, getTransactions, etc.) will be instance methods
  // Transactions
  async getTransactions(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }

  async getRecentTransactions(limit = 5, date = null) {
    const query = date ? `?limit=${limit}&date=${date}` : `?limit=${limit}`;
    return this.request(`/transactions/recent${query}`);
  }
  
  async createTransaction(transactionData) {
    return this.request('/transactions', {
      method: 'POST',
      body: transactionData
    });
  }

  async getLatestTransactionForCorrection() {
    return this.request('/transactions/latest-for-correction');
  }

  async getTodayTransactionSummary() {
    return this.request('/reports/summary/today');
  }

  // Staff
  async getStaffRoster() {
    return this.request('/staff/roster');
  }

  async getAllStaff() {
    return this.request('/staff/allstaff');
  }

  async updateStaff(position, data) {
    return this.request(`/staff/roster/${position}`, {
      method: 'PUT',
      body: data
    });
  }

  async removeStaffFromRoster(position) {
    return this.request(`/staff/roster/${position}`, {
      method: 'DELETE'
    });
  }

  async clearRoster() {
    return this.request('/staff/roster', {
      method: 'DELETE'
    });
  }

  async addToRoster(position, { masseuse_name, status = null }) {
    return this.request(`/staff/roster/${position}`, {
      method: 'PUT',
      body: { masseuse_name, status }
    });
  }

  async serveNextCustomer() {
    return this.request('/staff/serve-next', {
      method: 'POST'
    });
  }

  async advanceQueue(currentMasseuse) {
    return this.request('/staff/advance-queue', {
      method: 'POST',
      body: { currentMasseuse }
    });
  }

  async setMasseuseBusy(masseuseName, endTime) {
    return this.request('/staff/set-busy', {
      method: 'POST',
      body: { masseuseName, endTime }
    });
  }

  async getTodayStaffPerformance() {
    return this.request('/staff/performance/today');
  }

  // Services
  async getServices() {
    return this.request('/services');
  }

  async getPaymentMethods() {
    return this.request('/services/payment-methods');
  }

  async createService(serviceData) {
    return this.request('/services', {
      method: 'POST',
      body: serviceData
    });
  }

  async createPaymentMethod(methodData) {
    return this.request('/services/payment-methods', {
      method: 'POST',
      body: methodData
    });
  }

  // Expenses
  async getExpenses(date = null) {
    const query = date ? `?date=${date}` : '';
    return this.request(`/expenses${query}`);
  }

  async createExpense(expenseData) {
    return this.request('/expenses', {
      method: 'POST',
      body: expenseData
    });
  }

  async deleteExpense(expenseId) {
    return this.request(`/expenses/${expenseId}`, {
      method: 'DELETE'
    });
  }

  async getTodayExpenseSummary() {
    return this.request('/expenses/summary/today');
  }

  // Reports
  async getDailyReport(date = null) {
    const endpoint = date ? `/reports/daily/${date}` : '/reports/daily';
    return this.request(endpoint);
  }

  async getWeeklyReport() {
    return this.request('/reports/weekly');
  }

  async getMonthlyReport(year = null, month = null) {
    let endpoint = '/reports/monthly';
    if (year && month) {
      endpoint += `/${year}/${month}`;
    }
    return this.request(endpoint);
  }

  async endDay() {
    return this.request('/reports/end-day', {
      method: 'POST'
    });
  }

  // Authentication
  async login(username, password = '') {
    return this.request('/auth/login', {
      method: 'POST',
      body: { username, password }
    });
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST'
    });
  }

  async checkSession() {
    return this.request('/auth/session');
  }

  async getActiveSessions() {
    return this.request('/auth/sessions');
  }

  // ADMIN METHODS...
  async getAdminStaff() {
    return this.request('/admin/staff');
  }

  async addStaff(staffData) {
    return this.request('/admin/staff', {
      method: 'POST',
      body: staffData
    });
  }

  async updateAdminStaff(staffId, staffData) {
    return this.request(`/admin/staff/${staffId}`, {
      method: 'PUT',
      body: staffData
    });
  }

  async removeStaff(staffId) {
    return this.request(`/admin/staff/${staffId}`, {
      method: 'DELETE'
    });
  }

  async getStaffPayments(staffId) {
    return this.request(`/admin/staff/${staffId}/payments`);
  }

  async recordPayment(staffId, paymentData) {
    return this.request(`/admin/staff/${staffId}/payments`, {
      method: 'POST',
      body: paymentData
    });
  }

  async getOutstandingFees() {
    return this.request('/admin/staff/outstanding-fees');
  }

  async getStaffPerformance(period = 'week') {
    return this.request(`/admin/staff/performance?period=${period}`);
  }

  async getStaffRankings() {
    return this.request('/admin/staff/rankings');
  }
}

// Create and export a single instance of the client
// eslint-disable-next-line no-unused-vars
const api = new APIClient('/api');

// Legacy static-like methods for pages that haven't been updated
// This ensures old pages calling APIClient.request() don't break.
APIClient.request = api.request.bind(api);
