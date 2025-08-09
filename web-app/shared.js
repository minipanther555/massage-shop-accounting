// Shared JavaScript for Massage Shop POS
// Configuration - matches Google Sheets version
const CONFIG = {
    rosterSize: 20,
    settings: {
        masseuses: ["Anna", "Betty", "Carla", "Diana"],
        services: [
            {name: "Thai 60", price: 250, fee: 100},
            {name: "Neck and Shoulder", price: 150, fee: 60},
            {name: "Foot", price: 200, fee: 80},
            {name: "Oil", price: 400, fee: 150}
        ],
        paymentMethods: ["Cash", "Credit Card", "Voucher"]
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

// Load data from localStorage
function loadData() {
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

// Save data to localStorage
function saveData() {
    localStorage.setItem('massageShopData', JSON.stringify(appData));
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

// Serve next customer - port of Google Sheets function
function serveNextCustomer() {
    let nextMasseuseIndex = -1;
    let currentServingIndex = -1;

    // Find next available masseuse and current serving masseuse
    for (let i = 0; i < appData.roster.length; i++) {
        const masseuse = appData.roster[i];
        if ((masseuse.status === 'Available' || masseuse.status === 'Next') && nextMasseuseIndex === -1) {
            nextMasseuseIndex = i;
        }
        if (masseuse.status === 'Busy') {
            currentServingIndex = i;
        }
    }

    if (nextMasseuseIndex !== -1) {
        // Set current serving masseuse to break
        if (currentServingIndex !== -1) {
            appData.roster[currentServingIndex].status = 'Break';
        }
        
        // Set next masseuse to busy
        const nextMasseuse = appData.roster[nextMasseuseIndex];
        nextMasseuse.status = 'Busy';
        
        saveData();
        showToast(`${nextMasseuse.name} is now serving the next customer`);
        
        // Return the masseuse name for auto-selection in forms
        return nextMasseuse.name;
    } else {
        showToast("No masseuse is 'Available' or 'Next' in the roster", 'error');
        return null;
    }
}

// Submit transaction - port of Google Sheets function
function submitTransaction(formData) {
    // Validation
    if (!formData.masseuse || !formData.service || !formData.payment || !formData.startTime || !formData.endTime) {
        showToast("Masseuse, Service, Payment, and Times are required", 'error');
        return false;
    }

    // Get service details
    const service = CONFIG.settings.services.find(s => s.name === formData.service);
    if (!service) {
        showToast("Invalid service selected", 'error');
        return false;
    }

    // Create transaction
    const timestamp = new Date();
    const transactionId = timestamp.getTime().toString(); // Simple ID
    const status = appData.correctionMode ? `CORRECTED (Original: ${appData.originalTransactionId})` : "ACTIVE";

    const transaction = {
        id: transactionId,
        timestamp: timestamp,
        date: new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate()),
        masseuse: formData.masseuse,
        service: formData.service,
        paymentAmount: service.price,
        paymentMethod: formData.payment,
        masseuseeFee: service.fee,
        startTime: formData.startTime,
        endTime: formData.endTime,
        customerContact: formData.customerContact || "",
        status: status
    };

    // Add transaction
    appData.transactions.push(transaction);

    // Update masseuse count
    const masseuseInRoster = appData.roster.find(m => m.name === formData.masseuse);
    if (masseuseInRoster) {
        masseuseInRoster.todayCount++;
    }

    // Exit correction mode
    if (appData.correctionMode) {
        exitCorrectionMode();
    }

    saveData();
    showToast("Transaction logged successfully");
    return true;
}

// Load transaction for correction - port of Google Sheets function
function loadTransactionForCorrection() {
    // Find most recent ACTIVE transaction
    let mostRecentTransaction = null;
    for (let i = appData.transactions.length - 1; i >= 0; i--) {
        if (appData.transactions[i].status === "ACTIVE") {
            mostRecentTransaction = appData.transactions[i];
            break;
        }
    }

    if (!mostRecentTransaction) {
        showToast("No recent transactions found to correct", 'error');
        return null;
    }

    // Mark transaction as VOID
    mostRecentTransaction.status = "VOID";

    // Enter correction mode
    appData.correctionMode = true;
    appData.originalTransactionId = mostRecentTransaction.id;

    saveData();
    showToast(`Transaction ${mostRecentTransaction.id} is VOID and loaded for correction`);
    
    return mostRecentTransaction;
}

// Enter/exit correction mode
function enterCorrectionMode() {
    appData.correctionMode = true;
}

function exitCorrectionMode() {
    appData.correctionMode = false;
    appData.originalTransactionId = null;
}

// Add expense
function addExpense(description, amount) {
    if (!description || !amount || amount <= 0) {
        showToast("Please enter both description and valid amount", 'error');
        return false;
    }

    const expense = {
        id: Date.now().toString(),
        description: description,
        amount: amount,
        timestamp: new Date()
    };

    appData.expenses.push(expense);
    saveData();
    showToast(`Expense added: ${description} - ฿${amount.toFixed(2)}`);
    return true;
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

// End day - port of Google Sheets function
function endDay() {
    if (!confirm('Are you sure you want to end the day? This will archive today\'s data and reset the sheet for tomorrow.')) {
        return false;
    }

    try {
        // Export today's data first
        exportToCSV();

        // Reset roster statuses
        appData.roster.forEach(masseuse => {
            masseuse.status = 'Available';
            masseuse.todayCount = 0;
        });

        // Clear today's expenses
        appData.expenses = [];

        // Keep transactions but could archive old ones here
        // For now, keeping all transactions for historical data

        saveData();
        showToast('Day ended successfully. Data exported and sheet reset for tomorrow.');
        return true;
    } catch (error) {
        showToast('Error ending day: ' + error.message, 'error');
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

// Get today's summary data
function getTodaySummary() {
    const today = new Date().toDateString();
    const todayTransactions = appData.transactions.filter(t => 
        t.date && t.date.toDateString && t.date.toDateString() === today && 
        (t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
    );

    const todayRevenue = todayTransactions.reduce((sum, t) => sum + t.paymentAmount, 0);
    const todayCount = todayTransactions.length;
    const todayFees = todayTransactions.reduce((sum, t) => sum + t.masseuseeFee, 0);
    const todayExpenses = appData.expenses.reduce((sum, e) => sum + e.amount, 0);

    // All-time revenue
    const allTimeRevenue = appData.transactions
        .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
        .reduce((sum, t) => sum + t.paymentAmount, 0);

    // Payment breakdown for today
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

// Get recent transactions
function getRecentTransactions(limit = 5) {
    return appData.transactions
        .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'))
        .slice(-limit)
        .reverse();
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
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initializeRoster();
});
