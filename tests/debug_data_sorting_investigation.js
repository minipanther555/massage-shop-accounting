const puppeteer = require('puppeteer');

async function debugDataSortingInvestigation() {
    console.log('🔍 DATA SORTING INVESTIGATION - COMPREHENSIVE DEBUGGING');
    console.log('============================================================');
    console.log('🎯 Target: getRecentTransactions data sorting corruption');
    console.log('💰 Goal: Find why slice(-5) returns wrong transactions (฿350 instead of ฿650)');
    console.log('🔍 Root Cause: Data ordering before slice(-limit).reverse()');
    console.log('============================================================');

    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    try {
        // Set realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Configure page to handle cookies properly
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        // Enable comprehensive console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS') || msg.text().includes('HYPOTHESIS') || msg.text().includes('STEP') || msg.text().includes('🔍') || msg.text().includes('✅') || msg.text().includes('❌')) {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            }
        });

        // Enable network request logging for ALL requests
        page.on('request', request => {
            if (request.url().includes('/api/')) {
                console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
                if (request.postData()) {
                    console.log(`📤 REQUEST BODY: ${request.postData()}`);
                }
            }
        });

        page.on('response', response => {
            if (response.url().includes('/api/')) {
                console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
            }
        });

        // STEP 1: Navigate to login page
        console.log('\n[STEP 1] Navigating to login page...');
        await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });
        
        // STEP 2: Login as manager
        console.log('\n[STEP 2] Logging in as manager...');
        await page.type('#username', 'manager');
        await page.type('#password', 'manager456');
        await page.click('#login-btn');
        
        // Wait for redirect and login
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // STEP 3: Navigate to transaction page
        console.log('\n[STEP 3] Navigating to transaction page...');
        await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Wait for dropdowns to populate
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n[STEP 4] Installing comprehensive data sorting investigation hooks...');
        
        // Install the investigation hooks
        await page.evaluate(() => {
            console.log('🧪 DATA SORTING INVESTIGATION: Installing comprehensive hooks...');
            
            // Store original function references
            window.originalGetRecentTransactions = window.getRecentTransactions;
            window.originalLoadTodayData = window.loadTodayData;
            window.originalApiGetRecentTransactions = window.api?.getRecentTransactions;
            
            // Track all data operations
            window.dataOperationLog = [];
            window.transactionDataLog = [];
            window.sortingOperationLog = [];
            window.referenceCorruptionLog = [];
            window.timingLog = [];
            
            console.log('✅ Original function references stored');
        });

        console.log('\n[STEP 5] Installing Hypothesis 1: Backend Data Ordering Issue...');
        
        // Install Hypothesis 1 hooks
        await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 1: Installing Backend Data Ordering investigation...');
            
            // Override api.getRecentTransactions to track backend data ordering
            if (window.api && window.api.getRecentTransactions) {
                const originalFunction = window.originalApiGetRecentTransactions;
                window.api.getRecentTransactions = async function(limit) {
                    console.log('🔍 HYPOTHESIS 1: api.getRecentTransactions called with limit:', limit);
                    console.log('🔍 HYPOTHESIS 1: Backend data ordering investigation starting...');
                    
                    const startTime = Date.now();
                    const result = await originalFunction.call(this, limit);
                    const endTime = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 1: Backend response received in:', endTime - startTime, 'ms');
                    console.log('🔍 HYPOTHESIS 1: Backend response type:', typeof result);
                    console.log('🔍 HYPOTHESIS 1: Backend response is array:', Array.isArray(result));
                    console.log('🔍 HYPOTHESIS 1: Backend response length:', result?.length);
                    
                    if (result && result.length > 0) {
                        console.log('🔍 HYPOTHESIS 1: Backend data ordering analysis:');
                        console.log('🔍 HYPOTHESIS 1: First transaction timestamp:', result[0]?.timestamp);
                        console.log('🔍 HYPOTHESIS 1: Last transaction timestamp:', result[result.length - 1]?.timestamp);
                        console.log('🔍 HYPOTHESIS 1: First transaction payment amount:', result[0]?.payment_amount);
                        console.log('🔍 HYPOTHESIS 1: Last transaction payment amount:', result[result.length - 1]?.payment_amount);
                        
                        // Check if backend data is properly ordered by timestamp
                        const timestamps = result.map(t => new Date(t.timestamp).getTime());
                        const isOrdered = timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1]);
                        console.log('🔍 HYPOTHESIS 1: Backend data is chronologically ordered:', isOrdered);
                        
                        // Check for our specific transaction
                        const ourTransaction = result.find(t => 
                            t.masseuse_name === 'May เมย์' && 
                            t.service_type === 'Foot massage' && 
                            t.payment_amount === 650
                        );
                        console.log('🔍 HYPOTHESIS 1: Our transaction (฿650) found in backend data:', !!ourTransaction);
                        if (ourTransaction) {
                            console.log('🔍 HYPOTHESIS 1: Our transaction position in backend array:', result.indexOf(ourTransaction));
                            console.log('🔍 HYPOTHESIS 1: Our transaction timestamp:', ourTransaction.timestamp);
                        }
                    }
                    
                    // Log the operation
                    window.dataOperationLog.push({
                        operationId: Date.now() + Math.random(),
                        operation: 'api.getRecentTransactions',
                        limit: limit,
                        backendDataLength: result?.length,
                        backendDataOrdered: result && result.length > 0 ? (() => {
                            const timestamps = result.map(t => new Date(t.timestamp).getTime());
                            return timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1]);
                        })() : 'N/A',
                        ourTransactionFound: result && result.some(t => 
                            t.masseuse_name === 'May เมย์' && 
                            t.service_type === 'Foot massage' && 
                            t.payment_amount === 650
                        ),
                        timestamp: new Date().toISOString()
                    });
                    
                    return result;
                };
                console.log('✅ HYPOTHESIS 1: api.getRecentTransactions override installed');
            }
        });

        console.log('\n[STEP 6] Installing Hypothesis 2: Data Mapping Corruption...');
        
        // Install Hypothesis 2 hooks
        await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2: Installing Data Mapping Corruption investigation...');
            
            // Override loadTodayData to track data mapping
            if (window.loadTodayData) {
                const originalFunction = window.originalLoadTodayData;
                window.loadTodayData = async function() {
                    console.log('🔍 HYPOTHESIS 2: loadTodayData called - data mapping investigation starting...');
                    console.log('🔍 HYPOTHESIS 2: Current appData.transactions BEFORE loadTodayData:', window.appData?.transactions);
                    console.log('🔍 HYPOTHESIS 2: Current appData.transactions length BEFORE loadTodayData:', window.appData?.transactions?.length);
                    
                    const startTime = Date.now();
                    const result = await originalFunction.call(this);
                    const endTime = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 2: loadTodayData completed in:', endTime - startTime, 'ms');
                    console.log('🔍 HYPOTHESIS 2: appData.transactions AFTER loadTodayData:', window.appData?.transactions);
                    console.log('🔍 HYPOTHESIS 2: appData.transactions length AFTER loadTodayData:', window.appData?.transactions?.length);
                    
                    if (window.appData?.transactions && window.appData.transactions.length > 0) {
                        console.log('🔍 HYPOTHESIS 2: Data mapping integrity check:');
                        console.log('🔍 HYPOTHESIS 2: First mapped transaction:', window.appData.transactions[0]);
                        console.log('🔍 HYPOTHESIS 2: Last mapped transaction:', window.appData.transactions[window.appData.transactions.length - 1]);
                        
                        // Check if our transaction survived mapping
                        const ourTransaction = window.appData.transactions.find(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage' && 
                            t.paymentAmount === 650
                        );
                        console.log('🔍 HYPOTHESIS 2: Our transaction (฿650) survived mapping:', !!ourTransaction);
                        if (ourTransaction) {
                            console.log('🔍 HYPOTHESIS 2: Our transaction position after mapping:', window.appData.transactions.indexOf(ourTransaction));
                            console.log('🔍 HYPOTHESIS 2: Our transaction details after mapping:', ourTransaction);
                        }
                        
                        // Check data ordering after mapping
                        const timestamps = window.appData.transactions.map(t => t.timestamp.getTime());
                        const isOrdered = timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1]);
                        console.log('🔍 HYPOTHESIS 2: Data is chronologically ordered after mapping:', isOrdered);
                    }
                    
                    return result;
                };
                console.log('✅ HYPOTHESIS 2: loadTodayData override installed');
            }
        });

        console.log('\n[STEP 7] Installing Hypothesis 3: Array Reference Corruption...');
        
        // Install Hypothesis 3 hooks
        await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3: Installing Array Reference Corruption investigation...');
            
            // Override getRecentTransactions to track array operations
            if (window.getRecentTransactions) {
                const originalFunction = window.originalGetRecentTransactions;
                window.getRecentTransactions = function(limit) {
                    console.log('🔍 HYPOTHESIS 3: getRecentTransactions called with limit:', limit);
                    console.log('🔍 HYPOTHESIS 3: Array reference corruption investigation starting...');
                    
                    console.log('🔍 HYPOTHESIS 3: Current appData.transactions at function start:', window.appData?.transactions);
                    console.log('🔍 HYPOTHESIS 3: Current appData.transactions length at function start:', window.appData?.transactions?.length);
                    console.log('🔍 HYPOTHESIS 3: Current appData.transactions type at function start:', typeof window.appData?.transactions);
                    console.log('🔍 HYPOTHESIS 3: Current appData.transactions is array at function start:', Array.isArray(window.appData?.transactions));
                    
                    if (window.appData?.transactions && window.appData.transactions.length > 0) {
                        console.log('🔍 HYPOTHESIS 3: First transaction at function start:', window.appData.transactions[0]);
                        console.log('🔍 HYPOTHESIS 3: Last transaction at function start:', window.appData.transactions[window.appData.transactions.length - 1]);
                        
                        // Check if our transaction exists at function start
                        const ourTransactionAtStart = window.appData.transactions.find(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage' && 
                            t.paymentAmount === 650
                        );
                        console.log('🔍 HYPOTHESIS 3: Our transaction (฿650) exists at function start:', !!ourTransactionAtStart);
                        if (ourTransactionAtStart) {
                            console.log('🔍 HYPOTHESIS 3: Our transaction position at function start:', window.appData.transactions.indexOf(ourTransactionAtStart));
                        }
                    }
                    
                    const startTime = Date.now();
                    const result = originalFunction.call(this, limit);
                    const endTime = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 3: getRecentTransactions completed in:', endTime - startTime, 'ms');
                    console.log('🔍 HYPOTHESIS 3: Function result:', result);
                    console.log('🔍 HYPOTHESIS 3: Function result length:', result?.length);
                    
                    // Check if our transaction is in the result
                    if (result && result.length > 0) {
                        const ourTransactionInResult = result.find(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage' && 
                            t.paymentAmount === 650
                        );
                        console.log('🔍 HYPOTHESIS 3: Our transaction (฿650) in function result:', !!ourTransactionInResult);
                        if (ourTransactionInResult) {
                            console.log('🔍 HYPOTHESIS 3: Our transaction position in result:', result.indexOf(ourTransactionInResult));
                        }
                        
                        // Check what transactions are actually returned
                        console.log('🔍 HYPOTHESIS 3: Actual transactions returned:');
                        result.forEach((t, index) => {
                            console.log(`🔍 HYPOTHESIS 3: Transaction ${index}:`, {
                                id: t.id,
                                masseuse: t.masseuse,
                                service: t.service,
                                paymentAmount: t.paymentAmount,
                                timestamp: t.timestamp
                            });
                        });
                    }
                    
                    // Log the operation
                    window.transactionDataLog.push({
                        operationId: Date.now() + Math.random(),
                        operation: 'getRecentTransactions',
                        limit: limit,
                        inputDataLength: window.appData?.transactions?.length,
                        inputDataHasOurTransaction: window.appData?.transactions?.some(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage' && 
                            t.paymentAmount === 650
                        ),
                        resultLength: result?.length,
                        resultHasOurTransaction: result?.some(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage' && 
                            t.paymentAmount === 650
                        ),
                        executionTime: endTime - startTime,
                        timestamp: new Date().toISOString()
                    });
                    
                    return result;
                };
                console.log('✅ HYPOTHESIS 3: getRecentTransactions override installed');
            }
        });

        console.log('\n[STEP 8] Installing Hypothesis 4: Race Condition in Data Loading...');
        
        // Install Hypothesis 4 hooks
        await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4: Installing Race Condition investigation...');
            
            // Track timing of all data operations
            window.raceConditionLog = [];
            window.timingLog = [];
            
            // Override Promise.all to track race conditions
            const originalPromiseAll = Promise.all;
            Promise.all = function(promises) {
                console.log('🔍 HYPOTHESIS 4: Promise.all called with promises count:', promises.length);
                
                const startTime = Date.now();
                const result = originalPromiseAll.call(this, promises);
                
                result.then(() => {
                    const endTime = Date.now();
                    console.log('🔍 HYPOTHESIS 4: Promise.all completed in:', endTime - startTime, 'ms');
                    
                    window.timingLog.push({
                        operation: 'Promise.all',
                        promiseCount: promises.length,
                        executionTime: endTime - startTime,
                        timestamp: new Date().toISOString()
                    });
                });
                
                return result;
            };
            
            // Track setTimeout and setInterval calls
            const originalSetTimeout = setTimeout;
            const originalSetInterval = setInterval;
            
            window.setTimeout = function(fn, delay, ...args) {
                console.log('🔍 HYPOTHESIS 4: setTimeout called with delay:', delay, 'ms');
                return originalSetTimeout.call(this, fn, delay, ...args);
            };
            
            window.setInterval = function(fn, delay, ...args) {
                console.log('🔍 HYPOTHESIS 4: setInterval called with delay:', delay, 'ms');
                return originalSetInterval.call(this, fn, delay, ...args);
            };
            
            console.log('✅ HYPOTHESIS 4: Race condition investigation installed');
        });

        console.log('\n[STEP 9] Installing Hypothesis 5: Object Reference Corruption...');
        
        // Install Hypothesis 5 hooks
        await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5: Installing Object Reference Corruption investigation...');
            
            // Track object references throughout the data flow
            window.referenceCorruptionLog = [];
            window.objectReferences = new Map();
            
            // Override getRecentTransactions to track object references
            if (window.getRecentTransactions) {
                const originalFunction = window.originalGetRecentTransactions;
                window.getRecentTransactions = function(limit) {
                    console.log('🔍 HYPOTHESIS 5: Object reference corruption investigation starting...');
                    
                    // Store original references before any operations
                    const originalReferences = window.appData.transactions.map((t, index) => ({
                        index: index,
                        originalReference: { ...t },
                        originalPaymentAmount: t.paymentAmount,
                        originalId: t.id
                    }));
                    
                    console.log('🔍 HYPOTHESIS 5: Original references captured:', originalReferences.length);
                    console.log('🔍 HYPOTHESIS 5: Original references:', originalReferences);
                    
                    // Store references for later comparison
                    window.objectReferences.set(window.appData.transactions, originalReferences);
                    
                    const startTime = Date.now();
                    const result = originalFunction.call(this, limit);
                    const endTime = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 5: Function completed, checking for reference corruption...');
                    
                    // Check if references were corrupted
                    const originalRefs = window.objectReferences.get(window.appData.transactions);
                    if (originalRefs) {
                        const referenceCorruption = originalRefs.map((ref, index) => {
                            const currentTransaction = window.appData.transactions[index];
                            const referencesMatch = currentTransaction && 
                                currentTransaction.paymentAmount === ref.originalPaymentAmount &&
                                currentTransaction.id === ref.originalId;
                            
                            return {
                                index: index,
                                originalReference: ref.originalReference,
                                finalReference: currentTransaction,
                                referencesMatch: referencesMatch,
                                originalPaymentAmount: ref.originalPaymentAmount,
                                finalPaymentAmount: currentTransaction?.paymentAmount,
                                paymentAmountChanged: currentTransaction && currentTransaction.paymentAmount !== ref.originalPaymentAmount
                            };
                        });
                        
                        console.log('🔍 HYPOTHESIS 5: Reference corruption analysis:', referenceCorruption);
                        window.referenceCorruptionLog.push(referenceCorruption);
                    }
                    
                    return result;
                };
                console.log('✅ HYPOTHESIS 5: Object reference corruption investigation installed');
            }
        });

        console.log('\n[STEP 10] All investigation hooks installed. Starting comprehensive testing...');
        
        // Now trigger the getRecentTransactions function to see all hypotheses in action
        await page.evaluate(() => {
            console.log('🧪 COMPREHENSIVE TESTING: All 5 hypotheses installed, testing getRecentTransactions...');
            
            // Test the function
            if (window.getRecentTransactions) {
                const testResult = window.getRecentTransactions(5);
                console.log('🧪 COMPREHENSIVE TESTING: getRecentTransactions test completed');
                console.log('🧪 COMPREHENSIVE TESTING: Test result:', testResult);
            }
        });

        // Wait for all operations to complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n[STEP 11] Investigation complete. Analyzing results...');
        
        // Get all the investigation results
        const results = await page.evaluate(() => {
            return {
                arrayOperations: window.arrayOperationLog || [],
                transactionData: window.transactionDataLog || [],
                raceConditions: window.raceConditionLog || [],
                referenceCorruption: window.referenceCorruptionLog || [],
                timingData: window.timingLog || [],
                dataOperations: window.dataOperationLog || []
            };
        });

        console.log('\n🔍 INVESTIGATION RESULTS:');
        console.log('========================');
        console.log('Array Operations:', JSON.stringify(results.arrayOperations, null, 2));
        console.log('Transaction Data:', JSON.stringify(results.transactionData, null, 2));
        console.log('Race Conditions:', JSON.stringify(results.raceConditions, null, 2));
        console.log('Reference Corruption:', JSON.stringify(results.referenceCorruption, null, 2));
        console.log('Timing Data:', JSON.stringify(results.timingData, null, 2));
        console.log('Data Operations:', JSON.stringify(results.dataOperations, null, 2));

        console.log('\n✅ DATA SORTING INVESTIGATION COMPLETE');

    } catch (error) {
        console.error('❌ ERROR during investigation:', error);
    } finally {
        await browser.close();
    }
}

// Run the investigation
debugDataSortingInvestigation().catch(console.error);
