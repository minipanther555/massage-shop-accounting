// API client for backend communication
const API_BASE_URL = 'http://localhost:3000/api';

class APIClient {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        
        // Get session token from localStorage
        const sessionToken = localStorage.getItem('sessionToken');
        
        const config = {
            mode: 'cors',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/json',
                ...(sessionToken && { 'Authorization': `Bearer ${sessionToken}` }),
                ...options.headers
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            console.log(`🚀 DEBUG: Starting API request: ${config.method || 'GET'} ${url}`);
            console.log(`🚀 DEBUG: Request config:`, config);
            
            const response = await fetch(url, config);
            
            console.log(`🚀 DEBUG: Response received - Status: ${response.status} ${response.statusText}`);
            console.log(`🚀 DEBUG: Response headers:`, [...response.headers.entries()]);
            
            if (!response.ok) {
                console.log(`🚀 DEBUG: Response not OK, attempting to parse error`);
                const error = await response.json().catch(() => ({ error: `HTTP ${response.status} - ${response.statusText}` }));
                console.error('🚨 API Error Response:', error);
                throw new Error(error.error || `HTTP ${response.status} - ${response.statusText}`);
            }

            console.log(`🚀 DEBUG: Attempting to parse response as JSON`);
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
                throw new Error('Cannot connect to server. Please ensure the backend is running on port 3000.');
            }
            
            console.error('🚨 RETHROWING ERROR:', error.message);
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

    async updateStaff(position, data) {
        return this.request(`/staff/roster/${position}`, {
            method: 'PUT',
            body: data
        });
    }

    async serveNextCustomer() {
        return this.request('/staff/serve-next', {
            method: 'POST'
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
}

// Create global API instance
const api = new APIClient();
