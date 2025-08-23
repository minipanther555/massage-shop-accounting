const puppeteer = require('puppeteer');

async function debugPaymentSelectComprehensive() {
    console.log('🔍 COMPREHENSIVE PAYMENT SELECT DEBUGGING');
    console.log('==========================================');
    
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
        
        // Enable request failed logging
        page.on('requestfailed', request => {
            console.log(`❌ REQUEST FAILED: ${request.url()}`);
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
        
        console.log('\n[STEP 4] COMPREHENSIVE HYPOTHESIS TESTING...');
        
        // Test all 5 hypotheses simultaneously with extensive logging
        const results = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS TESTING STARTED');
            
            // HYPOTHESIS 1: Multiple const paymentSelect declarations
            console.log('🔍 HYPOTHESIS 1: Checking for multiple const paymentSelect declarations...');
            try {
                // Get all script tags
                const scripts = document.querySelectorAll('script');
                console.log('🔍 HYPOTHESIS 1a: Total script tags found:', scripts.length);
                
                let constPaymentSelectCount = 0;
                let letPaymentSelectCount = 0;
                let varPaymentSelectCount = 0;
                let noKeywordPaymentSelectCount = 0;
                
                scripts.forEach((script, index) => {
                    const content = script.textContent || script.innerHTML;
                    console.log(`🔍 HYPOTHESIS 1b: Script ${index} content length:`, content.length);
                    
                    // Count different declaration types
                    const constMatches = content.match(/const\s+paymentSelect/g);
                    const letMatches = content.match(/let\s+paymentSelect/g);
                    const varMatches = content.match(/var\s+paymentSelect/g);
                    const noKeywordMatches = content.match(/(?<!const\s|let\s|var\s)paymentSelect\s*=/g);
                    
                    if (constMatches) {
                        constPaymentSelectCount += constMatches.length;
                        console.log(`🔍 HYPOTHESIS 1c: Script ${index} has ${constMatches.length} const paymentSelect declarations`);
                    }
                    if (letMatches) {
                        letPaymentSelectCount += letMatches.length;
                        console.log(`🔍 HYPOTHESIS 1d: Script ${index} has ${letMatches.length} let paymentSelect declarations`);
                    }
                    if (varMatches) {
                        varPaymentSelectCount += varMatches.length;
                        console.log(`🔍 HYPOTHESIS 1e: Script ${index} has ${varMatches.length} var paymentSelect declarations`);
                    }
                    if (noKeywordMatches) {
                        noKeywordPaymentSelectCount += noKeywordMatches.length;
                        console.log(`🔍 HYPOTHESIS 1f: Script ${index} has ${noKeywordMatches.length} no-keyword paymentSelect assignments`);
                    }
                });
                
                console.log('🔍 HYPOTHESIS 1g: Total const paymentSelect declarations:', constPaymentSelectCount);
                console.log('🔍 HYPOTHESIS 1h: Total let paymentSelect declarations:', letPaymentSelectCount);
                console.log('🔍 HYPOTHESIS 1i: Total var paymentSelect declarations:', varPaymentSelectCount);
                console.log('🔍 HYPOTHESIS 1j: Total no-keyword paymentSelect assignments:', noKeywordPaymentSelectCount);
                
                const hypothesis1Result = constPaymentSelectCount > 1;
                console.log('🔍 HYPOTHESIS 1k: Multiple const declarations found:', hypothesis1Result);
                
                return { hypothesis1: hypothesis1Result, counts: { const: constPaymentSelectCount, let: letPaymentSelectCount, var: varPaymentSelectCount, noKeyword: noKeywordPaymentSelectCount } };
                
            } catch (error) {
                console.log('❌ HYPOTHESIS 1 ERROR:', error.message);
                return { hypothesis1: false, error: error.message };
            }
        });
        
        console.log('\n[STEP 5] HYPOTHESIS 2: Checking for let/const conflicts...');
        const hypothesis2Results = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 2: Checking for let/const conflicts...');
            
            try {
                // Get the specific script that contains the function
                const scripts = document.querySelectorAll('script');
                let targetScript = null;
                
                scripts.forEach((script, index) => {
                    const content = script.textContent || script.innerHTML;
                    if (content.includes('updateTimeDropdowns')) {
                        targetScript = { index, content };
                        console.log(`🔍 HYPOTHESIS 2a: Found target script at index ${index}`);
                    }
                });
                
                if (!targetScript) {
                    console.log('❌ HYPOTHESIS 2b: Target script not found');
                    return { hypothesis2: false, error: 'Target script not found' };
                }
                
                // Check for declaration order issues
                const lines = targetScript.content.split('\n');
                let paymentSelectDeclarations = [];
                
                lines.forEach((line, lineNum) => {
                    if (line.includes('paymentSelect')) {
                        const trimmed = line.trim();
                        console.log(`🔍 HYPOTHESIS 2c: Line ${lineNum + 1}: "${trimmed}"`);
                        
                        if (trimmed.includes('const paymentSelect') || trimmed.includes('let paymentSelect') || trimmed.includes('var paymentSelect')) {
                            paymentSelectDeclarations.push({
                                line: lineNum + 1,
                                type: trimmed.includes('const') ? 'const' : trimmed.includes('let') ? 'let' : 'var',
                                content: trimmed
                            });
                        }
                    }
                });
                
                console.log('🔍 HYPOTHESIS 2d: All paymentSelect declarations found:', paymentSelectDeclarations);
                
                // Check for conflicts
                const hasConst = paymentSelectDeclarations.some(d => d.type === 'const');
                const hasLet = paymentSelectDeclarations.some(d => d.type === 'let');
                const hasVar = paymentSelectDeclarations.some(d => d.type === 'var');
                
                const hypothesis2Result = (hasConst && hasLet) || (hasConst && hasVar) || (hasLet && hasVar);
                console.log('🔍 HYPOTHESIS 2e: Declaration type conflicts found:', hypothesis2Result);
                
                return { hypothesis2: hypothesis2Result, declarations: paymentSelectDeclarations };
                
            } catch (error) {
                console.log('❌ HYPOTHESIS 2 ERROR:', error.message);
                return { hypothesis2: false, error: error.message };
            }
        });
        
        console.log('\n[STEP 6] HYPOTHESIS 3: Checking script tag conflicts...');
        const hypothesis3Results = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 3: Checking script tag conflicts...');
            
            try {
                const scripts = document.querySelectorAll('script');
                let scriptPaymentSelectMap = [];
                
                scripts.forEach((script, index) => {
                    const content = script.textContent || script.innerHTML;
                    const constMatches = content.match(/const\s+paymentSelect/g);
                    const letMatches = content.match(/let\s+paymentSelect/g);
                    const varMatches = content.match(/var\s+paymentSelect/g);
                    
                    if (constMatches || letMatches || varMatches) {
                        scriptPaymentSelectMap.push({
                            scriptIndex: index,
                            constCount: constMatches ? constMatches.length : 0,
                            letCount: letMatches ? letMatches.length : 0,
                            varCount: varMatches ? varMatches.length : 0,
                            total: (constMatches ? constMatches.length : 0) + (letMatches ? letMatches.length : 0) + (varMatches ? varMatches.length : 0)
                        });
                        console.log(`🔍 HYPOTHESIS 3a: Script ${index} has paymentSelect declarations:`, {
                            const: constMatches ? constMatches.length : 0,
                            let: letMatches ? letMatches.length : 0,
                            var: varMatches ? varMatches.length : 0
                        });
                    }
                });
                
                console.log('🔍 HYPOTHESIS 3b: Script paymentSelect map:', scriptPaymentSelectMap);
                
                const hypothesis3Result = scriptPaymentSelectMap.length > 1;
                console.log('🔍 HYPOTHESIS 3c: Multiple scripts have paymentSelect declarations:', hypothesis3Result);
                
                return { hypothesis3: hypothesis3Result, scriptMap: scriptPaymentSelectMap };
                
            } catch (error) {
                console.log('❌ HYPOTHESIS 3 ERROR:', error.message);
                return { hypothesis3: false, error: error.message };
            }
        });
        
        console.log('\n[STEP 7] HYPOTHESIS 4: Checking scope conflicts...');
        const hypothesis4Results = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 4: Checking scope conflicts...');
            
            try {
                // Check if paymentSelect is declared in global scope
                const scripts = document.querySelectorAll('script');
                let globalScopeDeclarations = [];
                let functionScopeDeclarations = [];
                
                scripts.forEach((script, index) => {
                    const content = script.textContent || script.innerHTML;
                    const lines = content.split('\n');
                    
                    lines.forEach((line, lineNum) => {
                        if (line.includes('paymentSelect')) {
                            const trimmed = line.trim();
                            
                            // Check if it's in global scope (not inside a function)
                            const beforeLine = content.substring(0, content.indexOf(line)).split('\n');
                            let functionDepth = 0;
                            
                            for (let i = 0; i < beforeLine.length; i++) {
                                if (beforeLine[i].includes('function') || beforeLine[i].includes('=>')) {
                                    functionDepth++;
                                }
                                if (beforeLine[i].includes('}')) {
                                    functionDepth--;
                                }
                            }
                            
                            if (functionDepth === 0) {
                                globalScopeDeclarations.push({
                                    script: index,
                                    line: lineNum + 1,
                                    content: trimmed,
                                    scope: 'global'
                                });
                                console.log(`🔍 HYPOTHESIS 4a: Global scope declaration in script ${index}, line ${lineNum + 1}: "${trimmed}"`);
                            } else {
                                functionScopeDeclarations.push({
                                    script: index,
                                    line: lineNum + 1,
                                    content: trimmed,
                                    scope: 'function',
                                    depth: functionDepth
                                });
                                console.log(`🔍 HYPOTHESIS 4b: Function scope declaration in script ${index}, line ${lineNum + 1}: "${trimmed}" (depth: ${functionDepth})`);
                            }
                        }
                    });
                });
                
                console.log('🔍 HYPOTHESIS 4c: Global scope declarations:', globalScopeDeclarations);
                console.log('🔍 HYPOTHESIS 4d: Function scope declarations:', functionScopeDeclarations);
                
                const hypothesis4Result = globalScopeDeclarations.length > 1;
                console.log('🔍 HYPOTHESIS 4e: Multiple global scope declarations found:', hypothesis4Result);
                
                return { hypothesis4: hypothesis4Result, global: globalScopeDeclarations, function: functionScopeDeclarations };
                
            } catch (error) {
                console.log('❌ HYPOTHESIS 4 ERROR:', error.message);
                return { hypothesis4: false, error: error.message };
            }
        });
        
        console.log('\n[STEP 8] HYPOTHESIS 5: Checking declaration order...');
        const hypothesis5Results = await page.evaluate(() => {
            console.log('🔍 HYPOTHESIS 5: Checking declaration order...');
            
            try {
                const scripts = document.querySelectorAll('script');
                let allDeclarations = [];
                
                scripts.forEach((script, index) => {
                    const content = script.textContent || script.innerHTML;
                    const lines = content.split('\n');
                    
                    lines.forEach((line, lineNum) => {
                        if (line.includes('paymentSelect') && (line.includes('const') || line.includes('let') || line.includes('var'))) {
                            const trimmed = line.trim();
                            allDeclarations.push({
                                script: index,
                                line: lineNum + 1,
                                content: trimmed,
                                type: trimmed.includes('const') ? 'const' : trimmed.includes('let') ? 'let' : 'var'
                            });
                        }
                    });
                });
                
                // Sort by script index and line number
                allDeclarations.sort((a, b) => {
                    if (a.script !== b.script) return a.script - b.script;
                    return a.line - b.line;
                });
                
                console.log('🔍 HYPOTHESIS 5a: All declarations in order:', allDeclarations);
                
                // Check for redeclaration issues
                let redeclarationIssues = [];
                for (let i = 1; i < allDeclarations.length; i++) {
                    const prev = allDeclarations[i - 1];
                    const curr = allDeclarations[i];
                    
                    if (prev.type === 'const' && curr.type === 'const') {
                        redeclarationIssues.push({
                            issue: 'const redeclaration',
                            prev: prev,
                            curr: curr
                        });
                        console.log(`🔍 HYPOTHESIS 5b: Const redeclaration issue:`, { prev, curr });
                    }
                    
                    if (prev.type === 'let' && curr.type === 'let') {
                        redeclarationIssues.push({
                            issue: 'let redeclaration',
                            prev: prev,
                            curr: curr
                        });
                        console.log(`🔍 HYPOTHESIS 5c: Let redeclaration issue:`, { prev, curr });
                    }
                }
                
                console.log('🔍 HYPOTHESIS 5d: Redeclaration issues found:', redeclarationIssues);
                
                const hypothesis5Result = redeclarationIssues.length > 0;
                console.log('🔍 HYPOTHESIS 5e: Declaration order issues found:', hypothesis5Result);
                
                return { hypothesis5: hypothesis5Result, issues: redeclarationIssues, allDeclarations };
                
            } catch (error) {
                console.log('❌ HYPOTHESIS 5 ERROR:', error.message);
                return { hypothesis5: false, error: error.message };
            }
        });
        
        console.log('\n[STEP 9] FINAL COMPREHENSIVE ANALYSIS...');
        const finalResults = await page.evaluate(() => {
            console.log('🔍 FINAL COMPREHENSIVE ANALYSIS STARTED');
            
            try {
                // Try to define a simple test function to see if JavaScript is working at all
                console.log('🔍 FINAL TEST 1: Testing basic JavaScript execution...');
                const testVar = 'test';
                console.log('🔍 FINAL TEST 1a: Basic variable assignment works:', testVar);
                
                // Try to access the page elements
                console.log('🔍 FINAL TEST 2: Testing DOM access...');
                const startTimeElement = document.getElementById('startTime');
                console.log('🔍 FINAL TEST 2a: startTime element found:', !!startTimeElement);
                
                const endTimeElement = document.getElementById('endTime');
                console.log('🔍 FINAL TEST 2b: endTime element found:', !!endTimeElement);
                
                // Try to check if any functions are defined
                console.log('🔍 FINAL TEST 3: Testing function definitions...');
                const functionNames = ['updateTimeDropdowns', 'formatTime', 'updateServiceOptions'];
                const functionStatus = {};
                
                functionNames.forEach(name => {
                    try {
                        const func = eval(name);
                        functionStatus[name] = typeof func === 'function';
                        console.log(`🔍 FINAL TEST 3a: Function ${name} exists:`, functionStatus[name]);
                    } catch (error) {
                        functionStatus[name] = false;
                        console.log(`🔍 FINAL TEST 3b: Function ${name} error:`, error.message);
                    }
                });
                
                console.log('🔍 FINAL TEST 3c: All function status:', functionStatus);
                
                return { 
                    basicJS: true, 
                    domAccess: { startTime: !!startTimeElement, endTime: !!endTimeElement },
                    functions: functionStatus
                };
                
            } catch (error) {
                console.log('❌ FINAL TEST ERROR:', error.message);
                return { basicJS: false, error: error.message };
            }
        });
        
        // Compile all results
        console.log('\n📋 COMPREHENSIVE TEST RESULTS:');
        console.log('=====================================');
        console.log('HYPOTHESIS 1 (Multiple const declarations):', results.hypothesis1);
        console.log('HYPOTHESIS 2 (Let/const conflicts):', hypothesis2Results.hypothesis2);
        console.log('HYPOTHESIS 3 (Script tag conflicts):', hypothesis3Results.hypothesis3);
        console.log('HYPOTHESIS 4 (Scope conflicts):', hypothesis4Results.hypothesis4);
        console.log('HYPOTHESIS 5 (Declaration order):', hypothesis5Results.hypothesis5);
        console.log('FINAL TEST (Basic functionality):', finalResults.basicJS);
        
        if (results.counts) {
            console.log('\n📊 DECLARATION COUNTS:');
            console.log('const paymentSelect:', results.counts.const);
            console.log('let paymentSelect:', results.counts.let);
            console.log('var paymentSelect:', results.counts.var);
            console.log('no-keyword assignments:', results.counts.noKeyword);
        }
        
        // Determine the root cause
        let rootCause = 'Unknown';
        if (results.hypothesis1) rootCause = 'Multiple const declarations';
        else if (hypothesis2Results.hypothesis2) rootCause = 'Let/const type conflicts';
        else if (hypothesis3Results.hypothesis3) rootCause = 'Multiple script tags with declarations';
        else if (hypothesis4Results.hypothesis4) rootCause = 'Global scope conflicts';
        else if (hypothesis5Results.hypothesis5) rootCause = 'Declaration order issues';
        
        console.log(`\n🎯 ROOT CAUSE IDENTIFIED: ${rootCause}`);
        
    } catch (error) {
        console.error('❌ SCRIPT ERROR:', error);
    } finally {
        await browser.close();
    }
}

debugPaymentSelectComprehensive().catch(console.error);
