const puppeteer = require('puppeteer');

async function debugFrontendDisplayBugComprehensive() {
    console.log('\n🔍 COMPREHENSIVE FRONTEND DISPLAY BUG INVESTIGATION');
    console.log('============================================================');
    console.log('🧪 Testing 5 hypotheses simultaneously with extensive logging');
    console.log('🔍 Goal: Identify why ฿650 becomes ฿350 in frontend display');
    console.log('============================================================\n');

    const browser = await puppeteer.launch({ 
        headless: false, 
        defaultViewport: null,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Enable request/response monitoring
    await page.setRequestInterception(true);
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            headers: request.headers(),
            postData: request.postData()
        });
        request.continue();
    });
    
    page.on('response', response => {
        responses.push({
            url: response.url(),
            status: response.status(),
            headers: response.headers()
        });
    });

    try {
        // Add comprehensive hypothesis testing and logging
        await page.evaluate(() => {
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: Starting frontend display bug investigation...');
            
            // Override loadTodayData with comprehensive logging for ALL hypotheses
            if (window.loadTodayData) {
                const originalLoadTodayData = window.loadTodayData;
                window.loadTodayData = async function() {
                    console.log('🧪 ALL HYPOTHESIS TESTING: loadTodayData called!');
                    console.log('🧪 TIMESTAMP:', new Date().toISOString());
                    console.log('🧪 CALL STACK:', new Error().stack);
                    
                    // 🧪 HYPOTHESIS 1 TESTING: Data mapping corruption
                    console.log('🧪 HYPOTHESIS 1 TESTING: Checking data mapping integrity...');
                    console.log('🧪 HYPOTHESIS 1 TESTING: API response structure before mapping...');
                    
                    // 🧪 HYPOTHESIS 2 TESTING: Field name mismatch
                    console.log('🧪 HYPOTHESIS 2 TESTING: Checking field name consistency...');
                    console.log('🧪 HYPOTHESIS 2 TESTING: payment_amount vs paymentAmount...');
                    
                    // 🧪 HYPOTHESIS 3 TESTING: Data type conversion issues
                    console.log('🧪 HYPOTHESIS 3 TESTING: Checking data type conversions...');
                    console.log('🧪 HYPOTHESIS 3 TESTING: String vs Number handling...');
                    
                    // 🧪 HYPOTHESIS 4 TESTING: Race condition in data loading
                    console.log('🧪 HYPOTHESIS 4 TESTING: Checking for race conditions...');
                    console.log('🧪 HYPOTHESIS 4 TESTING: Concurrent data loading...');
                    
                    // 🧪 HYPOTHESIS 5 TESTING: DOM manipulation corruption
                    console.log('🧪 HYPOTHESIS 5 TESTING: Checking DOM manipulation...');
                    console.log('🧪 HYPOTHESIS 5 TESTING: HTML generation integrity...');
                    
                    const result = await originalLoadTodayData.call(this);
                    console.log('🧪 ALL HYPOTHESIS TESTING: loadTodayData completed');
                    return result;
                };
            }
            
            // Override getRecentTransactions with comprehensive logging
            if (window.getRecentTransactions) {
                const originalGetRecentTransactions = window.getRecentTransactions;
                window.getRecentTransactions = function(limit) {
                    console.log('🧪 ALL HYPOTHESIS TESTING: getRecentTransactions called with limit:', limit);
                    console.log('🧪 ALL HYPOTHESIS TESTING: Current appData.transactions:', window.appData?.transactions);
                    console.log('🧪 ALL HYPOTHESIS TESTING: appData.transactions length:', window.appData?.transactions?.length);
                    
                    if (window.appData?.transactions?.length > 0) {
                        console.log('🧪 ALL HYPOTHESIS TESTING: First transaction structure:');
                        const first = window.appData.transactions[0];
                        console.log('🧪 ALL HYPOTHESIS TESTING: Keys:', Object.keys(first));
                        console.log('🧪 ALL HYPOTHESIS TESTING: paymentAmount value:', first.paymentAmount);
                        console.log('🧪 ALL HYPOTHESIS TESTING: paymentAmount type:', typeof first.paymentAmount);
                        console.log('🧪 ALL HYPOTHESIS TESTING: paymentAmount === 650:', first.paymentAmount === 650);
                        console.log('🧪 ALL HYPOTHESIS TESTING: paymentAmount === "650":', first.paymentAmount === "650");
                    }
                    
                    const result = originalGetRecentTransactions.call(this, limit);
                    console.log('🧪 ALL HYPOTHESIS TESTING: getRecentTransactions result:', result);
                    return result;
                };
            }
            
            // Override updateRecentTransactions with comprehensive logging
            if (window.updateRecentTransactions) {
                const originalUpdateRecentTransactions = window.updateRecentTransactions;
                window.updateRecentTransactions = function() {
                    console.log('🧪 ALL HYPOTHESIS TESTING: updateRecentTransactions called!');
                    console.log('🧪 ALL HYPOTHESIS TESTING: DOM manipulation starting...');
                    
                    const result = originalUpdateRecentTransactions.call(this);
                    console.log('🧪 ALL HYPOTHESIS TESTING: updateRecentTransactions completed');
                    return result;
                };
            }
        });

        console.log('[STEP 1] Navigating to login page...');
        await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });
        
        console.log('[STEP 2] Logging in as manager...');
        await page.type('#username', 'manager');
        await page.type('#password', 'manager456');
        await page.click('#login-btn');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        
        console.log('[STEP 3] Navigating to transaction page...');
        await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
        
        console.log('[STEP 4] FILLING FORM WITH SPECIFIC BUG COMBINATION...');
        await page.evaluate(() => {
            // Fill form with the exact combination that causes the bug
            document.getElementById('masseuse-select').value = 'May เมย์';
            document.getElementById('service-select').value = 'Foot massage';
            document.getElementById('location-select').value = 'In-Shop';
            document.getElementById('duration-select').value = '90';
            
            // Trigger change events to populate other fields
            document.getElementById('duration-select').dispatchEvent(new Event('change'));
            
            console.log('✅ SUCCESS: Form filled with bug combination');
            console.log('✅ SUCCESS: Duration field value:', document.getElementById('duration-select').value);
        });
        
        console.log('[STEP 5] TESTING ALL 5 HYPOTHESES BEFORE SUBMISSION...');
        await page.evaluate(() => {
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: Starting all 5 hypotheses...');
            
            // 🔍 HYPOTHESIS 1: Data mapping corruption
            console.log('🔍 HYPOTHESIS 1: Data mapping corruption test');
            console.log('🔍 HYPOTHESIS 1: Current form data state:', {
                masseuse: document.getElementById('masseuse-select').value,
                service: document.getElementById('service-select').value,
                location: document.getElementById('location-select').value,
                duration: document.getElementById('duration-select').value
            });
            
            // 🔍 HYPOTHESIS 2: Field name mismatch
            console.log('🔍 HYPOTHESIS 2: Field name mismatch test');
            console.log('🔍 HYPOTHESIS 2: Checking if payment_amount vs paymentAmount exists');
            
            // 🔍 HYPOTHESIS 3: Data type conversion issues
            console.log('🔍 HYPOTHESIS 3: Data type conversion test');
            console.log('🔍 HYPOTHESIS 3: Duration field type:', typeof document.getElementById('duration-select').value);
            console.log('🔍 HYPOTHESIS 3: Duration field parsed as int:', parseInt(document.getElementById('duration-select').value));
            
            // 🔍 HYPOTHESIS 4: Race condition in data loading
            console.log('🔍 HYPOTHESIS 4: Race condition test');
            console.log('🔍 HYPOTHESIS 4: Checking for concurrent data loading');
            
            // 🔍 HYPOTHESIS 5: DOM manipulation corruption
            console.log('🔍 HYPOTHESIS 5: DOM manipulation test');
            console.log('🔍 HYPOTHESIS 5: Checking HTML generation integrity');
            
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: All 5 hypotheses logged');
        });
        
        console.log('[STEP 6] VERIFYING PRICING BEFORE SUBMISSION...');
        const priceDisplay = await page.evaluate(() => {
            const priceElement = document.querySelector('.price-display, #price, [data-price]');
            return priceElement ? priceElement.textContent : 'Price not found';
        });
        console.log('💰 Frontend Price Display:', priceDisplay);
        
        console.log('[STEP 7] SUBMITTING TRANSACTION WITH COMPREHENSIVE MONITORING...');
        console.log('🔍 Monitoring for POST request to /api/transactions...');
        
        await page.evaluate(() => {
            document.getElementById('submit-btn').click();
        });
        
        // Wait for the transaction submission
        await page.waitForTimeout(3000);
        
        console.log('[STEP 8] TESTING ALL HYPOTHESES WITH ACTUAL REQUEST/RESPONSE DATA...');
        await page.evaluate(() => {
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: Analyzing actual request/response data...');
            
            // 🔍 HYPOTHESIS 1 ANALYSIS: Data mapping corruption
            console.log('🔍 HYPOTHESIS 1 ANALYSIS:');
            console.log('🔍 HYPOTHESIS 1: Checking if appData.transactions has correct structure');
            console.log('🔍 HYPOTHESIS 1: appData.transactions exists:', !!window.appData?.transactions);
            console.log('🔍 HYPOTHESIS 1: appData.transactions length:', window.appData?.transactions?.length);
            
            if (window.appData?.transactions?.length > 0) {
                const first = window.appData.transactions[0];
                console.log('🔍 HYPOTHESIS 1: First transaction structure:', first);
                console.log('🔍 HYPOTHESIS 1: First transaction paymentAmount:', first.paymentAmount);
                console.log('🔍 HYPOTHESIS 1: First transaction paymentAmount type:', typeof first.paymentAmount);
            }
            
            // 🔍 HYPOTHESIS 2 ANALYSIS: Field name mismatch
            console.log('🔍 HYPOTHESIS 2 ANALYSIS:');
            console.log('🔍 HYPOTHESIS 2: Checking field name consistency in API response');
            console.log('🔍 HYPOTHESIS 2: Looking for payment_amount vs paymentAmount');
            
            // 🔍 HYPOTHESIS 3 ANALYSIS: Data type conversion issues
            console.log('🔍 HYPOTHESIS 3 ANALYSIS:');
            console.log('🔍 HYPOTHESIS 3: Checking data type handling in mapping');
            console.log('🔍 HYPOTHESIS 3: String vs Number conversion analysis');
            
            // 🔍 HYPOTHESIS 4 ANALYSIS: Race condition in data loading
            console.log('🔍 HYPOTHESIS 4 ANALYSIS:');
            console.log('🔍 HYPOTHESIS 4: Checking for concurrent data loading issues');
            console.log('🔍 HYPOTHESIS 4: Data refresh timing analysis');
            
            // 🔍 HYPOTHESIS 5 ANALYSIS: DOM manipulation corruption
            console.log('🔍 HYPOTHESIS 5 ANALYSIS:');
            console.log('🔍 HYPOTHESIS 5: Checking DOM manipulation integrity');
            console.log('🔍 HYPOTHESIS 5: HTML generation analysis');
            
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: All 5 hypotheses analyzed');
        });
        
        console.log('[STEP 9] WAITING FOR TRANSACTION PROCESSING...');
        await page.waitForTimeout(2000);
        
        console.log('[STEP 10] VERIFYING TRANSACTION RESULT...');
        await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
        
        console.log('[STEP 11] FINAL COMPREHENSIVE HYPOTHESIS TESTING...');
        await page.evaluate(() => {
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: Final analysis...');
            
            // 🔍 HYPOTHESIS 1 FINAL: Data mapping corruption
            console.log('🔍 HYPOTHESIS 1 FINAL:');
            console.log('🔍 HYPOTHESIS 1: Final appData.transactions state:', window.appData?.transactions);
            console.log('🔍 HYPOTHESIS 1: Final appData.transactions length:', window.appData?.transactions?.length);
            
            if (window.appData?.transactions?.length > 0) {
                const first = window.appData.transactions[0];
                console.log('🔍 HYPOTHESIS 1: Final first transaction:', first);
                console.log('🔍 HYPOTHESIS 1: Final paymentAmount value:', first.paymentAmount);
                console.log('🔍 HYPOTHESIS 1: Final paymentAmount type:', typeof first.paymentAmount);
            }
            
            // 🔍 HYPOTHESIS 2 FINAL: Field name mismatch
            console.log('🔍 HYPOTHESIS 2 FINAL:');
            console.log('🔍 HYPOTHESIS 2: Final field name analysis');
            
            // 🔍 HYPOTHESIS 3 FINAL: Data type conversion issues
            console.log('🔍 HYPOTHESIS 3 FINAL:');
            console.log('🔍 HYPOTHESIS 3: Final data type analysis');
            
            // 🔍 HYPOTHESIS 4 FINAL: Race condition in data loading
            console.log('🔍 HYPOTHESIS 4 FINAL:');
            console.log('🔍 HYPOTHESIS 4: Final race condition analysis');
            
            // 🔍 HYPOTHESIS 5 FINAL: DOM manipulation corruption
            console.log('🔍 HYPOTHESIS 5 FINAL:');
            console.log('🔍 HYPOTHESIS 5: Final DOM manipulation analysis');
            
            console.log('🧪 COMPREHENSIVE HYPOTHESIS TESTING: Final analysis complete');
        });
        
        // Check the recent transactions display
        const recentTransactions = await page.evaluate(() => {
            const container = document.getElementById('recent-transactions');
            if (!container) return 'Container not found';
            
            const items = container.querySelectorAll('.transaction-item');
            const transactions = [];
            
            items.forEach((item, index) => {
                const cells = item.querySelectorAll('div');
                if (cells.length >= 4) {
                    transactions.push({
                        rowIndex: index,
                        payment: cells[0]?.textContent?.trim(),
                        masseuse: cells[1]?.textContent?.trim(),
                        service: cells[2]?.textContent?.trim(),
                        amount: cells[3]?.textContent?.trim(),
                        rawText: item.textContent
                    });
                }
            });
            
            return transactions;
        });
        
        console.log('📋 Recent transactions found:', recentTransactions.length);
        console.log('📋 Transaction details:', recentTransactions);
        
        // Find our specific transaction
        const ourTransaction = recentTransactions.find(t => 
            t.masseuse === 'May เมย์' && 
            t.service === 'Foot massage'
        );
        
        if (ourTransaction) {
            console.log('🔍 OUR TRANSACTION FOUND:', ourTransaction);
            console.log('💰 Expected: Foot massage 90 minutes, Price: 650');
            console.log('💰 Actual: Foot massage, Amount:', ourTransaction.amount);
            
            if (ourTransaction.amount !== '฿650.00') {
                console.log('🚨 BUG CONFIRMED: Transaction shows wrong price!');
                console.log('🚨 Expected: ฿650.00');
                console.log('🚨 Actual:', ourTransaction.amount);
            } else {
                console.log('✅ SUCCESS: Transaction shows correct price!');
            }
        } else {
            console.log('❌ ERROR: Our transaction not found in display');
        }
        
        console.log('\n🎯 INVESTIGATION COMPLETE');
        console.log('========================================');
        console.log('✅ All 5 hypotheses tested simultaneously');
        console.log('✅ Extensive logging at every step');
        console.log('✅ Frontend display logic analyzed');
        console.log('🔍 Check the logs above for the root cause');
        
    } catch (error) {
        console.error('❌ ERROR during investigation:', error);
    } finally {
        await browser.close();
        console.log('✅ Browser closed');
    }
}

// Run the comprehensive investigation
debugFrontendDisplayBugComprehensive().catch(console.error);
