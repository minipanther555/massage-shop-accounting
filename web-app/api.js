// API client for backend communication
const API_BASE_URL = '/api'; // Use relative path since frontend and backend are served from same origin

class APIClient {
    constructor(baseURL = '') {
        this.baseURL = baseURL;
        this.jwtToken = localStorage.getItem('jwtToken');
        this.csrfToken = null; // Initialize CSRF token
        this.user = JSON.parse(localStorage.getItem('user'));
        console.log('APIClient initialized');
    }

    async request(url, method = 'GET', body = null) {
        // **HYPOTHESIS 1 & 3 TESTING: Extensive logging for API response parsing and URL construction**
        console.log(`🔍 [HYPOTHESIS TEST] API request starting: ${method} ${url}`);
        console.log(`🔍 [HYPOTHESIS TEST] API_BASE_URL value: ${this.API_BASE_URL}`);
        console.log(`🔍 [HYPOTHESIS TEST] Full URL being constructed: ${this.API_BASE_URL}${url}`);
        console.log(`🔍 [HYPOTHESIS TEST] Request method: ${method}`);
        console.log(`🔍 [HYPOTHESIS TEST] Request body:`, body);
        
        const fullUrl = `${this.API_BASE_URL}${url}`;
        console.log(`🔍 [HYPOTHESIS TEST] Final constructed URL: ${fullUrl}`);
        
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.csrfToken) {
            headers['X-CSRF-Token'] = this.csrfToken;
            console.log(`[CSRF-CLIENT] Attaching token to headers: ${this.csrfToken}`);
        } else {
            console.log('[CSRF-CLIENT] No CSRF token available to attach.');
        }

        const config = {
            method,
            headers,
        };

        if (body) {
            config.body = JSON.stringify(body);
        }

        try {
            // **VALIDATION LOG 2: Log the exact request being sent**
            console.log(`[CSRF-CLIENT] Sending API request to ${method} ${fullUrl}`, { headers: config.headers });
            const response = await fetch(fullUrl, config);

            // **HYPOTHESIS 1 TESTING: Extensive response logging for parsing issues**
            console.log(`🔍 [HYPOTHESIS TEST] Response received for ${fullUrl}`);
            console.log(`🔍 [HYPOTHESIS TEST] Response status: ${response.status}`);
            console.log(`🔍 [HYPOTHESIS TEST] Response statusText: ${response.statusText}`);
            console.log(`🔍 [HYPOTHESIS TEST] Response ok: ${response.ok}`);
            console.log(`🔍 [HYPOTHESIS TEST] Response type: ${response.type}`);
            console.log(`🔍 [HYPOTHESIS TEST] Response url: ${response.url}`);
            
            // **VALIDATION LOG 3: Log all response headers to check for incoming token**
            console.log('[CSRF-CLIENT] Received response. Headers:');
            response.headers.forEach((value, name) => {
                console.log(`[CSRF-CLIENT]   ${name}: ${value}`);
                // **VALIDATION LOG 4: Check if the specific CSRF header is present and store it**
                if (name.toLowerCase() === 'x-csrf-token') {
                    this.csrfToken = value;
                    console.log(`[CSRF-CLIENT] SUCCESS: Captured and stored new CSRF token: ${this.csrfToken}`);
                }
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: 'Failed to parse error response.' };
                }
                console.error(`[CSRF-CLIENT] API Error Response from ${fullUrl}:`, errorData);
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const contentType = response.headers.get('content-type');
            console.log(`🔍 [HYPOTHESIS TEST] Response content-type: ${contentType}`);
            
            if (contentType && contentType.includes('application/json')) {
                const jsonData = await response.json();
                console.log(`🔍 [HYPOTHESIS TEST] Parsed JSON data:`, jsonData);
                console.log(`🔍 [HYPOTHESIS TEST] JSON data type: ${typeof jsonData}`);
                console.log(`🔍 [HYPOTHESIS TEST] JSON data constructor: ${jsonData?.constructor?.name}`);
                console.log(`🔍 [HYPOTHESIS TEST] JSON data isArray: ${Array.isArray(jsonData)}`);
                return jsonData;
            } else {
                const textData = await response.text();
                console.log(`🔍 [HYPOTHESIS TEST] Parsed text data:`, textData);
                console.log(`🔍 [HYPOTHESIS TEST] Text data type: ${typeof textData}`);
                console.log(`🔍 [HYPOTHESIS TEST] Text data length: ${textData.length}`);
                console.log(`🔍 [HYPOTHESIS TEST] Text data first 200 chars: ${textData.substring(0, 200)}`);
                return textData;
            }
        } catch (error) {
            console.error(`[CSRF-CLIENT] Network or fetch error for ${fullUrl}:`, error);
            throw error;
        }
    }

    // Transactions
    async getTransactions(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/transactions${query ? '?' + query : ''}`);
    }

    async getRecentTransactions(limit = 5) {
        return this.request(`/transactions/recent?limit=${limit}`);
    }

    async createTransaction(transactionData) {
        return this.request('/transactions', 'POST', transactionData);
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

    async updateStaff(position, data) {
        return this.request(`/staff/roster/${position}`, 'PUT', data);
    }

    async serveNextCustomer() {
        return this.request('/staff/serve-next', 'POST');
    }

    async advanceQueue(currentMasseuse) {
        return this.request('/staff/advance-queue', 'POST', { currentMasseuse });
    }

    async setMasseuseBusy(masseuseName, endTime) {
        return this.request('/staff/set-busy', 'POST', { masseuseName, endTime });
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
        return this.request('/services', 'POST', serviceData);
    }

    async createPaymentMethod(methodData) {
        return this.request('/services/payment-methods', 'POST', methodData);
    }

    // Expenses
    async getExpenses(date = null) {
        const query = date ? `?date=${date}` : '';
        return this.request(`/expenses${query}`);
    }

    async createExpense(expenseData) {
        return this.request('/expenses', 'POST', expenseData);
    }

    async deleteExpense(expenseId) {
        return this.request(`/expenses/${expenseId}`, 'DELETE');
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
        return this.request('/reports/end-day', 'POST');
    }

    // Authentication
    async login(username, password = '') {
        return this.request('/auth/login', 'POST', { username, password });
    }

    async logout() {
        return this.request('/auth/logout', 'POST');
    }

    async checkSession() {
        return this.request('/auth/session');
    }

    async getActiveSessions() {
        return this.request('/auth/sessions');
    }

    // =============================================================================
    // ADMIN API METHODS (Manager Only)
    // =============================================================================

    // Staff Administration
    async getAdminStaff() {
        return this.request('/admin/staff');
    }

    async addStaff(staffData) {
        return this.request('/admin/staff', 'POST', staffData);
    }

    async updateStaff(staffId, staffData) {
        return this.request(`/admin/staff/${staffId}`, 'PUT', staffData);
    }

    async removeStaff(staffId) {
        return this.request(`/admin/staff/${staffId}`, 'DELETE');
    }

    // Payment Management
    async getStaffPayments(staffId) {
        return this.request(`/admin/staff/${staffId}/payments`);
    }

    async recordPayment(staffId, paymentData) {
        return this.request(`/admin/staff/${staffId}/payments`, 'POST', paymentData);
    }

    async getOutstandingFees() {
        return this.request('/admin/staff/outstanding-fees');
    }

    // Staff Performance
    async getStaffPerformance(period = 'week') {
        return this.request(`/admin/staff/performance?period=${period}`);
    }

    async getStaffRankings() {
        return this.request('/admin/staff/rankings');
    }
}

// Create global API instance
const api = new APIClient();
