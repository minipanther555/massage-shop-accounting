const puppeteer = require('puppeteer');

async function debugSliceReverseCorruptionFixed() {
    console.log('🔍 SLICE(-LIMIT).REVERSE() CORRUPTION INVESTIGATION - FIXED');
    console.log('============================================================');
    console.log('🎯 Target: getRecentTransactions function corruption');
    console.log('💰 Goal: Find why slice(-limit).reverse() changes ฿650 to ฿350');
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
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS') || msg.text().includes('HYPOTHESIS')) {
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

        console.log('\n[STEP 4] Installing comprehensive slice(-limit).reverse() investigation...');
        
        // Install the investigation hooks
        await page.evaluate(() => {
            console.log('🧪 SLICE(-LIMIT).REVERSE() INVESTIGATION: Installing comprehensive hooks...');
            
            // Store original function references
            window.originalGetRecentTransactions = window.getRecentTransactions;
            window.originalSlice = Array.prototype.slice;
            window.originalReverse = Array.prototype.reverse;
            
            // Track all array operations
            window.arrayOperationLog = [];
            window.transactionDataLog = [];
            window.raceConditionLog = [];
            window.referenceCorruptionLog = [];
            
            console.log('✅ Original function references stored');
        });

        console.log('\n[STEP 5] Installing Hypothesis 1: Array Index Corruption...');
        
        // Install Hypothesis 1 hooks
        await page.evaluate(() => {
            // 🔍 HYPOTHESIS 1: Array Index Corruption in slice(-limit)
            console.log('🔍 HYPOTHESIS 1: Installing Array Index Corruption investigation...');
            
            // Override Array.prototype.slice to log all slice operations
            Array.prototype.slice = function(start, end) {
                const operationId = Date.now() + Math.random();
                const logEntry = {
                    operationId,
                    operation: 'slice',
                    start,
                    end,
                    arrayLength: this.length,
                    arrayContent: JSON.stringify(this),
                    timestamp: new Date().toISOString()
                };
                
                console.log('🔍 HYPOTHESIS 1: SLICE OPERATION DETECTED:', logEntry);
                window.arrayOperationLog.push(logEntry);
                
                // Call original slice
                const result = window.originalSlice.call(this, start, end);
                
                console.log('🔍 HYPOTHESIS 1: SLICE RESULT:', {
                    operationId,
                    resultLength: result.length,
                    resultContent: JSON.stringify(result),
                    originalArrayLength: this.length,
                    start,
                    end
                });
                
                return result;
            };
            
            console.log('✅ HYPOTHESIS 1: Array.prototype.slice override installed');
        });

        console.log('\n[STEP 6] Installing Hypothesis 2: Array Reference Corruption...');
        
        // Install Hypothesis 2 hooks
        await page.evaluate(() => {
            // 🔍 HYPOTHESIS 2: Array Reference Corruption during reverse()
            console.log('🔍 HYPOTHESIS 2: Installing Array Reference Corruption investigation...');
            
            // Override Array.prototype.reverse to log all reverse operations
            Array.prototype.reverse = function() {
                const operationId = Date.now() + Math.random();
                const logEntry = {
                    operationId,
                    operation: 'reverse',
                    arrayLength: this.length,
                    arrayContent: JSON.stringify(this),
                    arrayReference: this,
                    timestamp: new Date().toISOString()
                };
                
                console.log('🔍 HYPOTHESIS 2: REVERSE OPERATION DETECTED:', logEntry);
                window.arrayOperationLog.push(logEntry);
                
                // Call original reverse
                const result = window.originalReverse.call(this);
                
                console.log('🔍 HYPOTHESIS 2: REVERSE RESULT:', {
                    operationId,
                    resultLength: result.length,
                    resultContent: JSON.stringify(result),
                    resultReference: result,
                    originalArrayLength: this.length,
                    arraysAreSame: result === this
                });
                
                return result;
            };
            
            console.log('✅ HYPOTHESIS 2: Array.prototype.reverse override installed');
        });

        console.log('\n[STEP 7] Installing Hypothesis 3: Data Mutation During Processing...');
        
        // Install Hypothesis 3 hooks
        await page.evaluate(() => {
            // 🔍 HYPOTHESIS 3: Data Mutation During Array Processing
            console.log('🔍 HYPOTHESIS 3: Installing Data Mutation investigation...');
            
            // Override getRecentTransactions with comprehensive data tracking
            if (window.getRecentTransactions) {
                const originalFunction = window.originalGetRecentTransactions;
                window.getRecentTransactions = function(limit) {
                    console.log('🔍 HYPOTHESIS 3: getRecentTransactions called with limit:', limit);
                    
                    // Log initial state
                    const initialLog = {
                        step: 'initial',
                        limit,
                        appDataTransactionsLength: window.appData?.transactions?.length || 0,
                        appDataTransactions: JSON.stringify(window.appData?.transactions || []),
                        timestamp: new Date().toISOString()
                    };
                    console.log('🔍 HYPOTHESIS 3: INITIAL STATE:', initialLog);
                    window.transactionDataLog.push(initialLog);
                    
                    // Check for our specific transaction before processing
                    if (window.appData?.transactions) {
                        const ourTransactionBefore = window.appData.transactions.find(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage'
                        );
                        if (ourTransactionBefore) {
                            console.log('🔍 HYPOTHESIS 3: OUR TRANSACTION BEFORE PROCESSING:', {
                                paymentAmount: ourTransactionBefore.paymentAmount,
                                paymentAmountType: typeof ourTransactionBefore.paymentAmount,
                                fullObject: JSON.stringify(ourTransactionBefore)
                            });
                        }
                    }
                    
                    // Call original function
                    const result = originalFunction.call(this, limit);
                    
                    // Log final state
                    const finalLog = {
                        step: 'final',
                        limit,
                        resultLength: result.length,
                        result: JSON.stringify(result),
                        timestamp: new Date().toISOString()
                    };
                    console.log('🔍 HYPOTHESIS 3: FINAL RESULT:', finalLog);
                    window.transactionDataLog.push(finalLog);
                    
                    // Check for our specific transaction after processing
                    if (result && result.length > 0) {
                        const ourTransactionAfter = result.find(t => 
                            t.masseuse === 'May เมย์' && 
                            t.service === 'Foot massage'
                        );
                        if (ourTransactionAfter) {
                            console.log('🔍 HYPOTHESIS 3: OUR TRANSACTION AFTER PROCESSING:', {
                                paymentAmount: ourTransactionAfter.paymentAmount,
                                paymentAmountType: typeof ourTransactionAfter.paymentAmount,
                                fullObject: JSON.stringify(ourTransactionAfter)
                            });
                        }
                    }
                    
                    return result;
                };
                console.log('✅ HYPOTHESIS 3: getRecentTransactions override installed');
            }
        });

        console.log('\n[STEP 8] Installing Hypothesis 4: Race Condition in Array Operations...');
        
        // Install Hypothesis 4 hooks
        await page.evaluate(() => {
            // 🔍 HYPOTHESIS 4: Race Condition in Array Operations
            console.log('🔍 HYPOTHESIS 4: Installing Race Condition investigation...');
            
            // Track timing of all array operations
            window.raceConditionLog = [];
            window.operationTiming = {};
            
            // Override the specific line: const recent = filtered.slice(-limit).reverse();
            if (window.getRecentTransactions) {
                const originalFunction = window.originalGetRecentTransactions;
                window.getRecentTransactions = function(limit) {
                    console.log('🔍 HYPOTHESIS 4: RACE CONDITION INVESTIGATION START');
                    
                    const startTime = Date.now();
                    window.operationTiming.start = startTime;
                    
                    // Step 1: Get filtered transactions
                    console.log('🔍 HYPOTHESIS 4: STEP 1 - Getting filtered transactions...');
                    const step1Start = Date.now();
                    const filtered = window.appData.transactions
                        .filter(t => t.status === 'ACTIVE' || t.status.includes('CORRECTED'));
                    const step1End = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 4: STEP 1 COMPLETE:', {
                        step: 'filter',
                        duration: step1End - step1Start,
                        filteredLength: filtered.length,
                        filteredContent: JSON.stringify(filtered)
                    });
                    
                    // Step 2: Apply slice(-limit)
                    console.log('🔍 HYPOTHESIS 4: STEP 2 - Applying slice(-limit)...');
                    const step2Start = Date.now();
                    const sliced = filtered.slice(-limit);
                    const step2End = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 4: STEP 2 COMPLETE:', {
                        step: 'slice',
                        duration: step2End - step2Start,
                        limit,
                        slicedLength: sliced.length,
                        slicedContent: JSON.stringify(sliced)
                    });
                    
                    // Step 3: Apply reverse()
                    console.log('🔍 HYPOTHESIS 4: STEP 3 - Applying reverse()...');
                    const step3Start = Date.now();
                    const recent = sliced.reverse();
                    const step3End = Date.now();
                    
                    console.log('🔍 HYPOTHESIS 4: STEP 3 COMPLETE:', {
                        step: 'reverse',
                        duration: step3End - step3Start,
                        recentLength: recent.length,
                        recentContent: JSON.stringify(recent)
                    });
                    
                    const totalTime = Date.now() - startTime;
                    console.log('🔍 HYPOTHESIS 4: TOTAL OPERATION TIME:', totalTime);
                    
                    // Log race condition data
                    window.raceConditionLog.push({
                        startTime,
                        totalTime,
                        step1Duration: step1End - step1Start,
                        step2Duration: step2End - step2Start,
                        step3Duration: step3End - step3Start,
                        limit,
                        filteredLength: filtered.length,
                        slicedLength: sliced.length,
                        recentLength: recent.length
                    });
                    
                    return recent;
                };
                console.log('✅ HYPOTHESIS 4: Race condition investigation installed');
            }
        });

        console.log('\n[STEP 9] Installing Hypothesis 5: Object Reference Corruption...');
        
        // Install Hypothesis 5 hooks
        await page.evaluate(() => {
            // 🔍 HYPOTHESIS 5: Object Reference Corruption
            console.log('🔍 HYPOTHESIS 5: Installing Object Reference Corruption investigation...');
            
            // Track object references and mutations
            window.referenceCorruptionLog = [];
            window.objectReferences = new WeakMap();
            
            // Override getRecentTransactions to track object references
            if (window.getRecentTransactions) {
                const originalFunction = window.originalGetRecentTransactions;
                window.getRecentTransactions = function(limit) {
                    console.log('🔍 HYPOTHESIS 5: OBJECT REFERENCE INVESTIGATION START');
                    
                    // Track original object references
                    if (window.appData?.transactions) {
                        const originalReferences = window.appData.transactions.map((t, index) => ({
                            index,
                            reference: t,
                            paymentAmount: t.paymentAmount,
                            masseuse: t.masseuse,
                            service: t.service
                        }));
                        
                        console.log('🔍 HYPOTHESIS 5: ORIGINAL REFERENCES:', originalReferences);
                        window.objectReferences.set(window.appData.transactions, originalReferences);
                    }
                    
                    // Call the race condition version (which has the step-by-step logging)
                    const result = originalFunction.call(this, limit);
                    
                    // Track final object references
                    if (result && result.length > 0) {
                        const finalReferences = result.map((t, index) => ({
                            index,
                            reference: t,
                            paymentAmount: t.paymentAmount,
                            masseuse: t.masseuse,
                            service: t.service
                        }));
                        
                        console.log('🔍 HYPOTHESIS 5: FINAL REFERENCES:', finalReferences);
                        
                        // Check for reference corruption
                        const originalRefs = window.objectReferences.get(window.appData.transactions);
                        if (originalRefs) {
                            const corruptionCheck = finalReferences.map((final, index) => {
                                const original = originalRefs.find(o => 
                                    o.masseuse === final.masseuse && 
                                    o.service === final.service
                                );
                                
                                if (original) {
                                    return {
                                        index,
                                        originalReference: original.reference,
                                        finalReference: final.reference,
                                        referencesMatch: original.reference === final.reference,
                                        originalPaymentAmount: original.paymentAmount,
                                        finalPaymentAmount: final.paymentAmount,
                                        paymentAmountChanged: original.paymentAmount !== final.paymentAmount
                                    };
                                }
                                return null;
                            }).filter(Boolean);
                            
                            console.log('🔍 HYPOTHESIS 5: REFERENCE CORRUPTION CHECK:', corruptionCheck);
                            window.referenceCorruptionLog.push(corruptionCheck);
                        }
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
            
            // Test with limit 5
            const testResult = window.getRecentTransactions(5);
            console.log('🧪 COMPREHENSIVE TESTING: Test result:', testResult);
            
            // Log all collected data
            console.log('🧪 COMPREHENSIVE TESTING: Array operation log:', window.arrayOperationLog);
            console.log('🧪 COMPREHENSIVE TESTING: Transaction data log:', window.transactionDataLog);
            console.log('🧪 COMPREHENSIVE TESTING: Race condition log:', window.raceConditionLog);
            console.log('🧪 COMPREHENSIVE TESTING: Reference corruption log:', window.referenceCorruptionLog);
        });

        // Wait for all logging to complete
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n[STEP 11] Investigation complete. Analyzing results...');
        
        // Get all the investigation data
        const investigationResults = await page.evaluate(() => {
            return {
                arrayOperationLog: window.arrayOperationLog || [],
                transactionDataLog: window.transactionDataLog || [],
                raceConditionLog: window.raceConditionLog || [],
                referenceCorruptionLog: window.referenceCorruptionLog || [],
                objectReferences: window.objectReferences ? 'WeakMap with data' : 'No WeakMap'
            };
        });

        console.log('\n🔍 INVESTIGATION RESULTS:');
        console.log('========================');
        console.log('Array Operations:', JSON.stringify(investigationResults.arrayOperationLog, null, 2));
        console.log('Transaction Data:', JSON.stringify(investigationResults.transactionDataLog, null, 2));
        console.log('Race Conditions:', JSON.stringify(investigationResults.raceConditionLog, null, 2));
        console.log('Reference Corruption:', JSON.stringify(investigationResults.referenceCorruptionLog, null, 2));

        console.log('\n✅ SLICE(-LIMIT).REVERSE() CORRUPTION INVESTIGATION COMPLETE');

    } catch (error) {
        console.error('❌ Error during investigation:', error);
    } finally {
        await browser.close();
    }
}

// Run the investigation
debugSliceReverseCorruptionFixed().catch(console.error);
