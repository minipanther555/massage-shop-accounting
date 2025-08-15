// API client for backend communication
const API_BASE_URL = '/api'; // Use relative path since frontend and backend are served from same origin

class APIClient {
    constructor() {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] APICLIENT CONSTRUCTOR - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] Constructor called at:', new Date().toISOString());
        console.log('🔍 [HYPOTHESIS TEST] Window location:', window.location.href);
        console.log('🔍 [HYPOTHESIS TEST] Document readyState:', document.readyState);
        console.log('🔍 [HYPOTHESIS TEST] Script loading order check...');
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: API_BASE_URL Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] process.env check (if available):', typeof process !== 'undefined' ? process.env : 'process not available in browser');
        console.log('🔍 [HYPOTHESIS 1] window.ENV check:', window.ENV);
        console.log('🔍 [HYPOTHESIS 1] Global config check:', window.CONFIG);
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] All script tags in document:', Array.from(document.scripts).map(s => s.src || 'inline'));
        console.log('🔍 [HYPOTHESIS 2] Scripts loaded count:', document.scripts.length);
        console.log('🔍 [HYPOTHESIS 2] Head section scripts:', Array.from(document.head.querySelectorAll('script')).map(s => s.src || 'inline'));
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Current script execution time:', performance.now());
        console.log('🔍 [HYPOTHESIS 3] DOM ready state:', document.readyState);
        console.log('🔍 [HYPOTHESIS 3] Window load event fired:', window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0);
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Script src:', document.currentScript?.src || 'inline script');
        console.log('🔍 [HYPOTHESIS 4] Cache control headers check (if available)');
        console.log('🔍 [HYPOTHESIS 4] Last modified check (if available)');
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Global variables before setting API_BASE_URL:');
        console.log('🔍 [HYPOTHESIS 5] - window.API_BASE_URL:', window.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 5] - window.apiBaseUrl:', window.apiBaseUrl);
        console.log('🔍 [HYPOTHESIS 5] - window.config:', window.config);
        
        // Set API_BASE_URL with comprehensive logging
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] SETTING API_BASE_URL - TESTING ALL HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        
        // Try multiple configuration sources
        let apiBaseUrl = null;
        
        // Source 1: Direct assignment
        console.log('🔍 [HYPOTHESIS TEST] Source 1: Direct assignment');
        apiBaseUrl = '/api';
        console.log('🔍 [HYPOTHESIS TEST] Direct assignment result:', apiBaseUrl);
        
        // Source 2: Window object
        console.log('🔍 [HYPOTHESIS TEST] Source 2: Window object');
        if (window.API_BASE_URL) {
            apiBaseUrl = window.API_BASE_URL;
            console.log('🔍 [HYPOTHESIS TEST] Window.API_BASE_URL found:', apiBaseUrl);
        } else {
            console.log('🔍 [HYPOTHESIS TEST] Window.API_BASE_URL NOT found');
        }
        
        // Source 3: Global config
        console.log('🔍 [HYPOTHESIS TEST] Source 3: Global config');
        if (window.CONFIG && window.CONFIG.API_BASE_URL) {
            apiBaseUrl = window.CONFIG.API_BASE_URL;
            console.log('🔍 [HYPOTHESIS TEST] Global config found:', apiBaseUrl);
        } else {
            console.log('🔍 [HYPOTHESIS TEST] Global config NOT found');
        }
        
        // Source 4: Environment variable simulation
        console.log('🔍 [HYPOTHESIS TEST] Source 4: Environment variable simulation');
        if (typeof process !== 'undefined' && process.env && process.env.API_BASE_URL) {
            apiBaseUrl = process.env.API_BASE_URL;
            console.log('🔍 [HYPOTHESIS TEST] Process.env found:', apiBaseUrl);
        } else {
            console.log('🔍 [HYPOTHESIS TEST] Process.env NOT available in browser');
        }
        
        // Source 5: Meta tag
        console.log('🔍 [HYPOTHESIS TEST] Source 5: Meta tag');
        const metaTag = document.querySelector('meta[name="api-base-url"]');
        if (metaTag) {
            apiBaseUrl = metaTag.getAttribute('content');
            console.log('🔍 [HYPOTHESIS TEST] Meta tag found:', apiBaseUrl);
        } else {
            console.log('🔍 [HYPOTHESIS TEST] Meta tag NOT found');
        }
        
        // Final API_BASE_URL assignment
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] FINAL API_BASE_URL ASSIGNMENT');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] Final apiBaseUrl value:', apiBaseUrl);
        console.log('🔍 [HYPOTHESIS TEST] Type of apiBaseUrl:', typeof apiBaseUrl);
        console.log('🔍 [HYPOTHESIS TEST] Length of apiBaseUrl:', apiBaseUrl ? apiBaseUrl.length : 'N/A');
        
        this.API_BASE_URL = apiBaseUrl || '/api';
        
        console.log('🔍 [HYPOTHESIS TEST] This.API_BASE_URL set to:', this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS TEST] This.API_BASE_URL type:', typeof this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS TEST] This.API_BASE_URL length:', this.API_BASE_URL.length);
        
        // Verify assignment
        console.log('🔍 [HYPOTHESIS TEST] Verification - this.API_BASE_URL === apiBaseUrl:', this.API_BASE_URL === apiBaseUrl);
        console.log('🔍 [HYPOTHESIS TEST] Verification - this.API_BASE_URL === "/api":', this.API_BASE_URL === '/api');
        
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] CONSTRUCTOR COMPLETED - ALL HYPOTHESES TESTED');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        
        console.log('APIClient initialized');
    }

    async request(endpoint, method = 'GET', data = null, options = {}) {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] REQUEST METHOD - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] Request called at:', new Date().toISOString());
        console.log('🔍 [HYPOTHESIS TEST] Endpoint parameter:', endpoint);
        console.log('🔍 [HYPOTHESIS TEST] Method parameter:', method);
        console.log('🔍 [HYPOTHESIS TEST] Data parameter:', data);
        console.log('🔍 [HYPOTHESIS TEST] Options parameter:', options);
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL value:', this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL type:', typeof this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL length:', this.API_BASE_URL ? this.API_BASE_URL.length : 'N/A');
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL === undefined:', this.API_BASE_URL === undefined);
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL === null:', this.API_BASE_URL === null);
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL === "":', this.API_BASE_URL === '');
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] Global window.API_BASE_URL:', window.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 2] Global window.CONFIG:', window.CONFIG);
        console.log('🔍 [HYPOTHESIS 2] Global window.config:', window.config);
        console.log('🔍 [HYPOTHESIS 2] Global window.apiBaseUrl:', window.apiBaseUrl);
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Document readyState:', document.readyState);
        console.log('🔍 [HYPOTHESIS 3] Window load event fired:', window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0);
        console.log('🔍 [HYPOTHESIS 3] DOMContentLoaded fired:', document.readyState === 'interactive' || document.readyState === 'complete');
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Current script execution time:', performance.now());
        console.log('🔍 [HYPOTHESIS 4] Script modification check (if available)');
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Has this.API_BASE_URL been modified since constructor?');
        console.log('🔍 [HYPOTHESIS 5] Current this.API_BASE_URL:', this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 5] Expected value "/api":', '/api');
        console.log('🔍 [HYPOTHESIS 5] Values match:', this.API_BASE_URL === '/api');
        
        // URL construction with comprehensive logging
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] URL CONSTRUCTION - TESTING ALL HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        
        console.log('🔍 [HYPOTHESIS TEST] API request starting:', method, endpoint);
        console.log('🔍 [HYPOTHESIS TEST] API_BASE_URL value:', this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS TEST] Full URL being constructed:', this.API_BASE_URL + endpoint);
        console.log('🔍 [HYPOTHESIS TEST] Request method:', method);
        console.log('🔍 [HYPOTHESIS TEST] Request body:', data);
        
        // Validate API_BASE_URL before use
        if (!this.API_BASE_URL || this.API_BASE_URL === 'undefined' || this.API_BASE_URL === 'null') {
            console.error('🔍 [HYPOTHESIS TEST] ❌ CRITICAL ERROR: API_BASE_URL is invalid:', this.API_BASE_URL);
            console.error('🔍 [HYPOTHESIS TEST] ❌ Falling back to default /api');
            this.API_BASE_URL = '/api';
        }
        
        const url = `${this.API_BASE_URL}${endpoint}`;
        
        console.log('🔍 [HYPOTHESIS TEST] Final constructed URL:', url);
        console.log('🔍 [HYPOTHESIS TEST] URL type:', typeof url);
        console.log('🔍 [HYPOTHESIS TEST] URL length:', url.length);
        console.log('🔍 [HYPOTHESIS TEST] URL contains "undefined":', url.includes('undefined'));
        console.log('🔍 [HYPOTHESIS TEST] URL contains "null":', url.includes('null'));
        
        // Validate final URL
        if (url.includes('undefined') || url.includes('null')) {
            console.error('🔍 [HYPOTHESIS TEST] ❌ CRITICAL ERROR: Final URL contains invalid values');
            console.error('🔍 [HYPOTHESIS TEST] ❌ URL:', url);
            throw new Error(`Invalid API URL constructed: ${url}`);
        }

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // CSRF token handling
        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
            console.log('[CSRF-CLIENT] Attaching CSRF token to request.');
        } else {
            console.log('[CSRF-CLIENT] No CSRF token available to attach.');
        }

        const requestOptions = {
            method,
            headers,
            ...options
        };

        if (data && method !== 'GET') {
            requestOptions.body = JSON.stringify(data);
        }

        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] SENDING REQUEST - TESTING ALL HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] Request options:', requestOptions);
        console.log('🔍 [HYPOTHESIS TEST] Final URL being sent:', url);
        console.log('🔍 [HYPOTHESIS TEST] Method being sent:', method);
        console.log('🔍 [HYPOTHESIS TEST] Headers being sent:', headers);
        console.log('🔍 [HYPOTHESIS TEST] Body being sent:', requestOptions.body);

        try {
            console.log(`[CSRF-CLIENT] Sending API request to ${method} ${url}`, {headers});
            const response = await fetch(url, requestOptions);
            
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] RESPONSE RECEIVED - TESTING ALL 5 HYPOTHESES');
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] Response received for', url);
            console.log('🔍 [HYPOTHESIS TEST] Response status:', response.status);
            console.log('🔍 [HYPOTHESIS TEST] Response statusText:', response.statusText);
            console.log('🔍 [HYPOTHESIS TEST] Response ok:', response.ok);
            console.log('🔍 [HYPOTHESIS TEST] Response type:', response.type);
            console.log('🔍 [HYPOTHESIS TEST] Response url:', response.url);
            
            // Test Hypothesis 1: Environment Variable Missing
            console.log('🔍 [HYPOTHESIS 1] Response status indicates API_BASE_URL issue:', response.status === 404);
            console.log('🔍 [HYPOTHESIS 1] Response URL contains "undefined":', response.url.includes('undefined'));
            
            // Test Hypothesis 2: Configuration File Loading Issue
            console.log('🔍 [HYPOTHESIS 2] Response headers indicate server type:', response.headers.get('server'));
            console.log('🔍 [HYPOTHESIS 2] Response content type:', response.headers.get('content-type'));
            
            // Test Hypothesis 3: Script Loading Order Problem
            console.log('🔍 [HYPOTHESIS 3] Response timing check:', performance.now());
            
            // Test Hypothesis 4: Browser Caching Issue
            console.log('🔍 [HYPOTHESIS 4] Response cache headers:', response.headers.get('cache-control'));
            console.log('🔍 [HYPOTHESIS 4] Response etag:', response.headers.get('etag'));
            
            // Test Hypothesis 5: Configuration Override Problem
            console.log('🔍 [HYPOTHESIS 5] Response indicates routing issue:', response.status === 404);
            console.log('🔍 [HYPOTHESIS 5] Response URL vs expected:', response.url);

            if (!response.ok) {
                console.log('[CSRF-CLIENT] Received response. Headers:');
                response.headers.forEach((value, key) => {
                    console.log(`[CSRF-CLIENT]   ${key}: ${value}`);
                });

                let errorData;
                try {
                    const responseText = await response.text();
                    console.log('🔍 [HYPOTHESIS TEST] Response text received:', responseText);
                    console.log('🔍 [HYPOTHESIS TEST] Response text length:', responseText.length);
                    console.log('🔍 [HYPOTHESIS TEST] Response text contains HTML:', responseText.includes('<html'));
                    console.log('🔍 [HYPOTHESIS TEST] Response text contains DOCTYPE:', responseText.includes('<!DOCTYPE'));
                    
                    errorData = JSON.parse(responseText);
                    console.log('🔍 [HYPOTHESIS TEST] Response parsed as JSON successfully:', errorData);
                } catch (parseError) {
                    console.log('🔍 [HYPOTHESIS TEST] Failed to parse response as JSON:', parseError);
                    console.log('🔍 [HYPOTHESIS TEST] Response was likely HTML or plain text');
                    errorData = { error: 'Failed to parse error response.' };
                }

                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const responseData = await response.json();
            console.log('🔍 [HYPOTHESIS TEST] Response data parsed successfully:', responseData);
            return responseData;

        } catch (error) {
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] ERROR HANDLING - TESTING ALL 5 HYPOTHESES');
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] Error occurred for request to:', url);
            console.log('🔍 [HYPOTHESIS TEST] Error type:', error.constructor.name);
            console.log('🔍 [HYPOTHESIS TEST] Error message:', error.message);
            console.log('🔍 [HYPOTHESIS TEST] Error stack:', error.stack);
            
            // Test Hypothesis 1: Environment Variable Missing
            console.log('🔍 [HYPOTHESIS 1] Error indicates API_BASE_URL issue:', error.message.includes('undefined') || error.message.includes('404'));
            
            // Test Hypothesis 2: Configuration File Loading Issue
            console.log('🔍 [HYPOTHESIS 2] Error indicates server routing issue:', error.message.includes('404') || error.message.includes('Not Found'));
            
            // Test Hypothesis 3: Script Loading Order Problem
            console.log('🔍 [HYPOTHESIS 3] Error timing check:', performance.now());
            
            // Test Hypothesis 4: Browser Caching Issue
            console.log('🔍 [HYPOTHESIS 4] Error indicates network issue:', error.name === 'TypeError' || error.name === 'NetworkError');
            
            // Test Hypothesis 5: Configuration Override Problem
            console.log('🔍 [HYPOTHESIS 5] Error indicates configuration issue:', error.message.includes('Invalid API URL'));
            
            console.log('[CSRF-CLIENT] API Error Response from', url + ':', error);
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

    getCSRFToken() {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] GETCSRFTOKEN METHOD - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] getCSRFToken called at:', new Date().toISOString());
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] this.csrfToken value:', this.csrfToken);
        console.log('🔍 [HYPOTHESIS 1] this.csrfToken type:', typeof this.csrfToken);
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] localStorage csrfToken:', localStorage.getItem('csrfToken'));
        console.log('🔍 [HYPOTHESIS 2] localStorage keys:', Object.keys(localStorage));
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Document readyState:', document.readyState);
        console.log('🔍 [HYPOTHESIS 3] Window load event fired:', window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0);
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Current script execution time:', performance.now());
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Has this.csrfToken been modified since constructor?');
        console.log('🔍 [HYPOTHESIS 5] Current this.csrfToken:', this.csrfToken);
        
        // Try multiple sources for CSRF token
        let token = this.csrfToken;
        
        if (!token) {
            console.log('🔍 [HYPOTHESIS TEST] No instance token, checking localStorage');
            token = localStorage.getItem('csrfToken');
        }
        
        if (!token) {
            console.log('🔍 [HYPOTHESIS TEST] No localStorage token, checking meta tag');
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                token = metaTag.getAttribute('content');
                console.log('🔍 [HYPOTHESIS TEST] Meta tag token found:', token);
            }
        }
        
        console.log('🔍 [HYPOTHESIS TEST] Final token value:', token);
        console.log('🔍 [HYPOTHESIS TEST] Token type:', typeof token);
        console.log('🔍 [HYPOTHESIS TEST] Token length:', token ? token.length : 'N/A');
        
        return token;
    }

    setCSRFToken(token) {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] SETCSRFTOKEN METHOD - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] setCSRFToken called at:', new Date().toISOString());
        console.log('🔍 [HYPOTHESIS TEST] Token parameter:', token);
        console.log('🔍 [HYPOTHESIS TEST] Token type:', typeof token);
        console.log('🔍 [HYPOTHESIS TEST] Token length:', token ? token.length : 'N/A');
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] Previous this.csrfToken:', this.csrfToken);
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] Previous localStorage csrfToken:', localStorage.getItem('csrfToken'));
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Document readyState:', document.readyState);
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Current script execution time:', performance.now());
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Setting token to:', token);
        
        this.csrfToken = token;
        localStorage.setItem('csrfToken', token);
        
        console.log('🔍 [HYPOTHESIS TEST] Token set successfully');
        console.log('🔍 [HYPOTHESIS TEST] Verification - this.csrfToken:', this.csrfToken);
        console.log('🔍 [HYPOTHESIS TEST] Verification - localStorage csrfToken:', localStorage.getItem('csrfToken'));
    }

    // Authentication methods
    async login(username, password) {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] LOGIN METHOD - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] Login called at:', new Date().toISOString());
        console.log('🔍 [HYPOTHESIS TEST] Username parameter:', username);
        console.log('🔍 [HYPOTHESIS TEST] Password parameter:', password ? '[REDACTED]' : 'undefined');
        console.log('🔍 [HYPOTHESIS TEST] Password length:', password ? password.length : 'N/A');
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL before login:', this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL type:', typeof this.API_BASE_URL);
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] Global window.API_BASE_URL:', window.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 2] Global window.CONFIG:', window.CONFIG);
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Document readyState:', document.readyState);
        console.log('🔍 [HYPOTHESIS 3] Window load event fired:', window.performance.getEntriesByType('navigation')[0]?.loadEventEnd > 0);
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Current script execution time:', performance.now());
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Has this.API_BASE_URL been modified since constructor?');
        console.log('🔍 [HYPOTHESIS 5] Current this.API_BASE_URL:', this.API_BASE_URL);
        console.log('🔍 [HYPOTHESIS 5] Expected value "/api":', '/api');
        console.log('🔍 [HYPOTHESIS 5] Values match:', this.API_BASE_URL === '/api');
        
        try {
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] CALLING LOGIN REQUEST - TESTING ALL 5 HYPOTHESES');
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            
            const response = await this.request('/auth/login', 'POST', { username, password });
            
            console.log('🔍 [HYPOTHESIS TEST] Login request successful');
            console.log('🔍 [HYPOTHESIS TEST] Response type:', typeof response);
            console.log('🔍 [HYPOTHESIS TEST] Response keys:', Object.keys(response));
            
            if (response.token) {
                console.log('🔍 [HYPOTHESIS TEST] Token received, storing in localStorage');
                localStorage.setItem('jwtToken', response.token);
                localStorage.setItem('user', JSON.stringify(response.user));
            }
            
            return response;
            
        } catch (error) {
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] LOGIN ERROR - TESTING ALL 5 HYPOTHESES');
            console.log('🔍 [HYPOTHESIS TEST] ==========================================');
            console.log('🔍 [HYPOTHESIS TEST] Login failed with error:', error);
            console.log('🔍 [HYPOTHESIS TEST] Error type:', error.constructor.name);
            console.log('🔍 [HYPOTHESIS TEST] Error message:', error.message);
            console.log('🔍 [HYPOTHESIS TEST] Error stack:', error.stack);
            
            // Test Hypothesis 1: Environment Variable Missing
            console.log('🔍 [HYPOTHESIS 1] Error indicates API_BASE_URL issue:', error.message.includes('undefined') || error.message.includes('404'));
            
            // Test Hypothesis 2: Configuration File Loading Issue
            console.log('🔍 [HYPOTHESIS 2] Error indicates server routing issue:', error.message.includes('404') || error.message.includes('Not Found'));
            
            // Test Hypothesis 3: Script Loading Order Problem
            console.log('🔍 [HYPOTHESIS 3] Error timing check:', performance.now());
            
            // Test Hypothesis 4: Browser Caching Issue
            console.log('🔍 [HYPOTHESIS 4] Error indicates network issue:', error.name === 'TypeError' || error.name === 'NetworkError');
            
            // Test Hypothesis 5: Configuration Override Problem
            console.log('🔍 [HYPOTHESIS 5] Error indicates configuration issue:', error.message.includes('Invalid API URL'));
            
            throw error;
        }
    }

    async logout() {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] LOGOUT METHOD - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] Logout called at:', new Date().toISOString());
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL before logout:', this.API_BASE_URL);
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] Global window.API_BASE_URL:', window.API_BASE_URL);
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Document readyState:', document.readyState);
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Current script execution time:', performance.now());
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Has this.API_BASE_URL been modified since constructor?');
        console.log('🔍 [HYPOTHESIS 5] Current this.API_BASE_URL:', this.API_BASE_URL);
        
        try {
            await this.request('/auth/logout', 'POST');
            console.log('🔍 [HYPOTHESIS TEST] Logout request successful');
        } catch (error) {
            console.log('🔍 [HYPOTHESIS TEST] Logout request failed:', error);
        }
        
        // Clear local storage
        localStorage.removeItem('jwtToken');
        localStorage.removeItem('user');
        localStorage.removeItem('csrfToken');
        this.csrfToken = null;
        
        console.log('🔍 [HYPOTHESIS TEST] Local storage cleared');
        console.log('🔍 [HYPOTHESIS TEST] Verification - jwtToken:', localStorage.getItem('jwtToken'));
        console.log('🔍 [HYPOTHESIS TEST] Verification - user:', localStorage.getItem('user'));
        console.log('🔍 [HYPOTHESIS TEST] Verification - csrfToken:', localStorage.getItem('csrfToken'));
    }

    isAuthenticated() {
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] ISAUTHENTICATED METHOD - TESTING ALL 5 HYPOTHESES');
        console.log('🔍 [HYPOTHESIS TEST] ==========================================');
        console.log('🔍 [HYPOTHESIS TEST] isAuthenticated called at:', new Date().toISOString());
        
        // Test Hypothesis 1: Environment Variable Missing
        console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
        console.log('🔍 [HYPOTHESIS 1] this.API_BASE_URL before check:', this.API_BASE_URL);
        
        // Test Hypothesis 2: Configuration File Loading Issue
        console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
        console.log('🔍 [HYPOTHESIS 2] Global window.API_BASE_URL:', window.API_BASE_URL);
        
        // Test Hypothesis 3: Script Loading Order Problem
        console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
        console.log('🔍 [HYPOTHESIS 3] Document readyState:', document.readyState);
        
        // Test Hypothesis 4: Browser Caching Issue
        console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
        console.log('🔍 [HYPOTHESIS 4] Current script execution time:', performance.now());
        
        // Test Hypothesis 5: Configuration Override Problem
        console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
        console.log('🔍 [HYPOTHESIS 5] Has this.API_BASE_URL been modified since constructor?');
        console.log('🔍 [HYPOTHESIS 5] Current this.API_BASE_URL:', this.API_BASE_URL);
        
        const token = localStorage.getItem('jwtToken');
        const user = localStorage.getItem('user');
        
        console.log('🔍 [HYPOTHESIS TEST] Token from localStorage:', token ? '[PRESENT]' : '[MISSING]');
        console.log('🔍 [HYPOTHESIS TEST] User from localStorage:', user ? '[PRESENT]' : '[MISSING]');
        
        const isAuth = !!(token && user);
        console.log('🔍 [HYPOTHESIS TEST] Authentication result:', isAuth);
        
        return isAuth;
    }
}

