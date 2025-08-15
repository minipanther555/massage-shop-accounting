// API client for backend communication
const API_BASE_URL = '/api'; // Use relative path since frontend and backend are served from same origin

class APIClient {
    constructor() {
        this.API_BASE_URL = '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.API_BASE_URL}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': this.getCSRFToken()
            },
            ...options
        };

        if (options.body) {
            defaultOptions.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, defaultOptions);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: 'Failed to parse error response.' };
                }
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Extract CSRF token from response headers if present
            const csrfToken = response.headers.get('X-CSRF-Token');
            if (csrfToken) {
                this.setCSRFToken(csrfToken);
            }

            return data;
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    getCSRFToken() {
        return localStorage.getItem('csrfToken');
    }

    setCSRFToken(token) {
        localStorage.setItem('csrfToken', token);
    }

    async login(username, password) {
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

    async isAuthenticated() {
        const token = localStorage.getItem('jwtToken');
        const user = localStorage.getItem('user');
        
        const isAuth = !!(token && user);
        
        return isAuth;
    }
}

// Create global instance
const api = new APIClient();

// CRITICAL FIX: Assign to global window object
window.api = api;
