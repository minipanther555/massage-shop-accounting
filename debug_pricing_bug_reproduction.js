const puppeteer = require('puppeteer');

async function debugPricingBugReproduction() {
    console.log('🔍 PRICING BUG REPRODUCTION - FOOT MASSAGE 90 MINUTES');
    console.log('======================================================');
    console.log('Testing the specific bug: Correct pricing display but wrong data storage');
    
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
        
        // Enable console logging
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            }
        });

        // Enable network request logging for ALL requests
        page.on('request', request => {
            console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
            if (request.postData()) {
                console.log(`📤 REQUEST BODY: ${request.postData()}`);
            }
        });

        page.on('response', response => {
            console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        });

        // Navigate to login page
        console.log('\n[STEP 1] Navigating to login page...');
        await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });
        
        // Login as manager
        console.log('\n[STEP 2] Logging in as manager...');
        await page.type('#username', 'manager');
        await page.type('#password', 'manager456');
        await page.click('#login-btn');
        
        // Wait for redirect and login
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Navigate to transaction page
        console.log('\n[STEP 3] Navigating to transaction page...');
        await page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
        
        // Wait for page to load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Wait for dropdowns to populate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('\n[STEP 4] FILLING FORM WITH SPECIFIC BUG COMBINATION...');
        
        // Select Foot Massage 90 minutes (the bug combination)
        await page.select('#masseuse', 'May เมย์');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#location', 'In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#service', 'Foot massage');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#duration', '90');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.select('#payment', 'Cash');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set start time to current time
        const currentTime = new Date();
        const hours = currentTime.getHours();
        const minutes = currentTime.getMinutes();
        const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
        
        await page.type('#startTime', timeString);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('\n[STEP 5] VERIFYING PRICING BEFORE SUBMISSION...');
        
        // Check frontend pricing before submission
        const frontendPrice = await page.$eval('#servicePrice', el => el.textContent);
        const frontendFee = await page.$eval('#masseuseeFee', el => el.textContent);
        
        console.log(`💰 Frontend Price Display: ${frontendPrice}`);
        console.log(`💰 Frontend Masseuse Fee: ${frontendFee}`);
        
        // Verify the form state before submission
        const formStateBefore = await page.evaluate(() => {
            const form = document.querySelector('#transaction-form');
            const inputs = form.querySelectorAll('input, select');
            
            const state = {};
            inputs.forEach(input => {
                state[input.id || input.name] = {
                    value: input.value,
                    selectedIndex: input.selectedIndex,
                    options: input.options ? Array.from(input.options).map(opt => ({ value: opt.value, text: opt.text })) : null
                };
            });
            
            return state;
        });
        
        console.log('📋 Form state before submission:', formStateBefore);
        
        console.log('\n[STEP 6] SUBMITTING TRANSACTION WITH FULL LOGGING...');
        
        // Override the submitTransaction function with extensive logging
        await page.evaluate(() => {
            const originalSubmitTransaction = window.submitTransaction;
            
            window.submitTransaction = async function(formData) {
                console.log('🚀 SUBMIT TRANSACTION FUNCTION CALLED!');
                console.log('📋 Form data received:', formData);
                console.log('🔍 Form data type:', typeof formData);
                console.log('🔍 Form data keys:', Object.keys(formData));
                
                // Log each field individually
                for (const [key, value] of Object.entries(formData)) {
                    console.log(`📝 Field ${key}:`, value);
                }
                
                // Check if this is FormData object
                if (formData instanceof FormData) {
                    console.log('📋 FormData object detected');
                    const entries = Array.from(formData.entries());
                    console.log('📋 FormData entries:', entries);
                }
                
                // Call original function
                console.log('🚀 Calling original submitTransaction function...');
                const result = await originalSubmitTransaction(formData);
                console.log('✅ Original function result:', result);
                return result;
            };
            
            console.log('✅ submitTransaction function overridden with logging');
        });
        
        // Override the API client's createTransaction method with logging
        await page.evaluate(() => {
            if (window.api && window.api.createTransaction) {
                const originalCreateTransaction = window.api.createTransaction;
                
                window.api.createTransaction = async function(transactionData) {
                    console.log('🚀 CREATE TRANSACTION API CALL INTERCEPTED!');
                    console.log('📋 Transaction data being sent:', transactionData);
                    console.log('🔍 Data type:', typeof transactionData);
                    
                    if (transactionData instanceof FormData) {
                        console.log('📋 FormData object detected in API call');
                        const entries = Array.from(transactionData.entries());
                        console.log('📋 FormData entries in API call:', entries);
                    }
                    
                    // Call original function
                    console.log('🚀 Calling original createTransaction function...');
                    const result = await originalCreateTransaction.call(this, transactionData);
                    console.log('✅ Original createTransaction result:', result);
                    return result;
                };
                
                console.log('✅ createTransaction function overridden with logging');
            } else {
                console.log('⚠️ API client not available yet, will intercept later');
            }
        });
        
        // ADD COMPREHENSIVE FORM SUBMISSION LOGGING
        await page.evaluate(() => {
            console.log('🔍 COMPREHENSIVE FORM SUBMISSION LOGGING ENABLED');
            
            // Override the form submit event handler
            const form = document.querySelector('#transaction-form');
            if (form) {
                const originalSubmit = form.onsubmit;
                
                form.onsubmit = function(event) {
                    console.log('🚀 FORM SUBMIT EVENT TRIGGERED!');
                    console.log('📋 Event details:', event);
                    
                    // Log all form fields before submission
                    const formElements = form.elements;
                    console.log('📋 All form elements:', formElements.length);
                    
                    const formData = {};
                    for (let i = 0; i < formElements.length; i++) {
                        const element = formElements[i];
                        if (element.name || element.id) {
                            const name = element.name || element.id;
                            let value;
                            
                            if (element.type === 'select-one') {
                                value = element.options[element.selectedIndex]?.text || element.value;
                                console.log(`📝 Select field ${name}: "${value}" (value: ${element.value})`);
                            } else if (element.type === 'checkbox') {
                                value = element.checked;
                                console.log(`📝 Checkbox field ${name}: ${value}`);
                            } else {
                                value = element.value;
                                console.log(`📝 Input field ${name}: "${value}"`);
                            }
                            
                            formData[name] = value;
                        }
                    }
                    
                    console.log('📋 Complete form data collected:', formData);
                    
                    // Call original submit handler if it exists
                    if (originalSubmit) {
                        console.log('🚀 Calling original form submit handler...');
                        return originalSubmit.call(this, event);
                    }
                    
                    return true;
                };
                
                console.log('✅ Form submit event handler overridden with logging');
            }
            
            // Override the populateDropdowns function to see what data is loaded
            if (window.populateDropdowns) {
                const originalPopulateDropdowns = window.populateDropdowns;
                
                window.populateDropdowns = function(services, paymentMethods, roster) {
                    console.log('🚀 POPULATE DROPDOWNS CALLED!');
                    console.log('📋 Services data:', services);
                    console.log('📋 Payment methods data:', paymentMethods);
                    console.log('📋 Roster data:', roster);
                    
                    const result = originalPopulateDropdowns.call(this, services, paymentMethods, roster);
                    console.log('✅ populateDropdowns result:', result);
                    return result;
                };
                
                console.log('✅ populateDropdowns function overridden with logging');
            }
            
            // Override the calculatePrice function to see pricing logic
            if (window.calculatePrice) {
                const originalCalculatePrice = window.calculatePrice;
                
                window.calculatePrice = function(serviceType, duration) {
                    console.log('🚀 CALCULATE PRICE CALLED!');
                    console.log('📋 Service type:', serviceType);
                    console.log('📋 Duration:', duration);
                    
                    const result = originalCalculatePrice.call(this, serviceType, duration);
                    console.log('✅ calculatePrice result:', result);
                    return result;
                };
                
                console.log('✅ calculatePrice function overridden with logging');
            }
            
            // Override the updateTimeDropdowns function
            if (window.updateTimeDropdowns) {
                const originalUpdateTimeDropdowns = window.updateTimeDropdowns;
                
                window.updateTimeDropdowns = function(duration) {
                    console.log('🚀 UPDATE TIME DROPDOWNS CALLED!');
                    console.log('📋 Duration:', duration);
                    
                    const result = originalUpdateTimeDropdowns.call(this, duration);
                    console.log('✅ updateTimeDropdowns result:', result);
                    return result;
                };
                
                console.log('✅ updateTimeDropdowns function overridden with logging');
            }
            
            // Monitor all API calls
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                console.log('🚀 FETCH API CALL INTERCEPTED!');
                console.log('📋 URL:', url);
                console.log('📋 Options:', options);
                
                if (options && options.body) {
                    console.log('📋 Request body:', options.body);
                    if (options.body instanceof FormData) {
                        const entries = Array.from(options.body.entries());
                        console.log('📋 FormData entries:', entries);
                    }
                }
                
                return originalFetch.call(this, url, options).then(response => {
                    console.log('📥 Fetch response status:', response.status);
                    console.log('📥 Fetch response URL:', response.url);
                    
                    // Clone response to read body
                    const clonedResponse = response.clone();
                    clonedResponse.text().then(text => {
                        try {
                            const json = JSON.parse(text);
                            console.log('📥 Fetch response body (JSON):', json);
                        } catch (e) {
                            console.log('📥 Fetch response body (text):', text.substring(0, 500));
                        }
                    });
                    
                    return response;
                });
            };
            
            console.log('✅ Fetch API overridden with logging');
            
            // Monitor all XMLHttpRequest calls
            const originalXHROpen = XMLHttpRequest.prototype.open;
            const originalXHRSend = XMLHttpRequest.prototype.send;
            
            XMLHttpRequest.prototype.open = function(method, url, ...args) {
                console.log('🚀 XMLHttpRequest OPEN:', method, url);
                this._method = method;
                this._url = url;
                return originalXHROpen.call(this, method, url, ...args);
            };
            
            XMLHttpRequest.prototype.send = function(data) {
                console.log('🚀 XMLHttpRequest SEND:', data);
                if (data) {
                    console.log('📋 XHR Request data:', data);
                    if (data instanceof FormData) {
                        const entries = Array.from(data.entries());
                        console.log('📋 XHR FormData entries:', entries);
                    }
                }
                
                // Monitor response
                this.addEventListener('load', function() {
                    console.log('📥 XHR Response status:', this.status);
                    console.log('📥 XHR Response URL:', this._url);
                    try {
                        const response = JSON.parse(this.responseText);
                        console.log('📥 XHR Response body:', response);
                    } catch (e) {
                        console.log('📥 XHR Response body (text):', this.responseText.substring(0, 500));
                    }
                });
                
                return originalXHRSend.call(this, data);
            };
            
            console.log('✅ XMLHttpRequest overridden with logging');
        });
        
        // Click submit button
        console.log('🔍 Clicking submit button...');
        await page.click('button[type="submit"]');
        
        // Wait for any response or navigation
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log('\n[STEP 7] ANALYZING SUBMISSION RESULTS...');
        
        // Check what happened
        const submissionResult = await page.evaluate(() => {
            console.log('🔍 CHECKING SUBMISSION RESULT:');
            
            // Check if we're still on the same page
            const currentUrl = window.location.href;
            console.log('🔍 Current URL after submission:', currentUrl);
            
            // Check for any error messages
            const errorMessages = document.querySelectorAll('.error, .alert, [style*="red"], [style*="error"]');
            console.log('🔍 Error messages found:', errorMessages.length);
            
            // Check for any success messages
            const successMessages = document.querySelectorAll('.success, .alert-success');
            console.log('🔍 Success messages found:', successMessages.length);
            
            return {
                currentUrl,
                errorMessagesCount: errorMessages.length,
                successMessagesCount: successMessages.length,
                pageTitle: document.title,
                bodyText: document.body.innerText.substring(0, 500)
            };
        });
        
        console.log('📋 Submission result:', submissionResult);
        
        console.log('\n[STEP 8] CHECKING RECENT TRANSACTIONS FOR THE BUG...');
        
        // Wait for the page to fully refresh and show recent transactions
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if the transaction appears in recent transactions on the SAME page
        const recentTransactions = await page.evaluate(() => {
            console.log('🔍 CHECKING RECENT TRANSACTIONS ON CURRENT PAGE:');
            
            // Look for the recent transactions div (not a table)
            const transactionDiv = document.querySelector('#recent-transactions');
            if (!transactionDiv) {
                console.log('❌ No recent transactions div found on current page');
                return { error: 'No recent transactions div found' };
            }
            
            console.log('✅ Recent transactions div found, checking content...');
            
            // Look for transaction items (they might be divs with class 'transaction-item')
            const transactionItems = transactionDiv.querySelectorAll('.transaction-item');
            console.log(`🔍 Found ${transactionItems.length} transaction items`);
            
            // Also check for any other elements that might contain transaction data
            const allTransactionElements = transactionDiv.querySelectorAll('*');
            console.log(`🔍 Total elements in recent transactions: ${allTransactionElements.length}`);
            
            const transactions = [];
            transactionItems.forEach((item, index) => {
                // Get all child divs which should contain the transaction data
                const divs = item.querySelectorAll('div');
                if (divs.length >= 4) {
                    const transaction = {
                        rowIndex: index,
                        payment: divs[0]?.textContent?.trim(),
                        masseuse: divs[1]?.textContent?.trim(),
                        service: divs[2]?.textContent?.trim(),
                        amount: divs[3]?.textContent?.trim(),
                        rawText: item.textContent.trim()
                    };
                    transactions.push(transaction);
                    console.log(`🔍 Transaction ${index}:`, transaction);
                }
            });
            
            // Also log the raw HTML content to see what's actually there
            console.log('🔍 Raw HTML content of recent transactions:', transactionDiv.innerHTML);
            
            return {
                divFound: true,
                totalItems: transactionItems.length,
                totalElements: allTransactionElements.length,
                transactions: transactions,
                rawHTML: transactionDiv.innerHTML
            };
        });
        
        console.log('📋 Recent transactions analysis:', recentTransactions);
        
        // Look specifically for the transaction we just created
        if (recentTransactions.divFound && recentTransactions.transactions.length > 0) {
            const ourTransaction = recentTransactions.transactions.find(t => 
                t.masseuse === 'May เมย์' && 
                t.service === 'Foot massage'
            );
            
            if (ourTransaction) {
                console.log('🔍 OUR TRANSACTION FOUND:', ourTransaction);
                console.log(`💰 Expected: Foot massage 90 minutes, Price: 650`);
                console.log(`💰 Actual: ${ourTransaction.service}, Amount: ${ourTransaction.amount}`);
                
                // Check if the amount shows the wrong price (350 instead of 650)
                if (ourTransaction.amount === '฿350.00' || ourTransaction.amount === '350') {
                    console.log('🚨 BUG CONFIRMED: Transaction shows wrong price (350 instead of 650)!');
                } else if (ourTransaction.amount === '฿650.00' || ourTransaction.amount === '650') {
                    console.log('✅ NO BUG: Transaction shows correct price (650)');
                } else {
                    console.log('❓ UNEXPECTED: Transaction shows different price than expected');
                }
            } else {
                console.log('❌ OUR TRANSACTION NOT FOUND in recent transactions');
                console.log('🔍 Available transactions:', recentTransactions.transactions);
            }
        } else {
            console.log('❌ No recent transactions div found or no transactions displayed');
            console.log('🔍 Raw HTML content:', recentTransactions.rawHTML);
        }
        
        // ADD COMPREHENSIVE POST-SUBMISSION ANALYSIS
        console.log('\n[STEP 9] COMPREHENSIVE POST-SUBMISSION ANALYSIS...');
        
        const postSubmissionAnalysis = await page.evaluate(() => {
            console.log('🔍 COMPREHENSIVE POST-SUBMISSION ANALYSIS:');
            
            // Check if any JavaScript errors occurred
            const consoleErrors = [];
            const originalConsoleError = console.error;
            console.error = function(...args) {
                consoleErrors.push(args.join(' '));
                originalConsoleError.apply(console, args);
            };
            
            // Check the current state of the form
            const form = document.querySelector('#transaction-form');
            const formState = {};
            if (form) {
                const inputs = form.querySelectorAll('input, select');
                inputs.forEach(input => {
                    if (input.name || input.id) {
                        const name = input.name || input.id;
                        let value;
                        
                        if (input.type === 'select-one') {
                            value = input.options[input.selectedIndex]?.text || input.value;
                        } else if (input.type === 'checkbox') {
                            value = input.checked;
                        } else {
                            value = input.value;
                        }
                        
                        formState[name] = value;
                    }
                });
            }
            
            // Check if any global variables or functions are missing
            const globalState = {
                hasSubmitTransaction: typeof window.submitTransaction === 'function',
                hasApi: typeof window.api === 'object',
                hasCreateTransaction: window.api && typeof window.api.createTransaction === 'function',
                hasPopulateDropdowns: typeof window.populateDropdowns === 'function',
                hasCalculatePrice: typeof window.calculatePrice === 'function',
                hasUpdateTimeDropdowns: typeof window.updateTimeDropdowns === 'function'
            };
            
            // Check if the page has any error indicators
            const pageErrors = {
                hasErrorClass: document.body.classList.contains('error'),
                hasErrorStyle: document.body.style.color === 'red',
                errorElements: document.querySelectorAll('[class*="error"], [id*="error"], [style*="error"]').length
            };
            
            return {
                formState,
                globalState,
                pageErrors,
                consoleErrors: consoleErrors.slice(-10) // Last 10 errors
            };
        });
        
        console.log('📋 Post-submission analysis:', postSubmissionAnalysis);
        
        // Check if there are any network errors or failed requests
        console.log('\n[STEP 10] NETWORK REQUEST ANALYSIS...');
        
        const networkAnalysis = await page.evaluate(() => {
            console.log('🔍 NETWORK REQUEST ANALYSIS:');
            
            // Check if there are any pending requests
            const pendingRequests = [];
            if (window.api && window.api.pendingRequests) {
                pendingRequests.push(...window.api.pendingRequests);
            }
            
            // Check if there are any failed requests
            const failedRequests = [];
            if (window.api && window.api.failedRequests) {
                failedRequests.push(...window.api.failedRequests);
            }
            
            return {
                pendingRequests: pendingRequests.length,
                failedRequests: failedRequests.length
            };
        });
        
        console.log('📋 Network analysis:', networkAnalysis);
        
        console.log('\n🔍 PRICING BUG REPRODUCTION COMPLETE');
        console.log('=====================================');
        console.log('Check the output above for the root cause of the pricing mismatch');
        console.log('Comprehensive logging has been added to capture the complete form submission flow');
        
    } catch (error) {
        console.error('❌ ERROR during pricing bug reproduction:', error);
    } finally {
        await browser.close();
    }
}

debugPricingBugReproduction();