// Create global instance
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] GLOBAL INSTANCE CREATION - TESTING ALL 5 HYPOTHESES');
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] Creating global api instance at:', new Date().toISOString());
console.log('🔍 [HYPOTHESIS TEST] Window location:', window.location.href);
console.log('🔍 [HYPOTHESIS TEST] Document readyState:', document.readyState);

// Test Hypothesis 1: Environment Variable Missing
console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
console.log('🔍 [HYPOTHESIS 1] Global variables before instance creation:');
console.log('🔍 [HYPOTHESIS 1] - window.API_BASE_URL:', window.API_BASE_URL);
console.log('🔍 [HYPOTHESIS 1] - window.apiBaseUrl:', window.apiBaseUrl);
console.log('🔍 [HYPOTHESIS 1] - window.config:', window.config);

// Test Hypothesis 2: Configuration File Loading Issue
console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
console.log('🔍 [HYPOTHESIS 2] Scripts loaded before instance creation:', document.scripts.length);
console.log('🔍 [HYPOTHESIS 2] Script sources:', Array.from(document.scripts).map(s => s.src || 'inline'));

// Test Hypothesis 3: Script Loading Order Problem
console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
console.log('🔍 [HYPOTHESIS 3] Current script execution time:', performance.now());
console.log('🔍 [HYPOTHESIS 3] DOM ready state:', document.readyState);

