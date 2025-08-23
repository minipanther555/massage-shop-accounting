const puppeteer = require('puppeteer');

async function testUpdateTimeDropdowns() {
    console.log('🧪 TESTING UPDATE TIME DROPDOWNS FUNCTION');
    console.log('==========================================');
    
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
        
        // Enable console logging for ALL messages
        page.on('console', msg => {
            console.log(`📝 CONSOLE: ${msg.text()}`);
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
        
        console.log('\n[STEP 4] TESTING UPDATE TIME DROPDOWNS FUNCTION...');
        
        // Test 1: Check initial state
        const initialState = await page.evaluate(() => {
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const endTimeOptions = Array.from(document.getElementById('endTime').options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
            }));
            
            return {
                startTime,
                endTime,
                endTimeOptions
            };
        });
        
        console.log('📋 Initial state:', initialState);
        
        // Test 2: Select location and check if updateTimeDropdowns is called
        console.log('\n🔍 Selecting location: In-Shop');
        await page.select('#location', 'In-Shop');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 3: Select service and check if updateTimeDropdowns is called
        console.log('\n🔍 Selecting service: Aroma massage');
        await page.select('#service', 'Aroma massage');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 4: Select duration and check if updateTimeDropdowns is called
        console.log('\n🔍 Selecting duration: 60 minutes');
        await page.select('#duration', '60');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Test 5: Check state after duration selection
        const afterDurationState = await page.evaluate(() => {
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const endTimeOptions = Array.from(document.getElementById('endTime').options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
            }));
            
            return {
                startTime,
                endTime,
                endTimeOptions
            };
        });
        
        console.log('📋 After duration selection:', afterDurationState);
        
        // Test 6: Manually call updateTimeDropdowns and see what happens
        console.log('\n🔍 Manually calling updateTimeDropdowns()...');
        const manualCallResult = await page.evaluate(() => {
            console.log('🔍 MANUAL CALL: updateTimeDropdowns()');
            
            // Call the function manually
            if (typeof updateTimeDropdowns === 'function') {
                updateTimeDropdowns();
                
                // Wait a bit and check the result
                return new Promise(resolve => {
                    setTimeout(() => {
                        const startTime = document.getElementById('startTime').value;
                        const endTime = document.getElementById('endTime').value;
                        const endTimeOptions = Array.from(document.getElementById('endTime').options).map(opt => ({
                            value: opt.value,
                            text: opt.textContent,
                            selected: opt.selected
                        }));
                        
                        resolve({
                            startTime,
                            endTime,
                            endTimeOptions,
                            functionExists: true
                        });
                    }, 1000);
                });
            } else {
                return {
                    functionExists: false,
                    error: 'updateTimeDropdowns function not found'
                };
            }
        });
        
        console.log('📋 Manual call result:', manualCallResult);
        
        // Test 7: Check final state
        const finalState = await page.evaluate(() => {
            const startTime = document.getElementById('startTime').value;
            const endTime = document.getElementById('endTime').value;
            const endTimeOptions = Array.from(document.getElementById('endTime').options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
            }));
            
            return {
                startTime,
                endTime,
                endTimeOptions
            };
        });
        
        console.log('📋 Final state:', finalState);
        
        console.log('\n🧪 UPDATE TIME DROPDOWNS TESTING COMPLETE');
        console.log('==========================================');
        console.log('Check the output above for results');
        
    } catch (error) {
        console.error('❌ ERROR during testing:', error);
    } finally {
        await browser.close();
    }
}

testUpdateTimeDropdowns();
