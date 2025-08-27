const puppeteer = require('puppeteer');

async function debugTryCatchComprehensive() {
  console.log('🔍 COMPREHENSIVE TRY-CATCH SYNTAX DEBUGGING');
  console.log('============================================');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  try {
    // Enable console logging for ALL messages
    page.on('console', (msg) => {
      console.log(`📝 CONSOLE: ${msg.text()}`);
    });

    // Enable page error logging
    page.on('pageerror', (error) => {
      console.log(`❌ PAGE ERROR: ${error.message}`);
    });

    // Enable request failed logging
    page.on('requestfailed', (request) => {
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

      // HYPOTHESIS 1: Try block without catch/finally
      console.log('🔍 HYPOTHESIS 1: Checking for try blocks without catch/finally...');
      try {
        // Get all script tags
        const scripts = document.querySelectorAll('script');
        console.log('🔍 HYPOTHESIS 1a: Total script tags found:', scripts.length);

        const tryBlocks = [];
        const catchBlocks = [];
        const finallyBlocks = [];
        const incompleteTryBlocks = [];

        scripts.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          console.log(`🔍 HYPOTHESIS 1b: Script ${index} content length:`, content.length);

          // Count try, catch, finally blocks
          const tryMatches = content.match(/try\s*\{/g);
          const catchMatches = content.match(/catch\s*\(/g);
          const finallyMatches = content.match(/finally\s*\{/g);

          if (tryMatches) {
            tryBlocks.push({ script: index, count: tryMatches.length, content });
            console.log(`🔍 HYPOTHESIS 1c: Script ${index} has ${tryMatches.length} try blocks`);
          }
          if (catchMatches) {
            catchBlocks.push({ script: index, count: catchMatches.length });
            console.log(`🔍 HYPOTHESIS 1d: Script ${index} has ${catchMatches.length} catch blocks`);
          }
          if (finallyMatches) {
            finallyBlocks.push({ script: index, count: finallyMatches.length });
            console.log(`🔍 HYPOTHESIS 1e: Script ${index} has ${finallyMatches.length} finally blocks`);
          }
        });

        console.log('🔍 HYPOTHESIS 1f: Total try blocks found:', tryBlocks.length);
        console.log('🔍 HYPOTHESIS 1g: Total catch blocks found:', catchBlocks.length);
        console.log('🔍 HYPOTHESIS 1h: Total finally blocks found:', finallyBlocks.length);

        // Check for mismatched try-catch
        const totalTry = tryBlocks.reduce((sum, block) => sum + block.count, 0);
        const totalCatch = catchBlocks.reduce((sum, block) => sum + block.count, 0);
        const totalFinally = finallyBlocks.reduce((sum, block) => sum + block.count, 0);

        console.log('🔍 HYPOTHESIS 1i: Total try count:', totalTry);
        console.log('🔍 HYPOTHESIS 1j: Total catch count:', totalCatch);
        console.log('🔍 HYPOTHESIS 1k: Total finally count:', totalFinally);

        const hypothesis1Result = totalTry > (totalCatch + totalFinally);
        console.log('🔍 HYPOTHESIS 1l: Try blocks without catch/finally found:', hypothesis1Result);

        return {
          hypothesis1: hypothesis1Result,
          counts: { try: totalTry, catch: totalCatch, finally: totalFinally },
          tryBlocks
        };
      } catch (error) {
        console.log('❌ HYPOTHESIS 1 ERROR:', error.message);
        return { hypothesis1: false, error: error.message };
      }
    });

    console.log('\n[STEP 5] HYPOTHESIS 2: Checking for unclosed try blocks...');
    const hypothesis2Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 2: Checking for unclosed try blocks...');

      try {
        const scripts = document.querySelectorAll('script');
        const unclosedTryBlocks = [];

        scripts.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          const lines = content.split('\n');

          let braceCount = 0;
          let inTryBlock = false;
          let tryStartLine = 0;

          lines.forEach((line, lineNum) => {
            if (line.includes('try')) {
              inTryBlock = true;
              tryStartLine = lineNum + 1;
              console.log(`🔍 HYPOTHESIS 2a: Try block started at line ${lineNum + 1}: "${line.trim()}"`);
            }

            if (inTryBlock) {
              // Count braces
              const openBraces = (line.match(/\{/g) || []).length;
              const closeBraces = (line.match(/\}/g) || []).length;
              braceCount += openBraces - closeBraces;

              console.log(`🔍 HYPOTHESIS 2b: Line ${lineNum + 1}, brace count: ${braceCount}, line: "${line.trim()}"`);

              if (braceCount === 0 && inTryBlock) {
                inTryBlock = false;
                console.log(`🔍 HYPOTHESIS 2c: Try block ended at line ${lineNum + 1}`);
              }
            }
          });

          if (inTryBlock) {
            unclosedTryBlocks.push({
              script: index,
              startLine: tryStartLine,
              braceCount
            });
            console.log(`🔍 HYPOTHESIS 2d: Script ${index} has unclosed try block starting at line ${tryStartLine}`);
          }
        });

        console.log('🔍 HYPOTHESIS 2e: Unclosed try blocks found:', unclosedTryBlocks);

        const hypothesis2Result = unclosedTryBlocks.length > 0;
        console.log('🔍 HYPOTHESIS 2f: Unclosed try blocks found:', hypothesis2Result);

        return { hypothesis2: hypothesis2Result, unclosedBlocks: unclosedTryBlocks };
      } catch (error) {
        console.log('❌ HYPOTHESIS 2 ERROR:', error.message);
        return { hypothesis2: false, error: error.message };
      }
    });

    console.log('\n[STEP 6] HYPOTHESIS 3: Checking for function-level try block issues...');
    const hypothesis3Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 3: Checking for function-level try block issues...');

      try {
        const scripts = document.querySelectorAll('script');
        const functionTryIssues = [];

        scripts.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          const lines = content.split('\n');

          let functionDepth = 0;
          let tryBlockDepth = 0;
          let currentFunction = null;

          lines.forEach((line, lineNum) => {
            const trimmed = line.trim();

            // Track function depth
            if (trimmed.includes('function') || trimmed.includes('=>')) {
              functionDepth++;
              currentFunction = trimmed.substring(0, 50);
              console.log(`🔍 HYPOTHESIS 3a: Function started at line ${lineNum + 1}: "${currentFunction}"`);
            }

            if (trimmed.includes('try')) {
              tryBlockDepth++;
              console.log(`🔍 HYPOTHESIS 3b: Try block started at line ${lineNum + 1} in function depth ${functionDepth}: "${trimmed}"`);
            }

            if (trimmed.includes('catch') || trimmed.includes('finally')) {
              tryBlockDepth--;
              console.log(`🔍 HYPOTHESIS 3c: Try block ended at line ${lineNum + 1} in function depth ${functionDepth}: "${trimmed}"`);
            }

            if (trimmed.includes('}')) {
              functionDepth--;
              if (functionDepth < 0) functionDepth = 0;
              console.log(`🔍 HYPOTHESIS 3d: Function ended at line ${lineNum + 1}, depth now: ${functionDepth}`);
            }

            // Check for mismatched try-catch in functions
            if (tryBlockDepth > 0 && functionDepth === 0) {
              functionTryIssues.push({
                script: index,
                line: lineNum + 1,
                issue: 'Try block outside function scope',
                content: trimmed
              });
              console.log(`🔍 HYPOTHESIS 3e: Try block outside function at line ${lineNum + 1}: "${trimmed}"`);
            }
          });
        });

        console.log('🔍 HYPOTHESIS 3f: Function-level try issues found:', functionTryIssues);

        const hypothesis3Result = functionTryIssues.length > 0;
        console.log('🔍 HYPOTHESIS 3g: Function-level try issues found:', hypothesis3Result);

        return { hypothesis3: hypothesis3Result, issues: functionTryIssues };
      } catch (error) {
        console.log('❌ HYPOTHESIS 3 ERROR:', error.message);
        return { hypothesis3: false, error: error.message };
      }
    });

    console.log('\n[STEP 7] HYPOTHESIS 4: Checking for corrupted try blocks...');
    const hypothesis4Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 4: Checking for corrupted try blocks...');

      try {
        const scripts = document.querySelectorAll('script');
        const corruptedTryBlocks = [];

        scripts.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          const lines = content.split('\n');

          lines.forEach((line, lineNum) => {
            const trimmed = line.trim();

            // Check for malformed try statements
            if (trimmed.includes('try') && !trimmed.includes('try {') && !trimmed.includes('try(')) {
              corruptedTryBlocks.push({
                script: index,
                line: lineNum + 1,
                content: trimmed,
                issue: 'Malformed try statement'
              });
              console.log(`🔍 HYPOTHESIS 4a: Malformed try at line ${lineNum + 1}: "${trimmed}"`);
            }

            // Check for try without opening brace
            if (trimmed.includes('try') && !trimmed.includes('{')) {
              const nextLine = lines[lineNum + 1];
              if (nextLine && !nextLine.trim().startsWith('{')) {
                corruptedTryBlocks.push({
                  script: index,
                  line: lineNum + 1,
                  content: trimmed,
                  nextLine: nextLine.trim(),
                  issue: 'Try without opening brace'
                });
                console.log(`🔍 HYPOTHESIS 4b: Try without brace at line ${lineNum + 1}: "${trimmed}" -> "${nextLine.trim()}"`);
              }
            }
          });
        });

        console.log('🔍 HYPOTHESIS 4c: Corrupted try blocks found:', corruptedTryBlocks);

        const hypothesis4Result = corruptedTryBlocks.length > 0;
        console.log('🔍 HYPOTHESIS 4d: Corrupted try blocks found:', hypothesis4Result);

        return { hypothesis4: hypothesis4Result, corrupted: corruptedTryBlocks };
      } catch (error) {
        console.log('❌ HYPOTHESIS 4 ERROR:', error.message);
        return { hypothesis4: false, error: error.message };
      }
    });

    console.log('\n[STEP 8] HYPOTHESIS 5: Checking for cascading syntax errors...');
    const hypothesis5Results = await page.evaluate(() => {
      console.log('🔍 HYPOTHESIS 5: Checking for cascading syntax errors...');

      try {
        const scripts = document.querySelectorAll('script');
        const syntaxErrors = [];

        scripts.forEach((script, index) => {
          const content = script.textContent || script.innerHTML;
          const lines = content.split('\n');

          let braceCount = 0;
          let parenCount = 0;
          let bracketCount = 0;

          lines.forEach((line, lineNum) => {
            const trimmed = line.trim();

            // Count brackets
            const openBraces = (trimmed.match(/\{/g) || []).length;
            const closeBraces = (trimmed.match(/\}/g) || []).length;
            const openParens = (trimmed.match(/\(/g) || []).length;
            const closeParens = (trimmed.match(/\)/g) || []).length;
            const openBrackets = (trimmed.match(/\[/g) || []).length;
            const closeBrackets = (trimmed.match(/\]/g) || []).length;

            braceCount += openBraces - closeBraces;
            parenCount += openParens - closeParens;
            bracketCount += openBrackets - closeBrackets;

            if (Math.abs(braceCount) > 5 || Math.abs(parenCount) > 5 || Math.abs(bracketCount) > 5) {
              syntaxErrors.push({
                script: index,
                line: lineNum + 1,
                content: trimmed,
                braceCount,
                parenCount,
                bracketCount,
                issue: 'Unbalanced brackets'
              });
              console.log(`🔍 HYPOTHESIS 5a: Unbalanced brackets at line ${lineNum + 1}: "${trimmed}"`);
              console.log(`🔍 HYPOTHESIS 5b: Counts - braces: ${braceCount}, parens: ${parenCount}, brackets: ${bracketCount}`);
            }
          });
        });

        console.log('🔍 HYPOTHESIS 5c: Syntax errors found:', syntaxErrors);

        const hypothesis5Result = syntaxErrors.length > 0;
        console.log('🔍 HYPOTHESIS 5d: Syntax errors found:', hypothesis5Result);

        return { hypothesis5: hypothesis5Result, errors: syntaxErrors };
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

        functionNames.forEach((name) => {
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

        // Try to parse the script content for syntax errors
        console.log('🔍 FINAL TEST 4: Testing script parsing...');
        const scripts = document.querySelectorAll('script');
        const parseErrors = [];

        scripts.forEach((script, index) => {
          try {
            const content = script.textContent || script.innerHTML;
            if (content.length > 0) {
              // Try to create a function from the content
              new Function(content);
              console.log(`🔍 FINAL TEST 4a: Script ${index} parses successfully`);
            }
          } catch (parseError) {
            parseErrors.push({
              script: index,
              error: parseError.message
            });
            console.log(`🔍 FINAL TEST 4b: Script ${index} parse error:`, parseError.message);
          }
        });

        console.log('🔍 FINAL TEST 4c: Parse errors found:', parseErrors);

        return {
          basicJS: true,
          domAccess: { startTime: !!startTimeElement, endTime: !!endTimeElement },
          functions: functionStatus,
          parseErrors
        };
      } catch (error) {
        console.log('❌ FINAL TEST ERROR:', error.message);
        return { basicJS: false, error: error.message };
      }
    });

    // Compile all results
    console.log('\n📋 COMPREHENSIVE TEST RESULTS:');
    console.log('=====================================');
    console.log('HYPOTHESIS 1 (Try without catch/finally):', results.hypothesis1);
    console.log('HYPOTHESIS 2 (Unclosed try blocks):', hypothesis2Results.hypothesis2);
    console.log('HYPOTHESIS 3 (Function-level try issues):', hypothesis3Results.hypothesis3);
    console.log('HYPOTHESIS 4 (Corrupted try blocks):', hypothesis4Results.hypothesis4);
    console.log('HYPOTHESIS 5 (Cascading syntax errors):', hypothesis5Results.hypothesis5);
    console.log('FINAL TEST (Basic functionality):', finalResults.basicJS);

    if (results.counts) {
      console.log('\n📊 TRY-CATCH COUNTS:');
      console.log('try blocks:', results.counts.try);
      console.log('catch blocks:', results.counts.catch);
      console.log('finally blocks:', results.counts.finally);
    }

    // Determine the root cause
    let rootCause = 'Unknown';
    if (results.hypothesis1) rootCause = 'Try blocks without catch/finally';
    else if (hypothesis2Results.hypothesis2) rootCause = 'Unclosed try blocks';
    else if (hypothesis3Results.hypothesis3) rootCause = 'Function-level try issues';
    else if (hypothesis4Results.hypothesis4) rootCause = 'Corrupted try blocks';
    else if (hypothesis5Results.hypothesis5) rootCause = 'Cascading syntax errors';

    console.log(`\n🎯 ROOT CAUSE IDENTIFIED: ${rootCause}`);
  } catch (error) {
    console.error('❌ SCRIPT ERROR:', error);
  } finally {
    await browser.close();
  }
}

debugTryCatchComprehensive().catch(console.error);
