// Shared JavaScript for Massage Shop POS (API-backed version)
// Configuration - loaded from backend API
let CONFIG = {
    rosterSize: 20,
    settings: {
        masseuses: [],
        services: [],
        paymentMethods: []
    }
};

// Application state
let appData = {
    transactions: [],
    roster: [],
    expenses: [],
    correctionMode: false,
    originalTransactionId: null
};

// Load data from API
async function loadData() {
    try {
        console.log('🚀 DEBUG: Starting loadData() - loading configuration from API');
        
        // Load configuration from API
        console.log('🚀 DEBUG: Calling Promise.all for services, paymentMethods, roster');
        const [services, paymentMethods, roster] = await Promise.all([
            api.getServices(),
            api.getPaymentMethods(),
            api.getStaffRoster()
        ]);
        
        console.log('🚀 DEBUG: Promise.all completed successfully');
        console.log('🚀 DEBUG: Services received:', services);
        console.log('🚀 DEBUG: Payment methods received:', paymentMethods);
        console.log('🚀 DEBUG: Roster received:', roster);

        CONFIG.settings.services = services.map(s => ({
            name: s.service_name,
            price: s.price,
            fee: s.masseuse_fee
        }));
        CONFIG.settings.paymentMethods = paymentMethods.map(p => p.method_name);
        
        // Load roster
        appData.roster = roster.map(r => ({
            position: r.position,
            name: r.masseuse_name || "",
            status: r.status,
            todayCount: r.today_massages || 0
        }));

        // Extract unique masseuse names for CONFIG
        CONFIG.settings.masseuses = [...new Set(roster
            .filter(r => r.masseuse_name)
            .map(r => r.masseuse_name)
        )];

        // Load today's data
        await loadTodayData();
        
        console.log('Data loaded from API successfully');
    } catch (error) {
        console.error('🚨 ERROR in loadData():', error);
        console.error('🚨 ERROR TYPE:', error.constructor.name);
        console.error('🚨 ERROR MESSAGE:', error.message);
        console.error('🚨 ERROR STACK:', error.stack);
        
        console.log('🚨 SHOWING ERROR TOAST: Failed to connect to server');
        showToast('Failed to connect to server', 'error');
        // Fallback to localStorage if API fails
        console.log('🚀 DEBUG: Attempting fallback to localStorage');
        loadDataFromLocalStorage();
    }
}

// Fallback localStorage function
function loadDataFromLocalStorage() {
    const saved = localStorage.getItem('massageShopData');
    if (saved) {
        appData = JSON.parse(saved);
        // Convert date strings back to Date objects
        appData.transactions.forEach(t => {
            if (typeof t.timestamp === 'string') t.timestamp = new Date(t.timestamp);
            if (typeof t.date === 'string') t.date = new Date(t.date);
        });
        appData.expenses.forEach(e => {
            if (typeof e.timestamp === 'string') e.timestamp = new Date(e.timestamp);
        });
    }
    // Ensure all required arrays exist
    if (!appData.transactions) appData.transactions = [];
    if (!appData.roster) appData.roster = [];
    if (!appData.expenses) appData.expenses = [];
}

// Load today's transactions and expenses
async function loadTodayData() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const [recentTransactions, expenses] = await Promise.all([
            api.getRecentTransactions(50), // Get more for today's view
            api.getExpenses(today)
        ]);

        appData.transactions = recentTransactions.map(t => ({
            id: t.transaction_id,
            timestamp: new Date(t.timestamp),
            date: new Date(t.date),
            masseuse: t.masseuse_name,
            service: t.service_type,
            paymentAmount: t.payment_amount,
            paymentMethod: t.payment_method,
            masseuseeFee: t.masseuse_fee,
            startTime: t.start_time,
            endTime: t.end_time,
            customerContact: t.customer_contact || "",
            status: t.status
        }));
        
        console.log('🔍 MAPPED TRANSACTIONS:', appData.transactions);

        appData.expenses = expenses.map(e => ({
            id: e.id.toString(),
            description: e.description,
            amount: e.amount,
            timestamp: new Date(e.timestamp)
        }));
    } catch (error) {
        console.error('Failed to load today\'s data:', error);
        appData.transactions = [];
        appData.expenses = [];
    }
}

// Save data to API (no-op since API handles persistence)
function saveData() {
    // Data is automatically saved to API on each operation
    // Keep this function for compatibility with existing code
}

// Initialize roster with default masseuses
function initializeRoster() {
    if (appData.roster.length === 0) {
        for (let i = 0; i < CONFIG.rosterSize; i++) {
            appData.roster.push({
                position: i + 1,
                name: i < CONFIG.settings.masseuses.length ? CONFIG.settings.masseuses[i] : "",
                status: "Available",
                todayCount: 0
            });
        }
    }
    // Recalculate today's counts
    calculateTodayCounts();
}