// Test Hypothesis 4: Browser Caching Issue
console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
console.log('🔍 [HYPOTHESIS 4] Current script src:', document.currentScript?.src || 'inline script');

// Test Hypothesis 5: Configuration Override Problem
console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
console.log('🔍 [HYPOTHESIS 5] Global variables state before instance creation:');
console.log('🔍 [HYPOTHESIS 5] - window.API_BASE_URL:', window.API_BASE_URL);
console.log('🔍 [HYPOTHESIS 5] - window.apiBaseUrl:', window.apiBaseUrl);
console.log('🔍 [HYPOTHESIS 5] - window.config:', window.config);

const api = new APIClient();

console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] GLOBAL INSTANCE CREATED - TESTING ALL 5 HYPOTHESES');
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] Global api instance created successfully');
console.log('🔍 [HYPOTHESIS TEST] api.API_BASE_URL:', api.API_BASE_URL);
console.log('🔍 [HYPOTHESIS TEST] api.API_BASE_URL type:', typeof api.API_BASE_URL);
console.log('🔍 [HYPOTHESIS TEST] api.API_BASE_URL length:', api.API_BASE_URL ? api.API_BASE_URL.length : 'N/A');
console.log('🔍 [HYPOTHESIS TEST] api.API_BASE_URL === "/api":', api.API_BASE_URL === '/api');
console.log('🔍 [HYPOTHESIS TEST] Global window.api object:', window.api);
console.log('🔍 [HYPOTHESIS TEST] Global window.api type:', typeof window.api);
console.log('🔍 [HYPOTHESIS TEST] Global window.api constructor:', window.api?.constructor?.name);

