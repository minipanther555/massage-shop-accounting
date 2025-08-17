const puppeteer = require('puppeteer');

class CSRFRoutingComprehensiveDebug {
    constructor() {
        this.browser = null;
        this.page = null;
    }

    async setup() {
        console.log('🚀 SETUP: Launching browser...');
        this.browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        
        // Set realistic browser headers
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        });
        
        // Enable comprehensive logging
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`❌ CONSOLE ERROR: ${msg.text()}`);
            } else if (msg.text().includes('DEBUG') || msg.text().includes('ERROR') || msg.text().includes('SUCCESS')) {
                console.log(`📝 PAGE LOG: ${msg.text()}`);
            }
        });

        // Enable network request logging for ALL requests
        this.page.on('request', request => {
            console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
            if (request.postData()) {
                console.log(`📤 REQUEST BODY: ${request.postData()}`);
            }
            // Log all headers for debugging
            console.log(`📋 REQUEST HEADERS:`, request.headers());
        });

        this.page.on('response', response => {
            console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
            // Log response headers for debugging
            console.log(`📋 RESPONSE HEADERS:`, response.headers());
        });
    }

    async teardown() {
        if (this.browser) await this.browser.close();
    }

    /**
     * HYPOTHESIS 1: Route Handler Not Being Called
     * Test: Verify if the /api/main/transaction route is hitting the main.js handler
     */
    async testHypothesis1_RouteHandlerExecution() {
        console.log('\n🧪 HYPOTHESIS 1: Route Handler Execution');
        console.log('=' .repeat(70));
        
        try {
            console.log('🔍 STEP 1.1: Navigating to transaction page...');
            const response = await this.page.goto('https://109.123.238.197.sslip.io/api/main/transaction', { waitUntil: 'networkidle2' });
            
            console.log('🔍 STEP 1.2: Response status:', response.status());
            console.log('🔍 STEP 1.3: Response URL:', response.url());
            
            // Check if we got HTML content (expected) or an error
            const contentType = response.headers()['content-type'];
            console.log('🔍 STEP 1.4: Content-Type header:', contentType);
            
            const isHtml = contentType && contentType.includes('text/html');
            console.log('🔍 STEP 1.5: Is HTML response:', isHtml);
            
            if (!isHtml) {
                console.log('❌ HYPOTHESIS 1 FAILED: Route returned non-HTML content');
                return false;
            }
            
            console.log('✅ HYPOTHESIS 1 PASSED: Route handler returned HTML content');
            return true;
            
        } catch (error) {
            console.error('❌ HYPOTHESIS 1 ERROR:', error.message);
            return false;
        }
    }

    /**
     * HYPOTHESIS 2: Middleware Execution Order Issue
     * Test: Verify if addCSRFToken middleware is executing before route handler
     */
    async testHypothesis2_MiddlewareExecution() {
        console.log('\n🧪 HYPOTHESIS 2: Middleware Execution Order');
        console.log('=' .repeat(70));
        
        try {
            console.log('🔍 STEP 2.1: Checking page source for CSRF token patterns...');
            const pageSource = await this.page.content();
            
            // Look for any CSRF-related content
            const hasCSRFToken = pageSource.includes('csrf-token');
            const hasPlaceholder = pageSource.includes('{{ an_actual_token }}');
            const hasHexToken = /[a-f0-9]{64}/.test(pageSource);
            
            console.log('🔍 STEP 2.2: Page contains csrf-token meta tag:', hasCSRFToken);
            console.log('🔍 STEP 2.3: Page contains placeholder:', hasPlaceholder);
            console.log('🔍 STEP 2.4: Page contains hex token pattern:', hasHexToken);
            
            // Check if middleware executed by looking for token replacement
            if (hasPlaceholder && !hasHexToken) {
                console.log('❌ HYPOTHESIS 2 FAILED: Middleware did not execute - placeholder still present');
                return false;
            }
            
            if (!hasPlaceholder && hasHexToken) {
                console.log('✅ HYPOTHESIS 2 PASSED: Middleware executed and replaced placeholder');
                return true;
            }
            
            console.log('⚠️ HYPOTHESIS 2 UNCLEAR: Mixed results, need more investigation');
            return null;
            
        } catch (error) {
            console.error('❌ HYPOTHESIS 2 ERROR:', error.message);
            return false;
        }
    }

    /**
     * HYPOTHESIS 3: Session Cookie Not Being Sent
     * Test: Check if the page request includes the session cookie
     */
    async testHypothesis3_SessionCookiePresence() {
        console.log('\n🧪 HYPOTHESIS 3: Session Cookie Presence');
        console.log('=' .repeat(70));
        
        try {
            console.log('🔍 STEP 3.1: Getting all cookies...');
            const cookies = await this.page.cookies();
            
            console.log('🔍 STEP 3.2: Total cookies found:', cookies.length);
            cookies.forEach((cookie, index) => {
                console.log(`🔍 STEP 3.3: Cookie ${index + 1}:`, {
                    name: cookie.name,
                    value: cookie.value.substring(0, 20) + '...',
                    domain: cookie.domain,
                    path: cookie.path,
                    httpOnly: cookie.httpOnly,
                    secure: cookie.secure
                });
            });
            
            const sessionCookie = cookies.find(c => c.name === 'sessionId');
            if (sessionCookie) {
                console.log('✅ HYPOTHESIS 3 PASSED: Session cookie found');
                return true;
            } else {
                console.log('❌ HYPOTHESIS 3 FAILED: No session cookie found');
                return false;
            }
            
        } catch (error) {
            console.error('❌ HYPOTHESIS 3 ERROR:', error.message);
            return false;
        }
    }

    /**
     * HYPOTHESIS 4: HTML File Reading Failure
     * Test: Verify if fs.readFile callback is executing
     */
    async testHypothesis4_HTMLFileProcessing() {
        console.log('\n🧪 HYPOTHESIS 4: HTML File Processing');
        console.log('=' .repeat(70));
        
        try {
            console.log('🔍 STEP 4.1: Checking if page loaded completely...');
            const pageSource = await this.page.content();
            
            console.log('🔍 STEP 4.2: Page source length:', pageSource.length);
            console.log('🔍 STEP 4.3: Page contains transaction form:', pageSource.includes('transaction-form'));
            console.log('🔍 STEP 4.4: Page contains staff dropdown:', pageSource.includes('staff-dropdown'));
            console.log('🔍 STEP 4.5: Page contains service dropdown:', pageSource.includes('service-dropdown'));
            
            // Check if the page is a complete HTML document
            const hasHtmlStructure = pageSource.includes('<!DOCTYPE html>') || pageSource.includes('<html');
            const hasBody = pageSource.includes('<body');
            const hasClosingTags = pageSource.includes('</html>');
            
            console.log('🔍 STEP 4.6: Has HTML structure:', hasHtmlStructure);
            console.log('🔍 STEP 4.7: Has body tag:', hasBody);
            console.log('🔍 STEP 4.8: Has closing tags:', hasClosingTags);
            
            if (hasHtmlStructure && hasBody && hasClosingTags) {
                console.log('✅ HYPOTHESIS 4 PASSED: HTML file was read and processed correctly');
                return true;
            } else {
                console.log('❌ HYPOTHESIS 4 FAILED: HTML file reading or processing failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ HYPOTHESIS 4 ERROR:', error.message);
            return false;
        }
    }

    /**
     * HYPOTHESIS 5: HTML Replacement Logic Failure
     * Test: Verify if token replacement logic is working
     */
    async testHypothesis5_TokenReplacementLogic() {
        console.log('\n🧪 HYPOTHESIS 5: Token Replacement Logic');
        console.log('=' .repeat(70));
        
        try {
            console.log('🔍 STEP 5.1: Extracting CSRF token from meta tag...');
            const csrfToken = await this.page.evaluate(() => {
                const meta = document.querySelector('meta[name="csrf-token"]');
                return meta ? meta.getAttribute('content') : null;
            });
            
            console.log('🔍 STEP 5.2: CSRF token from meta tag:', csrfToken);
            console.log('🔍 STEP 5.3: Token length:', csrfToken ? csrfToken.length : 0);
            console.log('🔍 STEP 5.4: Token is placeholder:', csrfToken === '{{ an_actual_token }}');
            console.log('🔍 STEP 5.5: Token is hex format:', csrfToken ? /^[a-f0-9]{64}$/.test(csrfToken) : false);
            
            // Check hidden input as well
            const hiddenToken = await this.page.evaluate(() => {
                const input = document.querySelector('input[name="csrf_token"]');
                return input ? input.value : null;
            });
            
            console.log('🔍 STEP 5.6: Hidden input token:', hiddenToken);
            console.log('🔍 STEP 5.7: Hidden token is placeholder:', hiddenToken === '{{ an_actual_token }}');
            
            if (csrfToken && csrfToken !== '{{ an_actual_token }}' && /^[a-f0-9]{64}$/.test(csrfToken)) {
                console.log('✅ HYPOTHESIS 5 PASSED: Token replacement logic working correctly');
                return true;
            } else {
                console.log('❌ HYPOTHESIS 5 FAILED: Token replacement logic failed');
                return false;
            }
            
        } catch (error) {
            console.error('❌ HYPOTHESIS 5 ERROR:', error.message);
            return false;
        }
    }

    /**
     * COMPREHENSIVE TEST EXECUTION
     * Run all 5 hypotheses simultaneously with extensive logging
     */
    async runComprehensiveTest() {
        console.log('🚀 CSRF ROUTING COMPREHENSIVE DEBUG TEST');
        console.log('=' .repeat(70));
        console.log('🔍 Testing all 5 hypotheses simultaneously with extensive logging');
        console.log('🔍 This will identify exactly where the CSRF token injection is failing');
        
        try {
            // First, we need to login to get a session
            console.log('\n🔐 STEP 0: Authentication Setup');
            console.log('=' .repeat(50));
            
            console.log('🔍 STEP 0.1: Navigating to login page...');
            await this.page.goto('https://109.123.238.197.sslip.io/login.html', { waitUntil: 'networkidle2' });
            
            console.log('🔍 STEP 0.2: Filling login form...');
            await this.page.type('#username', 'manager');
            await this.page.type('#password', 'manager456');
            
            console.log('🔍 STEP 0.3: Clicking login button...');
            await this.page.click('#login-btn');
            
            console.log('🔍 STEP 0.4: Waiting for login response...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('🔍 STEP 0.5: Checking if login was successful...');
            const currentUrl = this.page.url();
            console.log('🔍 STEP 0.6: Current URL after login:', currentUrl);
            
            if (currentUrl.includes('index.html')) {
                console.log('✅ Authentication successful, proceeding to tests...');
            } else {
                console.log('❌ Authentication failed, cannot proceed with tests');
                return;
            }
            
            // Now run all 5 hypotheses
            const results = {
                hypothesis1: await this.testHypothesis1_RouteHandlerExecution(),
                hypothesis2: await this.testHypothesis2_MiddlewareExecution(),
                hypothesis3: await this.testHypothesis3_SessionCookiePresence(),
                hypothesis4: await this.testHypothesis4_HTMLFileProcessing(),
                hypothesis5: await this.testHypothesis5_TokenReplacementLogic()
            };
            
            // Comprehensive analysis
            console.log('\n📊 COMPREHENSIVE TEST RESULTS');
            console.log('=' .repeat(70));
            console.log('🔍 Hypothesis 1 (Route Handler):', results.hypothesis1 ? '✅ PASSED' : '❌ FAILED');
            console.log('🔍 Hypothesis 2 (Middleware):', results.hypothesis2 ? '✅ PASSED' : results.hypothesis2 === null ? '⚠️ UNCLEAR' : '❌ FAILED');
            console.log('🔍 Hypothesis 3 (Session Cookie):', results.hypothesis3 ? '✅ PASSED' : '❌ FAILED');
            console.log('🔍 Hypothesis 4 (HTML Processing):', results.hypothesis4 ? '✅ PASSED' : '❌ FAILED');
            console.log('🔍 Hypothesis 5 (Token Replacement):', results.hypothesis5 ? '✅ PASSED' : '❌ FAILED');
            
            // Root cause identification
            console.log('\n🔍 ROOT CAUSE ANALYSIS');
            console.log('=' .repeat(50));
            
            if (!results.hypothesis1) {
                console.log('🚨 ROOT CAUSE: Route handler not being called');
                console.log('💡 SOLUTION: Check server routing configuration');
            } else if (!results.hypothesis2) {
                console.log('🚨 ROOT CAUSE: Middleware not executing');
                console.log('💡 SOLUTION: Check middleware order and configuration');
            } else if (!results.hypothesis3) {
                console.log('🚨 ROOT CAUSE: Session cookie not being sent');
                console.log('💡 SOLUTION: Check authentication and cookie configuration');
            } else if (!results.hypothesis4) {
                console.log('🚨 ROOT CAUSE: HTML file reading/processing failed');
                console.log('💡 SOLUTION: Check file system and route handler logic');
            } else if (!results.hypothesis5) {
                console.log('🚨 ROOT CAUSE: Token replacement logic failed');
                console.log('💡 SOLUTION: Check CSRF middleware and HTML replacement');
            } else {
                console.log('✅ ALL HYPOTHESES PASSED: CSRF system working correctly');
            }
            
        } catch (error) {
            console.error('❌ COMPREHENSIVE TEST ERROR:', error);
        }
    }
}

// Execute the comprehensive test
async function main() {
    const debugTest = new CSRFRoutingComprehensiveDebug();
    
    try {
        await debugTest.setup();
        await debugTest.runComprehensiveTest();
    } catch (error) {
        console.error('❌ MAIN EXECUTION ERROR:', error);
    } finally {
        await debugTest.teardown();
    }
}

main();
