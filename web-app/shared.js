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

// Make appData globally accessible to fix scope issues
window.appData = appData;

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
            duration: s.duration_minutes,
            location: s.location,
            price: s.price,
            fee: s.masseuse_fee
        }));
        CONFIG.settings.paymentMethods = paymentMethods.map(p => p.method_name);
        
        // Load roster
        appData.roster = roster.map(r => ({
            position: r.position,
            name: r.masseuse_name || "",
            status: r.status || null,
            busy_until: r.busy_until || null,
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
    console.log('🔄 STEP 9: loadTodayData() called - starting data refresh...');
    console.log('🔄 STEP 9: Current appData.transactions BEFORE refresh:', appData.transactions);
    console.log('🔄 STEP 9: Current appData.transactions length BEFORE refresh:', appData.transactions?.length);
    
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log('🔄 STEP 9: Target date for data refresh:', today);
        
        console.log('🔄 STEP 9: Calling Promise.all for recentTransactions and expenses...');
        const [recentTransactions, expenses] = await Promise.all([
            api.getRecentTransactions(50), // Get more for today's view
            api.getExpenses(today)
        ]);
        
        console.log('🔄 STEP 9: API responses received:');
        console.log('🔄 STEP 9: recentTransactions API response:', recentTransactions);
        console.log('🔄 STEP 9: recentTransactions length:', recentTransactions?.length);
        console.log('🔄 STEP 9: recentTransactions type:', typeof recentTransactions);
        console.log('🔄 STEP 9: recentTransactions is array:', Array.isArray(recentTransactions));
        console.log('🔄 STEP 9: expenses API response:', expenses);
        console.log('🔄 STEP 9: expenses length:', expenses?.length);
        
        // Check if recentTransactions has the expected structure
        if (recentTransactions && recentTransactions.length > 0) {
            console.log('🔄 STEP 9: First transaction structure check:');
            const firstTransaction = recentTransactions[0];
            console.log('🔄 STEP 9: First transaction keys:', Object.keys(firstTransaction));
            console.log('🔄 STEP 9: First transaction sample:', firstTransaction);
        }
        
        console.log('🔄 STEP 9: Starting transaction mapping...');
        console.log('🔄 STEP 9: recentTransactions before mapping:', recentTransactions);
        console.log('🔄 STEP 9: recentTransactions keys (if object):', recentTransactions ? Object.keys(recentTransactions) : 'N/A');
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
        
        console.log('🔄 STEP 9: Transaction mapping completed:');
        console.log('🔄 STEP 9: Mapped transactions count:', appData.transactions.length);
        console.log('🔄 STEP 9: First mapped transaction:', appData.transactions[0]);
        console.log('🔄 STEP 9: All mapped transactions:', appData.transactions);
        
        // Check if our new transaction (May เมย์, Foot massage, ฿650) is in the mapped data
        if (appData.transactions.length > 0) {
            const newTransactionFound = appData.transactions.some(t => 
                t.masseuse === 'May เมย์' && 
                t.service === 'Foot massage' && 
                t.paymentAmount === 650
            );
            console.log('🔍 STEP 9: New transaction (May เมย์, Foot massage, ฿650) found in mapped data:', newTransactionFound);
            
            if (newTransactionFound) {
                const foundTransaction = appData.transactions.find(t => 
                    t.masseuse === 'May เมย์' && 
                    t.service === 'Foot massage' && 
                    t.paymentAmount === 650
                );
                console.log('✅ STEP 9: Found new transaction details:', foundTransaction);
            }
        }

        appData.expenses = expenses.map(e => ({
            id: e.id.toString(),
            description: e.description,
            amount: e.amount,
            timestamp: new Date(e.timestamp)
        }));
        
        console.log('🔄 STEP 9: Expenses mapping completed:');
        console.log('🔄 STEP 9: Mapped expenses count:', appData.expenses.length);
        console.log('🔄 STEP 9: All mapped expenses:', appData.expenses);
        
        console.log('✅ STEP 9: loadTodayData() completed successfully');
        console.log('✅ STEP 9: Final appData.transactions length:', appData.transactions.length);
        console.log('✅ STEP 9: Final appData.expenses length:', appData.expenses.length);
        
    } catch (error) {
        console.error('❌ STEP 9: loadTodayData() failed with error:', error);
        console.error('❌ STEP 9: Error stack:', error.stack);
        appData.transactions = [];
        appData.expenses = [];
        throw error; // Re-throw to let caller handle it
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

// Format time as h:mm AM/PM in Bangkok timezone
function formatTime(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Bangkok'
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
    console.log('🔍 SUBMIT TRANSACTION - RECEIVED FORM DATA:', formData);
    
    // Validation - check for all required fields
    if (!formData.masseuse || !formData.service || !formData.payment || !formData.startTime || !formData.endTime) {
        showToast("Masseuse, Service, Payment, and Times are required", 'error');
        return false;
    }
    
    // Additional validation for critical fields
    if (!formData.location || !formData.duration || !formData.price || !formData.masseuseFee) {
        showToast("Location, Duration, Price, and Masseuse Fee are required", 'error');
        return false;
    }

    try {
        // Transform frontend field names to backend field names
        const transactionData = {
            masseuse_name: formData.masseuse,
            service_type: formData.service,
            location: formData.location,
            duration: formData.duration,
            price: formData.price,
            masseuse_fee: formData.masseuseFee,
            payment_method: formData.payment,
            start_time: formData.startTime,
            end_time: formData.endTime,
            customer_contact: formData.customerContact || "",
            corrected_transaction_id: appData.correctionMode ? appData.originalTransactionId : null
        };

        console.log('🚀 SUBMITTING TRANSACTION - TRANSFORMED DATA:', transactionData);
        console.log('🔍 FIELD MAPPING VERIFICATION:');
        console.log('  Frontend → Backend:');
        console.log('    masseuse → masseuse_name:', formData.masseuse, '→', transactionData.masseuse_name);
        console.log('    service → service_type:', formData.service, '→', transactionData.service_type);
        console.log('    location → location:', formData.location, '→', transactionData.location);
        console.log('    duration → duration:', formData.duration, '→', transactionData.duration);
        console.log('    price → price:', formData.price, '→', transactionData.price);
        console.log('    masseuseFee → masseuse_fee:', formData.masseuseFee, '→', transactionData.masseuse_fee);
        console.log('    payment → payment_method:', formData.payment, '→', transactionData.payment_method);
        console.log('    startTime → start_time:', formData.startTime, '→', transactionData.start_time);
        console.log('    endTime → end_time:', formData.endTime, '→', transactionData.end_time);
        console.log('    customerContact → customer_contact:', formData.customerContact, '→', transactionData.customer_contact);
        
        const newTransaction = await api.createTransaction(transactionData);
        console.log('✅ TRANSACTION RESPONSE:', newTransaction);

        // Exit correction mode
        if (appData.correctionMode) {
            exitCorrectionMode();
        }

        // 🔧 STEP 8: Add comprehensive logging and error handling for data refresh
        console.log('🔄 STEP 8: Starting data refresh after transaction creation...');
        console.log('🔄 STEP 8: appData.transactions BEFORE loadTodayData:', appData.transactions);
        console.log('🔄 STEP 8: appData.transactions length BEFORE loadTodayData:', appData.transactions?.length);
        
        try {
            // Refresh data
            console.log('🔄 STEP 8: Calling loadTodayData()...');
            await loadTodayData();
            console.log('🔄 STEP 8: loadTodayData() completed successfully');
            console.log('🔄 STEP 8: appData.transactions AFTER loadTodayData:', appData.transactions);
            console.log('🔄 STEP 8: appData.transactions length AFTER loadTodayData:', appData.transactions?.length);
            
            // Verify data was loaded correctly
            if (appData.transactions && appData.transactions.length > 0) {
                console.log('✅ STEP 8: Data refresh successful - transactions loaded:', appData.transactions.length);
                
                // Check if our new transaction is in the list
                const newTransactionFound = appData.transactions.some(t => 
                    t.masseuse === formData.masseuse && 
                    t.service === formData.service && 
                    t.paymentAmount === formData.price
                );
                console.log('🔍 STEP 8: New transaction found in refreshed data:', newTransactionFound);
                
                if (newTransactionFound) {
                    console.log('✅ STEP 8: SUCCESS - New transaction appears in refreshed data');
                } else {
                    console.log('❌ STEP 8: WARNING - New transaction NOT found in refreshed data');
                    console.log('🔍 STEP 8: This suggests the transaction was not stored in the database or there is a data mapping issue');
                }
            } else {
                console.log('❌ STEP 8: ERROR - Data refresh failed - appData.transactions is empty or undefined');
                console.log('🔍 STEP 8: This suggests loadTodayData() is not working correctly');
            }
        } catch (refreshError) {
            console.error('❌ STEP 8: ERROR during data refresh:', refreshError);
            console.log('🔄 STEP 8: Attempting fallback data refresh...');
            
            // Fallback: try to manually refresh transaction data
            try {
                console.log('🔄 STEP 8: Fallback - manually calling API to get recent transactions...');
                const recentTransactions = await api.getRecentTransactions(50);
                console.log('🔄 STEP 8: Fallback - API response:', recentTransactions);
                
                if (recentTransactions && recentTransactions.length > 0) {
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
                    console.log('✅ STEP 8: Fallback successful - transactions loaded:', appData.transactions.length);
                } else {
                    console.log('❌ STEP 8: Fallback failed - no transactions returned from API');
                }
            } catch (fallbackError) {
                console.error('❌ STEP 8: Fallback also failed:', fallbackError);
            }
        }

        showToast("Transaction logged successfully");
        return true;
    } catch (error) {
        console.error('❌ STEP 8: Transaction creation failed:', error);
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
    console.log('🌙 END DAY: Function called');
    
    if (!confirm('Are you sure you want to end the day? This will archive today\'s data to the database and reset the system for tomorrow.')) {
        console.log('🌙 END DAY: User cancelled');
        return false;
    }

    try {
        console.log('🌙 END DAY: Making API call...');
        // Call API end day function
        const result = await api.endDay();
        console.log('🌙 END DAY: API response:', result);

        // Refresh all data to show reset state
        await loadData();

        console.log('🌙 END DAY: About to show toast with result:', result);
        console.log('🌙 END DAY: daily_summary:', result.daily_summary);
        console.log('🌙 END DAY: showToast function exists?', typeof showToast);
        
        const message = `Day ended successfully! 
📊 Daily Summary: ${result.daily_summary.total_transactions} transactions, Revenue: ฿${result.daily_summary.total_revenue}
🗑️ Cleared: ${result.cleared_transactions} transactions, ${result.cleared_expenses} expenses
✅ System reset for tomorrow.`;
        console.log('🌙 END DAY: Toast message:', message);
        
        showToast(message);
        
        // Backup notification in case toast doesn't work
        alert(message);
        
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
    console.log('🔄 STEP 10: getRecentTransactions() called with limit:', limit);
    console.log('🔄 STEP 10: Current appData.transactions:', appData.transactions);
    console.log('🔄 STEP 10: Current appData.transactions length:', appData.transactions?.length);
    
    if (!appData.transactions || appData.transactions.length === 0) {
        console.log('❌ STEP 10: WARNING - appData.transactions is empty or undefined');
        console.log('🔄 STEP 10: Returning empty array');
        return [];
    }
    
    console.log('🔄 STEP 10: Filtering transactions by status...');
    const filtered = appData.transactions
        .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'));
    console.log('🔄 STEP 10: Filtered transactions count:', filtered.length);
    console.log('🔄 STEP 10: Filtered transactions:', filtered);
    
    console.log('🔄 STEP 10: Applying limit and reversing order...');
    const recent = filtered.slice(-limit).reverse();
    console.log('🔄 STEP 10: Final recent transactions count:', recent.length);
    console.log('🔄 STEP 10: Final recent transactions:', recent);
    
    // Check if our new transaction (May เมย์, Foot massage, ฿650) is in the filtered result
    if (recent.length > 0) {
        const newTransactionFound = recent.some(t => 
            t.masseuse === 'May เมย์' && 
            t.service === 'Foot massage' && 
            t.paymentAmount === 650
        );
        console.log('🔍 STEP 10: New transaction (May เมย์, Foot massage, ฿650) found in filtered result:', newTransactionFound);
        
        if (newTransactionFound) {
            const foundTransaction = recent.find(t => 
                t.masseuse === 'May เมย์' && 
                t.service === 'Foot massage' && 
                t.paymentAmount === 650
            );
            console.log('✅ STEP 10: Found new transaction in filtered result:', foundTransaction);
        }
    }
    
    console.log('✅ STEP 10: getRecentTransactions() returning:', recent);
    return recent;
}

// Authentication utilities
function getCurrentUser() {
    const userStr = localStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function isLoggedIn() {
    // Session is now handled by cookies, so we'll check if we have user data
    const user = getCurrentUser();
    return !!user;
}

function hasRole(requiredRole) {
    const user = getCurrentUser();
    if (!user) return false;
    
    // Manager has access to everything
    if (user.role === 'manager') return true;
    
    // Check specific role
    return user.role === requiredRole;
}

function requireAuth(requiredRole = null) {
    if (!isLoggedIn()) {
        console.log('❌ AUTH: Not logged in, redirecting to login');
        window.location.href = '/login.html';
        return false;
    }
    
    if (requiredRole && !hasRole(requiredRole)) {
        console.log('❌ AUTH: Insufficient permissions, required:', requiredRole);
        if (requiredRole === 'manager') {
            showToast('Manager access required. Redirecting to dashboard...', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showToast(`Access denied. ${requiredRole} role required.`, 'error');
        }
        return false;
    }
    
    return true;
}

async function logout() {
    try {
        console.log('👋 LOGOUT: Attempting logout...');
        await api.logout();
        
        localStorage.removeItem('currentUser');
        
        console.log('✅ LOGOUT: Success');
        window.location.href = '/login.html';
        
    } catch (error) {
        console.error('🚨 LOGOUT ERROR:', error);
        // Force logout even if API call fails
        localStorage.removeItem('currentUser');
        window.location.href = '/login.html';
    }
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
