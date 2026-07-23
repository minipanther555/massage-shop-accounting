// API client for backend communication
class APIClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this._csrf = null;
    this._inflight = new Map(); // key -> Promise for de-dupe
  }

  // Get CSRF token from /csrf endpoint (with session caching)
  async getCsrfToken() {
    if (this._csrf) return this._csrf;
    
    // Prevent duplicate requests
    const key = 'csrf';
    if (this._inflight.has(key)) {
      return this._inflight.get(key);
    }
    
    const promise = this._fetchCsrfToken();
    this._inflight.set(key, promise);
    
    try {
      this._csrf = await promise;
      return this._csrf;
    } finally {
      this._inflight.delete(key);
    }
  }
  
  async _fetchCsrfToken() {
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

      // One retry on 403 → refresh CSRF
      if (response.status === 403 && config.method !== 'GET') {
        console.log(`[API_CLIENT] CSRF token expired, refreshing and retrying...`);
        this._csrf = null; // Clear cached token
        const newCsrfToken = await this.getCsrfToken();
        if (newCsrfToken) {
          config.headers['X-CSRF-Token'] = newCsrfToken;
          const retryResponse = await fetch(url, config);
          console.log(`[API_CLIENT] ${new Date().toISOString()} - Retry response received for ${config.method} ${url}. Status: ${retryResponse.status}`);
          if (!retryResponse.ok) {
            const error = await retryResponse.json().catch(() => ({ error: `HTTP ${retryResponse.status} - ${retryResponse.statusText}` }));
            throw new Error(error.details || error.error || `HTTP ${retryResponse.status} - ${retryResponse.statusText}`);
          }
          const text = await retryResponse.text();
          return text ? JSON.parse(text) : {};
        }
      }

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

  // Helper methods for cleaner API calls
  async get(url) { 
    return this.request(url, { method: 'GET' }); 
  }
  
  async putJson(url, body) { 
    return this.request(url, { method: 'PUT', body }); 
  }
  
  async delete(url) { 
    return this.request(url, { method: 'DELETE' }); 
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

  async quoteTransactionPromotion(quoteData) {
    return this.request('/transactions/quote', {
      method: 'POST',
      body: quoteData
    });
  }

  async getLatestTransactionForCorrection() {
    return this.request('/transactions/latest-for-correction');
  }

  async getCorrectionCandidates(limit = 10) {
    return this.request(`/transactions/correction-candidates?limit=${limit}`);
  }

  async cancelTransaction(transactionId, reason = 'customer_left_before_service') {
    return this.request(`/transactions/${encodeURIComponent(transactionId)}/cancel`, {
      method: 'POST',
      body: { reason }
    });
  }

  async getTodayTransactionSummary() {
    return this.request('/reports/summary/today');
  }

  async getUpcomingBookings() {
    return this.request('/bookings/upcoming');
  }

  async getBooking(bookingId) {
    return this.request(`/bookings/${encodeURIComponent(bookingId)}`);
  }

  async createBooking(bookingData) {
    return this.request('/bookings', {
      method: 'POST',
      body: bookingData
    });
  }

  async updateBookingStatus(bookingId, status) {
    return this.request(`/bookings/${encodeURIComponent(bookingId)}/status`, {
      method: 'POST',
      body: { status }
    });
  }

  async getBookingAvailability(masseuseName, massageEnd) {
    const query = new URLSearchParams({
      masseuse_name: masseuseName,
      massage_end: massageEnd
    });
    return this.request(`/bookings/availability?${query.toString()}`);
  }

  // Paid Time Extension add-ons.
  // The server derives the amount due and the commission; anything money-shaped
  // sent from here is ignored, so callers never compute a price.
  async createAddOn(payload) {
    return this.request('/transactions/add-ons', {
      method: 'POST',
      body: payload
    });
  }

  async settleAddOn(transactionId, paymentMethod) {
    return this.request(`/transactions/add-ons/${encodeURIComponent(transactionId)}/settle`, {
      method: 'POST',
      body: { payment_method: paymentMethod }
    });
  }

  async cancelAddOn(transactionId) {
    return this.request(`/transactions/add-ons/${encodeURIComponent(transactionId)}/cancel`, {
      method: 'POST',
      body: {}
    });
  }

  // Staff
  async getStaffRoster() {
    return this.request('/staff/roster');
  }

  async getCurrentShopStatus() {
    return this.request('/staff/current-status');
  }

  async getTodayStaffHelper() {
    return this.request('/staff/today/helper');
  }

  async getTodayStaffState() {
    return this.request('/staff/today/state');
  }

  async addTodayStaff(staffIdOrData) {
    const body = typeof staffIdOrData === 'object' ? staffIdOrData : { staff_id: staffIdOrData };
    return this.request('/staff/today/add', {
      method: 'POST',
      body
    });
  }

  async markTodayStaffDayOff(staffIdOrData) {
    const body = typeof staffIdOrData === 'object' ? staffIdOrData : { staff_id: staffIdOrData };
    return this.request('/staff/today/day-off', {
      method: 'POST',
      body
    });
  }

  async restoreTodayStaffDayOff(staffIdOrData) {
    const body = typeof staffIdOrData === 'object' ? staffIdOrData : { staff_id: staffIdOrData };
    return this.request('/staff/today/restore', {
      method: 'POST',
      body
    });
  }

  async reorderTodayStaff(orderedStaffIds) {
    return this.request('/staff/today/reorder', {
      method: 'PUT',
      body: { ordered_staff_ids: orderedStaffIds }
    });
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

  // --- DELETE single roster position ---
  // Canonical name:
  async deleteStaffRoster(position) {
    // we don't rely on response body; controller does a fresh GET after writes
    return this.request(`/staff/roster/${encodeURIComponent(position)}`, {
      method: 'DELETE'
    });
  }

  // Back-compat aliases (if old names might exist in some callers/tests):
  async deleteRosterPosition(position)      { return this.deleteStaffRoster(position); }

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
  async getServices(options = {}) {
    const query = options.includeInactive ? '?includeInactive=true' : '';
    return this.request(`/services${query}`);
  }

  async getPaymentMethods() {
    return this.request('/services/payment-methods');
  }

  async getPromotionSettings() {
    return this.request('/services/promotion-settings');
  }

  async updatePromotionSettings(settings) {
    return this.request('/services/promotion-settings', {
      method: 'PUT',
      body: settings
    });
  }

  async createService(serviceData) {
    return this.request('/services', {
      method: 'POST',
      body: serviceData
    });
  }

  async updateService(serviceId, serviceData) {
    return this.request(`/services/${encodeURIComponent(serviceId)}`, {
      method: 'PATCH',
      body: serviceData
    });
  }

  async deleteService(serviceId) {
    return this.request(`/services/${encodeURIComponent(serviceId)}`, {
      method: 'DELETE'
    });
  }

  async bulkUpdateServices(updateData) {
    return this.request('/services/bulk/update', {
      method: 'PATCH',
      body: updateData
    });
  }

  async createPaymentMethod(methodData) {
    return this.request('/services/payment-methods', {
      method: 'POST',
      body: methodData
    });
  }

  // Payment Types Admin
  async getPaymentTypes() {
    return this.request('/payment-types');
  }

  async createPaymentType(paymentTypeData) {
    return this.request('/payment-types', {
      method: 'POST',
      body: paymentTypeData
    });
  }

  async updatePaymentType(paymentTypeId, paymentTypeData) {
    return this.request(`/payment-types/${encodeURIComponent(paymentTypeId)}`, {
      method: 'PUT',
      body: paymentTypeData
    });
  }

  async deletePaymentType(paymentTypeId) {
    return this.request(`/payment-types/${encodeURIComponent(paymentTypeId)}`, {
      method: 'DELETE'
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

  async getFinancialReport(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    const query = params.toString();
    return this.request(`/reports/financial${query ? `?${query}` : ''}`);
  }

  async getReportStaff() {
    return this.request('/reports/staff');
  }

  async getReportServiceTypes() {
    return this.request('/reports/service-types');
  }

  async getReportLocations() {
    return this.request('/reports/locations');
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

  async getUsers() {
    return this.request('/auth/users');
  }

  async getUsersByLocation(locationId) {
    return this.request(`/auth/users/location/${encodeURIComponent(locationId)}`);
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