// Calculate today's massage counts for each masseuse
function calculateTodayCounts() {
    const today = new Date().toDateString();
    
    // Reset all counts
    appData.roster.forEach(masseuse => {
        masseuse.todayCount = 0;
    });
    
    // Count today's transactions
    appData.transactions.forEach(transaction => {
        if (transaction.date && transaction.date.toDateString() === today && 
            (transaction.status === 'ACTIVE' || transaction.status.includes('CORRECTED'))) {
            const masseuse = appData.roster.find(m => m.name === transaction.masseuse);
            if (masseuse) {
                masseuse.todayCount++;
            }
        }
    });
}

// Format time as h:mm AM/PM
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Serve next customer - API version
async function serveNextCustomer() {
    try {
        const result = await api.serveNextCustomer();
        showToast(`${result.masseuse} is now serving the next customer`);
        
        // Refresh roster data
        await loadData();
        
        // Return the masseuse name for auto-selection in forms
        return result.masseuse;
    } catch (error) {
        showToast(error.message || "No masseuse is available", 'error');
        return null;
    }
}

// Submit transaction - API version
async function submitTransaction(formData) {
    // Validation
    if (!formData.masseuse || !formData.service || !formData.payment || !formData.startTime || !formData.endTime) {
        showToast("Masseuse, Service, Payment, and Times are required", 'error');
        return false;
    }

    try {
        const transactionData = {
            masseuse_name: formData.masseuse,
            service_type: formData.service,
            payment_method: formData.payment,
            start_time: formData.startTime,
            end_time: formData.endTime,
            customer_contact: formData.customerContact || "",
            corrected_transaction_id: appData.correctionMode ? appData.originalTransactionId : null
        };

        console.log('🚀 SUBMITTING TRANSACTION:', transactionData);
        const newTransaction = await api.createTransaction(transactionData);
        console.log('✅ TRANSACTION RESPONSE:', newTransaction);

        // Exit correction mode
        if (appData.correctionMode) {
            exitCorrectionMode();
        }

        // Refresh data
        await loadTodayData();

        showToast("Transaction logged successfully");
        return true;
    } catch (error) {
        showToast(`Failed to create transaction: ${error.message}`, 'error');
        return false;
    }
}

// Load transaction for correction - API version
async function loadTransactionForCorrection() {
    try {
        const transaction = await api.getLatestTransactionForCorrection();
        
        // Enter correction mode
        appData.correctionMode = true;
        appData.originalTransactionId = transaction.transaction_id;

        showToast(`Transaction ${transaction.transaction_id} is VOID and loaded for correction`);
        
        // Convert API format to local format for form population
        return {
            id: transaction.transaction_id,
            timestamp: new Date(transaction.timestamp),
            date: new Date(transaction.date),
            masseuse: transaction.masseuse_name,
            service: transaction.service_type,
            paymentAmount: transaction.payment_amount,
            paymentMethod: transaction.payment_method,
            masseuseeFee: transaction.masseuse_fee,
            startTime: transaction.start_time,
            endTime: transaction.end_time,
            customerContact: transaction.customer_contact || "",
            status: transaction.status
        };
    } catch (error) {
        showToast(error.message || "No recent transactions found to correct", 'error');
        return null;
    }
}

// Enter/exit correction mode
function enterCorrectionMode() {
    appData.correctionMode = true;
}

function exitCorrectionMode() {
    appData.correctionMode = false;
    appData.originalTransactionId = null;
}

// Add expense - API version
async function addExpense(description, amount) {
    if (!description || !amount || amount <= 0) {
        showToast("Please enter both description and valid amount", 'error');
        return false;
    }

    try {
        const expenseData = {
            description: description,
            amount: amount
        };

        await api.createExpense(expenseData);
        
        // Refresh expenses
        await loadTodayData();
        
        showToast(`Expense added: ${description} - ฿${amount.toFixed(2)}`);
        return true;
    } catch (error) {
        showToast(`Failed to add expense: ${error.message}`, 'error');
        return false;
    }
}

// Remove expense
function removeExpense(index) {
    const expense = appData.expenses[index];
    if (confirm(`Remove expense: ${expense.description} - ฿${expense.amount.toFixed(2)}?`)) {
        appData.expenses.splice(index, 1);
        saveData();
        showToast('Expense removed');
        return true;
    }
    return false;
}