// Test Hypothesis 1: Environment Variable Missing
console.log('🔍 [HYPOTHESIS 1] Testing: Environment Variable Missing');
console.log('🔍 [HYPOTHESIS 1] Instance API_BASE_URL is valid:', api.API_BASE_URL && api.API_BASE_URL !== 'undefined' && api.API_BASE_URL !== 'null');

// Test Hypothesis 2: Configuration File Loading Issue
console.log('🔍 [HYPOTHESIS 2] Testing: Configuration File Loading Issue');
console.log('🔍 [HYPOTHESIS 2] Instance created successfully:', api instanceof APIClient);

// Test Hypothesis 3: Script Loading Order Problem
console.log('🔍 [HYPOTHESIS 3] Testing: Script Loading Order Problem');
console.log('🔍 [HYPOTHESIS 3] Instance created at time:', performance.now());

// Test Hypothesis 4: Browser Caching Issue
console.log('🔍 [HYPOTHESIS 4] Testing: Browser Caching Issue');
console.log('🔍 [HYPOTHESIS 4] Instance constructor called successfully');

// Test Hypothesis 5: Configuration Override Problem
console.log('🔍 [HYPOTHESIS 5] Testing: Configuration Override Problem');
console.log('🔍 [HYPOTHESIS 5] Instance API_BASE_URL matches expected:', api.API_BASE_URL === '/api');

