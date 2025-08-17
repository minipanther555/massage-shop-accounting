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
        
        console.log('\n🔍 PRICING BUG REPRODUCTION COMPLETE');
        console.log('=====================================');
        console.log('Check the output above for the root cause of the pricing mismatch');
        
    } catch (error) {
        console.error('❌ ERROR during pricing bug reproduction:', error);
    } finally {
        await browser.close();
    }
}

debugPricingBugReproduction();