// End day - API version (database archiving instead of CSV)
async function endDay() {
    if (!confirm('Are you sure you want to end the day? This will archive today\'s data to the database and reset the system for tomorrow.')) {
        return false;
    }

    try {
        // Call API end day function
        const result = await api.endDay();

        // Refresh all data to show reset state
        await loadData();

        showToast(`Day ended successfully. ${result.archived_transactions} transactions archived. System reset for tomorrow.`);
        return true;
    } catch (error) {
        showToast(`Error ending day: ${error.message}`, 'error');
        return false;
    }
}

// Export to CSV
function exportToCSV() {
    const today = new Date().toDateString();
    const todayTransactions = appData.transactions.filter(t => 
        t.date && t.date.toDateString && t.date.toDateString() === today
    );

    if (todayTransactions.length === 0 && appData.expenses.length === 0) {
        showToast('No data to export today', 'error');
        return;
    }

    let csv = 'Type,Timestamp,Description,Amount,Details\n';
    
    // Add transactions
    todayTransactions.forEach(t => {
        csv += `Transaction,"${t.timestamp}","${t.service} - ${t.masseuse}",${t.paymentAmount},"${t.paymentMethod} | ${t.startTime}-${t.endTime} | ${t.status}"\n`;
    });

    // Add expenses
    appData.expenses.forEach(e => {
        csv += `Expense,"${e.timestamp}","${e.description}",${e.amount},"Daily Expense"\n`;
    });

    // Download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `massage-shop-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    showToast('Data exported successfully');
}

// Get today's summary data - API enhanced version
async function getTodaySummary() {
    try {
        // Get summary from API for accuracy
        const [transactionSummary, expenseSummary] = await Promise.all([
            api.getTodayTransactionSummary(),
            api.getTodayExpenseSummary()
        ]);

        // Get all-time revenue from transactions
        const allTimeRevenue = appData.transactions
            .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
            .reduce((sum, t) => sum + t.paymentAmount, 0);

        // Local data for payment breakdown
        const today = new Date().toDateString();
        const todayTransactions = appData.transactions.filter(t => 
            t.date && t.date.toDateString && t.date.toDateString() === today && 
            (t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
        );

        // Convert API payment breakdown to local format
        const paymentBreakdown = {};
        if (transactionSummary.payment_breakdown) {
            transactionSummary.payment_breakdown.forEach(p => {
                paymentBreakdown[p.payment_method] = {
                    revenue: p.revenue,
                    count: p.count
                };
            });
        }

        return {
            todayRevenue: transactionSummary.total_revenue || 0,
            todayCount: transactionSummary.transaction_count || 0,
            todayFees: transactionSummary.total_fees || 0,
            todayExpenses: expenseSummary.total_expenses || 0,
            allTimeRevenue,
            paymentBreakdown,
            transactions: todayTransactions
        };
    } catch (error) {
        console.error('Failed to get summary from API, using local data:', error);
        
        // Fallback to local calculation
        const today = new Date().toDateString();
        const todayTransactions = appData.transactions.filter(t => 
            t.date && t.date.toDateString && t.date.toDateString() === today && 
            (t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
        );

        const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.paymentAmount, 0);
        const todayCount = todayTransactions.length;
        const todayFees = todayTransactions.reduce((sum, t) => sum + t.masseuseeFee, 0);
        const todayExpenses = appData.expenses.reduce((sum, e) => sum + e.amount, 0);

        const allTimeRevenue = appData.transactions
            .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
            .reduce((sum, t) => sum + t.paymentAmount, 0);

        const paymentBreakdown = {};
        todayTransactions.forEach(t => {
            if (!paymentBreakdown[t.paymentMethod]) {
                paymentBreakdown[t.paymentMethod] = { revenue: 0, count: 0 };
            }
            paymentBreakdown[t.paymentMethod].revenue += t.paymentAmount;
            paymentBreakdown[t.paymentMethod].count++;
        });

        return {
            todayRevenue,
            todayCount,
            todayFees,
            todayExpenses,
            allTimeRevenue,
            paymentBreakdown,
            transactions: todayTransactions
        };
    }
}

// Get recent transactions
function getRecentTransactions(limit = 5) {
    console.log('🔍 ALL TRANSACTIONS:', appData.transactions);
    const filtered = appData.transactions
        .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'));
    console.log('🔍 FILTERED TRANSACTIONS:', filtered);
    const recent = filtered.slice(-limit).reverse();
    console.log('🔍 RECENT TRANSACTIONS:', recent);
    return recent;
}

// Show toast notification
function showToast(message, type = 'success') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Auto-save periodically
setInterval(saveData, 30000); // Save every 30 seconds

// Initialize data when any page loads
document.addEventListener('DOMContentLoaded', async function() {
    await loadData();
    // Don't call initializeRoster - data comes from API now
});