console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] ALL HYPOTHESES TESTED - GLOBAL INSTANCE READY');
console.log('🔍 [HYPOTHESIS TEST] ==========================================');

// CRITICAL FIX: Assign to global window object
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] GLOBAL ASSIGNMENT FIX - TESTING ALL 5 HYPOTHESES');
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] Assigning api instance to window.api');
console.log('🔍 [HYPOTHESIS TEST] Before assignment - window.api:', window.api);
console.log('🔍 [HYPOTHESIS TEST] Before assignment - typeof window.api:', typeof window.api);
console.log('🔍 [HYPOTHESIS TEST] Before assignment - window.api === undefined:', window.api === undefined);

window.api = api;

console.log('🔍 [HYPOTHESIS TEST] After assignment - window.api:', window.api);
console.log('🔍 [HYPOTHESIS TEST] After assignment - typeof window.api:', typeof window.api);
console.log('🔍 [HYPOTHESIS TEST] After assignment - window.api === api:', window.api === api);
console.log('🔍 [HYPOTHESIS TEST] After assignment - window.api.API_BASE_URL:', window.api.API_BASE_URL);
console.log('🔍 [HYPOTHESIS TEST] After assignment - window.api.API_BASE_URL === "/api":', window.api.API_BASE_URL === "/api");
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
console.log('🔍 [HYPOTHESIS TEST] GLOBAL ASSIGNMENT COMPLETED - ALL HYPOTHESES TESTED');
console.log('🔍 [HYPOTHESIS TEST] ==========================================');
