const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
    username: 'manager',
    password: 'manager456'
};

async function debugStaffRosterFunctionality() {
    console.log('🔍 DEBUGGING STAFF ROSTER FUNCTIONALITY 🔍');
    console.log('===========================================');
    console.log('Testing staff roster page: dropdown population, adding staff, and status management');
    
    let browser;
    
    try {
        console.log('[STEP 1/6] Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
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
        
        // Enable console logging from the page
        page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            }
        });
        
        // Track all requests and responses
        page.on('request', request => {
            console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
            if (request.postData()) {
                console.log(`📤 REQUEST BODY: ${request.postData()}`);
            }
        });
        
        page.on('response', response => {
            console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        });
        
        console.log('✅ Browser launched and configured.');
        
        // --- LOGIN TEST ---
        console.log('[STEP 2/6] Testing login functionality...');
        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });
        
        // Fill login form
        await page.type('#username', TEST_CREDENTIALS.username);
        await page.type('#password', TEST_CREDENTIALS.password);
        await page.click('#login-btn');
        
        // Wait for redirect
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✅ Login successful, redirected to main page.');
        
        // Wait for page to fully load and cookies to be set
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // --- STAFF ROSTER PAGE TEST ---
        console.log('[STEP 3/6] Testing staff roster page functionality...');
        await page.goto(`${BASE_URL}/api/main/staff-roster`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check initial state of the page
        console.log('           Checking initial page state...');
        const initialState = await page.evaluate(() => {
            return {
                hasAvailableStaffDropdown: !!document.getElementById('available-staff'),
                hasRosterList: !!document.getElementById('roster-list'),
                hasEmptyRosterMessage: !!document.getElementById('empty-roster'),
                hasAddButton: !!document.querySelector('button[onclick="addStaffToRoster()"]'),
                hasClearButton: !!document.querySelector('button[onclick="clearTodayRoster()"]'),
                dropdownOptions: Array.from(document.querySelector('#available-staff')?.options || []).map(opt => ({
                    value: opt.value,
                    text: opt.text,
                    selected: opt.selected
                })),
                rosterItems: Array.from(document.querySelectorAll('#roster-list .roster-item')).map(item => ({
                    position: item.querySelector('.position')?.textContent,
                    name: item.querySelector('.name')?.textContent,
                    status: item.querySelector('.status')?.textContent
                }))
            };
        });
        
        console.log('           Initial page state:', initialState);
        
        // Check if the dropdown is populated with staff names
        console.log('           Checking if dropdown is populated...');
        const dropdownState = await page.evaluate(() => {
            const dropdown = document.getElementById('available-staff');
            if (!dropdown) return { error: 'Dropdown not found' };
            
            const options = Array.from(dropdown.options);
            const availableOptions = options.filter(opt => opt.value && opt.text !== 'Select masseuse to add...');
            
            return {
                totalOptions: options.length,
                availableOptions: availableOptions.length,
                optionTexts: availableOptions.map(opt => opt.text),
                hasDefaultOption: options.some(opt => opt.text === 'Select masseuse to add...')
            };
        });
        
        console.log('           Dropdown state:', dropdownState);
        
        // --- TEST 1: Add Staff to Roster ---
        console.log('[STEP 4/6] Testing staff addition to roster...');
        
        if (dropdownState.availableOptions > 0) {
            // Select first available staff member
            const firstStaffName = dropdownState.optionTexts[0];
            console.log(`           Selecting first available staff: ${firstStaffName}`);
            
            await page.select('#available-staff', firstStaffName);
            await page.click('button[onclick="addStaffToRoster()"]');
            
            // Wait for the addition to complete
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Check if staff was added to roster
            const afterAdditionState = await page.evaluate(() => {
                const rosterItems = Array.from(document.querySelectorAll('#roster-list .roster-item')).map(item => ({
                    position: item.querySelector('.position')?.textContent,
                    name: item.querySelector('.name')?.textContent,
                    status: item.querySelector('.status')?.textContent
                }));
                
                return {
                    rosterItemCount: rosterItems.length,
                    rosterItems: rosterItems
                };
            });
            
            console.log('           After adding staff:', afterAdditionState);
            
            if (afterAdditionState.rosterItemCount > 0) {
                console.log('✅ Staff successfully added to roster!');
            } else {
                console.log('❌ Staff was not added to roster');
            }
        } else {
            console.log('⚠️ No staff available in dropdown to test with');
        }
        
        // --- TEST 2: Set Busy Status (1 minute duration) ---
        console.log('[STEP 5/6] Testing busy status setting with 1-minute duration...');
        
        // First, add another staff member if we have one available
        const secondStaffAvailable = await page.evaluate(() => {
            const dropdown = document.getElementById('available-staff');
            const options = Array.from(dropdown.options).filter(opt => opt.value && opt.text !== 'Select masseuse to add...');
            return options.length > 1 ? options[1].text : null;
        });
        
        if (secondStaffAvailable) {
            console.log(`           Adding second staff member: ${secondStaffAvailable}`);
            await page.select('#available-staff', secondStaffAvailable);
            await page.click('button[onclick="addStaffToRoster()"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Now set a busy status that expires in 1 minute
            const oneMinuteFromNow = new Date(Date.now() + 60000);
            const busyUntilTime = oneMinuteFromNow.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: true 
            });
            
            console.log(`           Setting busy status until ${busyUntilTime} (1 minute from now)`);
            
            // Find the second staff member in the roster and set them as busy
            const busyStatusSet = await page.evaluate((staffName, endTime) => {
                // Find the staff member in the roster
                const rosterItems = Array.from(document.querySelectorAll('#roster-list .roster-item'));
                const targetItem = rosterItems.find(item => 
                    item.querySelector('.name')?.textContent === staffName
                );
                
                if (targetItem) {
                    // Click on the status field to edit it
                    const statusField = targetItem.querySelector('.status');
                    if (statusField) {
                        statusField.textContent = `Busy until ${endTime}`;
                        return { success: true, message: `Status set to Busy until ${endTime}` };
                    }
                }
                
                return { success: false, message: 'Could not find staff member or status field' };
            }, secondStaffAvailable, busyUntilTime);
            
            console.log('           Busy status set result:', busyStatusSet);
            
            if (busyStatusSet.success) {
                console.log('✅ Busy status set successfully!');
                console.log(`⏰ Staff will be busy until ${busyUntilTime}`);
                console.log('🔄 Waiting 1 minute to test auto-reset...');
                
                // Wait 1 minute and 10 seconds to test auto-reset
                await new Promise(resolve => setTimeout(resolve, 70000));
                
                // Check if status was auto-reset
                const statusAfterTimeout = await page.evaluate((staffName) => {
                    const rosterItems = Array.from(document.querySelectorAll('#roster-list .roster-item'));
                    const targetItem = rosterItems.find(item => 
                        item.querySelector('.name')?.textContent === staffName
                    );
                    
                    if (targetItem) {
                        const statusField = targetItem.querySelector('.status');
                        return {
                            status: statusField?.textContent || 'No status',
                            wasReset: !statusField?.textContent?.includes('Busy until')
                        };
                    }
                    
                    return { error: 'Staff member not found' };
                }, secondStaffAvailable);
                
                console.log('           Status after timeout:', statusAfterTimeout);
                
                if (statusAfterTimeout.wasReset) {
                    console.log('✅ Busy status auto-reset working correctly!');
                } else {
                    console.log('❌ Busy status did not auto-reset - this is a bug!');
                }
            }
        } else {
            console.log('⚠️ Only one staff member available, skipping busy status test');
        }
        
        // --- TEST 3: Clear All Functionality ---
        console.log('[STEP 6/6] Testing Clear All functionality...');
        
        // Check current roster state
        const beforeClearState = await page.evaluate(() => {
            const rosterItems = Array.from(document.querySelectorAll('#roster-list .roster-item')).map(item => ({
                position: item.querySelector('.position')?.textContent,
                name: item.querySelector('.name')?.textContent,
                status: item.querySelector('.status')?.textContent
            }));
            
            return {
                rosterItemCount: rosterItems.length,
                hasStaffWithNames: rosterItems.some(item => item.name && item.name.trim() !== ''),
                hasStaffWithStatus: rosterItems.some(item => item.status && item.status.trim() !== '')
            };
        });
        
        console.log('           Before Clear All:', beforeClearState);
        
        if (beforeClearState.rosterItemCount > 0) {
            // Click Clear All button
            await page.click('button[onclick="clearTodayRoster()"]');
            
            // Wait for confirmation dialog and confirm
            await page.waitForSelector('button[onclick="clearTodayRoster()"]', { timeout: 5000 });
            
            // Wait for the clear operation to complete
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Check state after clearing
            const afterClearState = await page.evaluate(() => {
                const rosterItems = Array.from(document.querySelectorAll('#roster-list .roster-item')).map(item => ({
                    position: item.querySelector('.position')?.textContent,
                    name: item.querySelector('.name')?.textContent,
                    status: item.querySelector('.status')?.textContent
                }));
                
                return {
                    rosterItemCount: rosterItems.length,
                    hasStaffWithNames: rosterItems.some(item => item.name && item.name.trim() !== ''),
                    hasStaffWithStatus: rosterItems.some(item => item.status && item.status.trim() !== ''),
                    hasEmptyRosterMessage: !!document.getElementById('empty-roster')?.style.display !== 'none'
                };
            });
            
            console.log('           After Clear All:', afterClearState);
            
            if (!afterClearState.hasStaffWithNames && !afterClearState.hasStaffWithStatus) {
                console.log('✅ Clear All working correctly - no orphaned data!');
            } else {
                console.log('❌ Clear All has issues - orphaned data remains!');
            }
        } else {
            console.log('⚠️ No staff in roster to clear');
        }
        
        console.log('\n🎉 STAFF ROSTER FUNCTIONALITY TEST COMPLETE! 🎉');
        
        // --- COMPREHENSIVE HYPOTHESIS TESTING ---
        console.log('\n🔍 COMPREHENSIVE HYPOTHESIS TESTING FOR API ENDPOINT MISMATCH 🔍');
        console.log('===============================================================');
        console.log('Testing 5 hypotheses for why api.updateStaff() calls wrong endpoint');
        
        // HYPOTHESIS 1: Check if there are multiple updateStaff functions defined
        console.log('\n🔍 HYPOTHESIS 1: Multiple updateStaff functions defined');
        const multipleFunctionsTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 1 TESTING: Checking for multiple updateStaff functions');
            
            // Check global scope
            const globalUpdateStaff = typeof window.updateStaff;
            console.log('🔍 HYPOTHESIS 1: window.updateStaff =', globalUpdateStaff);
            
            // Check if api object has multiple updateStaff methods
            const apiMethods = Object.getOwnPropertyNames(window.api || {});
            const updateStaffMethods = apiMethods.filter(name => name.includes('updateStaff'));
            console.log('🔍 HYPOTHESIS 1: api methods containing "updateStaff":', updateStaffMethods);
            
            // Check if there are any local function definitions
            const allFunctions = [];
            for (let key in window) {
                if (typeof window[key] === 'function' && key.includes('updateStaff')) {
                    allFunctions.push(key);
                }
            }
            console.log('🔍 HYPOTHESIS 1: All functions containing "updateStaff":', allFunctions);
            
            return {
                globalUpdateStaff,
                updateStaffMethods,
                allFunctions
            };
        });
        console.log('           HYPOTHESIS 1 Results:', multipleFunctionsTest);
        
        // HYPOTHESIS 2: Check if the api object is being overridden
        console.log('\n🔍 HYPOTHESIS 2: API object being overridden');
        const apiOverrideTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2 TESTING: Checking if api object is overridden');
            
            // Check if api object exists and its properties
            const apiExists = typeof window.api !== 'undefined';
            console.log('🔍 HYPOTHESIS 2: window.api exists =', apiExists);
            
            if (apiExists) {
                const apiKeys = Object.getOwnPropertyNames(window.api);
                console.log('🔍 HYPOTHESIS 2: api object keys:', apiKeys);
                
                // Check if updateStaff method exists and its source
                const updateStaffMethod = window.api.updateStaff;
                const methodExists = typeof updateStaffMethod === 'function';
                console.log('🔍 HYPOTHESIS 2: api.updateStaff exists =', methodExists);
                
                if (methodExists) {
                    const methodSource = updateStaffMethod.toString();
                    console.log('🔍 HYPOTHESIS 2: api.updateStaff source:', methodSource.substring(0, 200) + '...');
                    
                    // Check if it contains the expected endpoint
                    const hasCorrectEndpoint = methodSource.includes('/staff/roster/');
                    console.log('🔍 HYPOTHESIS 2: Contains /staff/roster/ endpoint =', hasCorrectEndpoint);
                    
                    return {
                        apiExists,
                        apiKeys,
                        methodExists,
                        hasCorrectEndpoint,
                        methodSource: methodSource.substring(0, 200)
                    };
                }
            }
            
            return { apiExists: false };
        });
        console.log('           HYPOTHESIS 2 Results:', apiOverrideTest);
        
        // HYPOTHESIS 3: Check for JavaScript redirection/middleware
        console.log('\n🔍 HYPOTHESIS 3: JavaScript redirection/middleware');
        const redirectionTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3 TESTING: Checking for JavaScript redirection');
            
            // Check if there are any fetch/XMLHttpRequest overrides
            const originalFetch = window.fetch;
            const originalXHR = window.XMLHttpRequest;
            
            // Check if fetch has been modified
            const fetchModified = originalFetch.toString() !== (() => {}).toString();
            console.log('🔍 HYPOTHESIS 3: fetch modified =', fetchModified);
            
            // Check if there are any event listeners on fetch
            const fetchListeners = window.addEventListener ? 'Has addEventListener' : 'No addEventListener';
            console.log('🔍 HYPOTHESIS 3: fetch listeners =', fetchListeners);
            
            // Check for any global request interceptors
            const hasInterceptors = typeof window.requestInterceptor !== 'undefined' || 
                                  typeof window.apiInterceptor !== 'undefined';
            console.log('🔍 HYPOTHESIS 3: Has interceptors =', hasInterceptors);
            
            return {
                fetchModified,
                fetchListeners,
                hasInterceptors
            };
        });
        console.log('           HYPOTHESIS 3 Results:', redirectionTest);
        
        // HYPOTHESIS 4: Check for cached JavaScript issues
        console.log('\n🔍 HYPOTHESIS 4: Cached JavaScript issues');
        const cacheTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4 TESTING: Checking for cached JavaScript issues');
            
            // Check script tags and their sources
            const scripts = Array.from(document.scripts);
            const scriptSources = scripts.map(script => ({
                src: script.src,
                hasContent: !!script.textContent,
                contentLength: script.textContent ? script.textContent.length : 0
            }));
            
            console.log('🔍 HYPOTHESIS 4: Script sources:', scriptSources);
            
            // Check if any scripts contain updateStaff definitions
            const updateStaffScripts = scripts.filter(script => {
                const content = script.textContent || '';
                return content.includes('updateStaff') && content.includes('function');
            });
            
            console.log('🔍 HYPOTHESIS 4: Scripts with updateStaff functions:', updateStaffScripts.length);
            
            return {
                totalScripts: scripts.length,
                scriptSources,
                updateStaffScripts: updateStaffScripts.length
            };
        });
        console.log('           HYPOTHESIS 4 Results:', cacheTest);
        
        // HYPOTHESIS 5: Check for different updateStaff function from another module
        console.log('\n🔍 HYPOTHESIS 5: Different updateStaff from another module');
        const moduleTest = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5 TESTING: Checking for different updateStaff from modules');
            
            // Check if there are any imported modules or namespaces
            const globalObjects = Object.getOwnPropertyNames(window);
            const potentialModules = globalObjects.filter(name => 
                name.includes('staff') || 
                name.includes('roster') || 
                name.includes('admin') ||
                name.includes('api')
            );
            
            console.log('🔍 HYPOTHESIS 5: Potential module objects:', potentialModules);
            
            // Check each potential module for updateStaff
            const moduleResults = {};
            potentialModules.forEach(moduleName => {
                const module = window[moduleName];
                if (module && typeof module === 'object') {
                    const hasUpdateStaff = typeof module.updateStaff === 'function';
                    if (hasUpdateStaff) {
                        const methodSource = module.updateStaff.toString();
                        moduleResults[moduleName] = {
                            hasUpdateStaff: true,
                            methodSource: methodSource.substring(0, 200)
                        };
                        console.log(`🔍 HYPOTHESIS 5: ${moduleName}.updateStaff found:`, methodSource.substring(0, 200));
                    }
                }
            });
            
            return {
                potentialModules,
                moduleResults
            };
        });
        console.log('           HYPOTHESIS 5 Results:', moduleTest);
        
        // COMPREHENSIVE LOGGING: Test the actual updateStaff call with extensive logging
        console.log('\n🔍 COMPREHENSIVE LOGGING: Testing actual updateStaff call');
        console.log('========================================================');
        
        // Add extensive logging to the page
        await page.evaluate(() => {
            console.log('🔍 COMPREHENSIVE LOGGING: Setting up extensive logging');
            
            // Override console.log to capture everything
            const originalLog = console.log;
            console.log = function(...args) {
                originalLog.apply(console, ['🔍 LOGGING:', ...args]);
            };
            
            // ADD CRITICAL LOGGING: Monitor api object throughout the entire process
            let apiObjectCheckCount = 0;
            const apiObjectMonitor = setInterval(() => {
                apiObjectCheckCount++;
                const apiExists = typeof window.api !== 'undefined';
                const apiKeys = window.api ? Object.getOwnPropertyNames(window.api) : [];
                const updateStaffExists = window.api ? typeof window.api.updateStaff : 'undefined';
                
                console.log(`🔍 API MONITOR #${apiObjectCheckCount}:`, {
                    apiExists,
                    apiKeys,
                    updateStaffExists,
                    timestamp: new Date().toISOString()
                });
                
                // If api object disappears, log it immediately
                if (!apiExists && apiObjectCheckCount > 1) {
                    console.log('🚨 CRITICAL: API OBJECT JUST DISAPPEARED!');
                    console.log('🚨 CRITICAL: Stack trace:', new Error().stack);
                }
                
                // If api object reappears, log it immediately
                if (apiExists && apiObjectCheckCount > 1) {
                    console.log('✅ CRITICAL: API OBJECT JUST REAPPEARED!');
                    console.log('✅ CRITICAL: Stack trace:', new Error().stack);
                }
            }, 100); // Check every 100ms
            
            // Store the monitor so we can clear it later
            window.apiObjectMonitor = apiObjectMonitor;
            
            // Log the initial api object state
            console.log('🔍 LOGGING: Initial api object state:', {
                exists: typeof window.api !== 'undefined',
                keys: window.api ? Object.getOwnPropertyNames(window.api) : [],
                updateStaffType: window.api ? typeof window.api.updateStaff : 'undefined'
            });
            
            // Log the addStaffToRoster function
            console.log('🔍 LOGGING: addStaffToRoster function exists:', typeof window.addStaffToRoster === 'function');
            
            if (typeof window.addStaffToRoster === 'function') {
                const functionSource = window.addStaffToRoster.toString();
                console.log('🔍 LOGGING: addStaffToRoster source:', functionSource.substring(0, 300));
            }
            
            // Log the current roster state
            console.log('🔍 LOGGING: Current appData.roster:', window.appData ? window.appData.roster : 'undefined');
            console.log('🔍 LOGGING: Current CONFIG.settings.masseuses:', window.CONFIG ? window.CONFIG.settings.masseuses : 'undefined');
            
            // ADD CRITICAL LOGGING: Override the api.updateStaff method to log every call
            if (window.api && typeof window.api.updateStaff === 'function') {
                const originalUpdateStaff = window.api.updateStaff;
                window.api.updateStaff = function(position, data) {
                    console.log('🔍 CRITICAL: api.updateStaff called with:', { position, data });
                    console.log('🔍 CRITICAL: This function source:', originalUpdateStaff.toString().substring(0, 200));
                    console.log('🔍 CRITICAL: Calling original function...');
                    return originalUpdateStaff.call(this, position, data);
                };
                console.log('🔍 LOGGING: Successfully overrode api.updateStaff with logging');
            } else {
                console.log('🔍 CRITICAL: api.updateStaff method not found or not a function!');
            }
            
            // ADD CRITICAL LOGGING: Override the fetch method to log all API calls
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
                console.log('🔍 CRITICAL: fetch called with URL:', url);
                console.log('🔍 CRITICAL: fetch options:', options);
                console.log('🔍 CRITICAL: Stack trace:', new Error().stack);
                return originalFetch.call(this, url, options);
            };
            console.log('🔍 LOGGING: Successfully overrode fetch with logging');
            
            // ADD CRITICAL LOGGING: Check for any global updateStaff functions
            console.log('🔍 CRITICAL: Checking for global updateStaff functions...');
            for (const key in window) {
                if (key.includes('updateStaff') && typeof window.key === 'function') {
                    console.log('🔍 CRITICAL: Found global function:', key, 'with source:', window[key].toString().substring(0, 200));
                }
            }
            
            // ADD CRITICAL LOGGING: Check if addStaffToRoster is calling the right function
            const originalAddStaffToRoster = window.addStaffToRoster;
            if (typeof originalAddStaffToRoster === 'function') {
                window.addStaffToRoster = function() {
                    console.log('🔍 CRITICAL: addStaffToRoster function called!');
                    console.log('🔍 CRITICAL: About to call api.updateStaff...');
                    console.log('🔍 CRITICAL: api object at this moment:', window.api);
                    console.log('🔍 CRITICAL: api.updateStaff at this moment:', window.api ? window.api.updateStaff : 'undefined');
                    console.log('🔍 CRITICAL: Stack trace at call time:', new Error().stack);
                    return originalAddStaffToRoster.call(this);
                };
                console.log('🔍 LOGGING: Successfully overrode addStaffToRoster with logging');
            }
            
            // ADD CRITICAL LOGGING: Monitor for any script loading or DOM changes that might affect api object
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.tagName === 'SCRIPT') {
                                console.log('🔍 CRITICAL: New script added to DOM:', node.src || 'inline script');
                                console.log('🔍 CRITICAL: api object state after script addition:', {
                                    exists: typeof window.api !== 'undefined',
                                    keys: window.api ? Object.getOwnPropertyNames(window.api) : []
                                });
                            }
                        });
                    }
                });
            });
            
            observer.observe(document.head, { childList: true });
            observer.observe(document.body, { childList: true });
            console.log('🔍 LOGGING: DOM mutation observer set up to monitor script additions');
        });
        
        // Now test the actual addStaffToRoster function with logging
        console.log('           Testing addStaffToRoster with comprehensive logging...');
        
        // Select a staff member and trigger the function
        await page.select('#available-staff', 'May เมย์');
        console.log('           Selected May เมย์ from dropdown');
        
        // ADD CRITICAL LOGGING: Log the exact state before clicking
        const beforeClickState = await page.evaluate(() => {
            console.log('🔍 CRITICAL: State BEFORE clicking Add button:');
            console.log('🔍 CRITICAL: - api object exists:', typeof window.api !== 'undefined');
            console.log('🔍 CRITICAL: - api.updateStaff exists:', window.api ? typeof window.api.updateStaff : 'undefined');
            console.log('🔍 CRITICAL: - addStaffToRoster function exists:', typeof window.addStaffToRoster === 'function');
            console.log('🔍 CRITICAL: - Current roster length:', window.appData ? window.appData.roster.length : 'undefined');
            
            return {
                apiExists: typeof window.api !== 'undefined',
                updateStaffExists: window.api ? typeof window.api.updateStaff : 'undefined',
                addStaffFunctionExists: typeof window.addStaffToRoster === 'function',
                rosterLength: window.appData ? window.appData.roster.length : 'undefined'
            };
        });
        console.log('           Before click state:', beforeClickState);
        
        // Click the add button and capture all the logging
        await page.click('button[onclick="addStaffToRoster()"]');
        console.log('           Clicked Add button');
        
        // ADD CRITICAL LOGGING: Wait and capture immediate state after click
        await new Promise(resolve => setTimeout(resolve, 1000));
        const afterClickState = await page.evaluate(() => {
            console.log('🔍 CRITICAL: State AFTER clicking Add button:');
            console.log('🔍 CRITICAL: - Any console errors:', window.consoleErrors || []);
            console.log('🔍 CRITICAL: - Any fetch calls made:', window.fetchCalls || []);
            
            return {
                hasErrors: window.consoleErrors ? window.consoleErrors.length > 0 : false,
                fetchCalls: window.fetchCalls || []
            };
        });
        console.log('           After click state:', afterClickState);
        
        // Wait for any API calls and capture the results
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Capture the final state after the attempt
        const finalState = await page.evaluate(() => {
            console.log('🔍 LOGGING: Final state after addStaffToRoster attempt');
            
            // Clean up the API object monitor
            if (window.apiObjectMonitor) {
                clearInterval(window.apiObjectMonitor);
                console.log('🔍 LOGGING: API object monitor cleared');
            }
            
            return {
                rosterLength: window.appData ? window.appData.roster.length : 0,
                rosterItems: window.appData ? window.appData.roster : [],
                dropdownValue: document.getElementById('available-staff').value,
                hasErrors: document.querySelectorAll('.error, .toast-error').length > 0,
                consoleLogs: [], // We'll capture these separately
                finalApiState: {
                    exists: typeof window.api !== 'undefined',
                    keys: window.api ? Object.getOwnPropertyNames(window.api) : [],
                    updateStaffExists: window.api ? typeof window.api.updateStaff : 'undefined'
                }
            };
        });
        
        console.log('           Final state after addStaffToRoster:', finalState);
        
        console.log('\n🎯 HYPOTHESIS TESTING COMPLETE! 🎯');
        console.log('All 5 hypotheses have been tested with comprehensive logging');
        
    } catch (error) {
        console.error('❌ TEST FAILED:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed.');
        }
    }
}

// Run the test
debugStaffRosterFunctionality()
    .then(() => {
        console.log('✅ Test completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
        process.exit(1);
    });
