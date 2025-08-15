// Shared utility functions for the Massage Shop POS system

// Global data storage
let appData = {
    services: [],
    staff: [],
    transactions: [],
    expenses: []
};

// Configuration object
const CONFIG = {
    API_BASE_URL: '/api',
    APP_NAME: 'EIW Massage Shop POS',
    VERSION: '1.0.0'
};

// Load data from API
async function loadData() {
    try {
        console.log('🚀 DEBUG: Starting loadData() - loading configuration from API');
        
        // Load configuration from API
        console.log('🚀 DEBUG: Loading services...');
        const servicesResponse = await api.getServices();
        appData.services = servicesResponse.services || [];
        console.log('🚀 DEBUG: Services loaded:', appData.services.length);
        
        console.log('🚀 DEBUG: Loading staff...');
        const staffResponse = await api.getStaffRoster();
        appData.staff = staffResponse.staff || [];
        console.log('🚀 DEBUG: Staff loaded:', appData.staff.length);
        
        console.log('🚀 DEBUG: Loading recent transactions...');
        const transactionsResponse = await api.getRecentTransactions(10);
        appData.transactions = transactionsResponse.transactions || [];
        console.log('🚀 DEBUG: Transactions loaded:', appData.transactions.length);
        
        console.log('🚀 DEBUG: loadData() completed successfully');
        return appData;
        
    } catch (error) {
        console.error('❌ ERROR in loadData():', error);
        throw error;
    }
}

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        zIndex: '10000',
        maxWidth: '300px',
        wordWrap: 'break-word',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease-in-out'
    });
    
    // Set background color based on type
    const colors = {
        success: '#4caf50',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // Auto-remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time
function formatTime(time) {
    if (!time) return '';
    const d = new Date(`2000-01-01T${time}`);
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
}

// Validate email format
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Validate phone number format
function isValidPhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Debounce function for search inputs
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Deep clone object
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// Export functions to global scope
window.loadData = loadData;
window.showToast = showToast;
window.formatCurrency = formatCurrency;
window.formatDate = formatDate;
window.formatTime = formatTime;
window.isValidEmail = isValidEmail;
window.isValidPhone = isValidPhone;
window.debounce = debounce;
window.throttle = throttle;
window.generateId = generateId;
window.deepClone = deepClone;
window.CONFIG = CONFIG;
window.appData = appData;
