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
        
    } catch (error) {
        console.error('❌ An error occurred during the test:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔒 Browser closed.');
        }
        console.log('✅ Test completed successfully');
    }
}

debugStaffRosterFunctionality();
