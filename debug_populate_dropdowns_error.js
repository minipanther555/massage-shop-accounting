const puppeteer = require('puppeteer');

async function debugPopulateDropdownsError() {
    console.log('🔍 TARGETED POPULATE DROPDOWNS ERROR DEBUGGING');
    console.log('==============================================');
    
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    try {
        // Enable console logging for ALL messages
        page.on('console', msg => {
            console.log(`📝 CONSOLE: ${msg.text()}`);
        });
        
        // Enable page error logging
        page.on('pageerror', error => {
            console.log(`❌ PAGE ERROR: ${error.message}`);
        });
        
        console.log('\n[STEP 1] Navigating to login page...');
        await page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle0' });
        
        console.log('\n[STEP 2] Logging in as manager...');
        await page.type('#username', 'manager');
        await page.type('#password', 'manager456');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        
        console.log('\n[STEP 3] Navigating to transaction page...');
        await page.goto('https://109.123.238.197.sslip.io/transaction.html', { waitUntil: 'networkidle0' });
        
        console.log('\n[STEP 4] TARGETED ERROR DEBUGGING...');
        
        // Wait for the page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Test the exact error in populateDropdowns
        const errorDetails = await page.evaluate(() => {
            console.log('🔍 TARGETED ERROR DEBUGGING STARTED');
            
            try {
                // Check if populateDropdowns exists
                console.log('🔍 STEP 1: Checking if populateDropdowns exists');
                if (typeof populateDropdowns === 'undefined') {
                    console.log('❌ STEP 1a: populateDropdowns is not defined');
                    return { error: 'populateDropdowns is not defined' };
                }
                
                console.log('🔍 STEP 1b: populateDropdowns exists, type:', typeof populateDropdowns);
                
                // Check if it's a function
                if (typeof populateDropdowns !== 'function') {
                    console.log('❌ STEP 1c: populateDropdowns is not a function');
                    return { error: 'populateDropdowns is not a function' };
                }
                
                console.log('✅ STEP 1d: populateDropdowns is a function');
                
                // Try to call it and catch the exact error
                console.log('🔍 STEP 2: About to call populateDropdowns()');
                
                try {
                    const result = populateDropdowns();
                    console.log('✅ STEP 2a: populateDropdowns() executed successfully');
                    console.log('🔍 STEP 2b: Result:', result);
                    
                    // Check if functions are now defined
                    console.log('🔍 STEP 3: Checking if functions are now defined');
                    
                    const functionNames = ['updateTimeDropdowns', 'handleSubmit', 'updateServiceOptions'];
                    const functionStatus = {};
                    
                    functionNames.forEach(name => {
                        try {
                            const func = eval(name);
                            functionStatus[name] = typeof func === 'function';
                            console.log(`🔍 STEP 3a: Function ${name} exists:`, functionStatus[name]);
                        } catch (error) {
                            functionStatus[name] = false;
                            console.log(`🔍 STEP 3b: Function ${name} error:`, error.message);
                        }
                    });
                    
                    console.log('🔍 STEP 3c: All function status:', functionStatus);
                    
                    return { 
                        success: true, 
                        result: result,
                        functionStatus: functionStatus
                    };
                    
                } catch (execError) {
                    console.log('❌ STEP 2c: populateDropdowns() execution failed');
                    console.log('❌ STEP 2d: Error message:', execError.message);
                    console.log('❌ STEP 2e: Error stack:', execError.stack);
                    console.log('❌ STEP 2f: Error type:', execError.constructor.name);
                    
                    return { 
                        success: false, 
                        error: execError.message,
                        stack: execError.stack,
                        type: execError.constructor.name
                    };
                }
                
            } catch (error) {
                console.log('❌ STEP 0: Outer error:', error.message);
                return { outerError: error.message };
            }
        });
        
        console.log('\n📋 ERROR DEBUGGING RESULTS:');
        console.log('=====================================');
        console.log('Error Details:', errorDetails);
        
        if (errorDetails.success) {
            console.log('✅ populateDropdowns executed successfully');
            console.log('Function Status:', errorDetails.functionStatus);
        } else {
            console.log('❌ populateDropdowns failed with error:', errorDetails.error);
            console.log('Error Type:', errorDetails.type);
            if (errorDetails.stack) {
                console.log('Error Stack:', errorDetails.stack);
            }
        }
        
    } catch (error) {
        console.error('❌ SCRIPT ERROR:', error);
    } finally {
        await browser.close();
    }
}

debugPopulateDropdownsError().catch(console.error);
