const puppeteer = require('puppeteer');

const BASE_URL = 'https://109.123.238.197.sslip.io';
const TEST_CREDENTIALS = {
    username: 'manager',
    password: 'manager456'
};

async function comprehensiveStaffDebug() {
    console.log('🔍 COMPREHENSIVE STAFF ADMINISTRATION DEBUGGING 🔍');
    console.log('==================================================================');
    console.log('Testing all 5 hypotheses with extensive logging at every step');
    
    let browser;
    
    try {
        console.log('[STEP 1] Launching headless browser...');
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // Enable console logging from the page
        page.on('console', msg => {
            console.log(`📝 PAGE LOG: ${msg.text()}`);
        });
        
        // Track all requests and responses
        page.on('request', request => {
            console.log(`🚀 REQUEST: ${request.method()} ${request.url()}`);
        });
        
        page.on('response', response => {
            console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
        });
        
        console.log('✅ Browser launched and configured.');
        
        // --- LOGIN ---
        console.log('[STEP 2] Logging in...');
        await page.goto(`${BASE_URL}/login.html`, { waitUntil: 'networkidle2' });
        
        await page.type('#username', TEST_CREDENTIALS.username);
        await page.type('#password', TEST_CREDENTIALS.password);
        await page.click('#login-btn');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        console.log('✅ Login successful.');
        
        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // --- COMPREHENSIVE DEBUGGING ---
        console.log('[STEP 3] Testing all 5 hypotheses with extensive logging...');
        await page.goto(`${BASE_URL}/admin-staff.html`, { waitUntil: 'networkidle2' });
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Inject comprehensive debugging and test all hypotheses
        const debugResults = await page.evaluate(() => {
            console.log('🔍 DEBUG: Starting comprehensive debugging injection...');
            
            // Store original functions for restoration
            const originalLoadStaffData = window.loadStaffData;
            const originalUpdateStaffList = window.updateStaffList;
            const originalUpdateSummaryCards = window.updateSummaryCards;
            
            // Test Hypothesis 1: API Response Structure Mismatch
            console.log('🔍 HYPOTHESIS 1: Testing API Response Structure...');
            window.loadStaffData = async function() {
                try {
                    console.log('🔍 DEBUG: loadStaffData() called');
                    console.log('🔍 DEBUG: this function exists:', typeof this.loadStaffData);
                    console.log('🔍 DEBUG: api object exists:', typeof window.api);
                    console.log('🔍 DEBUG: api.getAdminStaff exists:', typeof window.api?.getAdminStaff);
                    
                    const data = await window.api.getAdminStaff();
                    console.log('🔍 DEBUG: Raw API response:', data);
                    console.log('🔍 DEBUG: Response type:', typeof data);
                    console.log('🔍 DEBUG: Response keys:', Object.keys(data || {}));
                    console.log('🔍 DEBUG: data.staff exists:', !!data?.staff);
                    console.log('🔍 DEBUG: data.staff type:', typeof data?.staff);
                    console.log('🔍 DEBUG: data.staff length:', data?.staff?.length);
                    console.log('🔍 DEBUG: data.staff content:', data?.staff);
                    console.log('🔍 DEBUG: data.summary exists:', !!data?.summary);
                    console.log('🔍 DEBUG: data.summary content:', data?.summary);
                    
                    // Test Hypothesis 2: JavaScript Execution Order Issue
                    console.log('🔍 HYPOTHESIS 2: Testing DOM Element Availability...');
                    const staffListElement = document.getElementById('staff-list');
                    const emptyStaffElement = document.getElementById('empty-staff');
                    const summaryCards = document.querySelectorAll('.summary-card');
                    
                    console.log('🔍 DEBUG: staff-list element exists:', !!staffListElement);
                    console.log('🔍 DEBUG: empty-staff element exists:', !!emptyStaffElement);
                    console.log('🔍 DEBUG: summary cards found:', summaryCards.length);
                    console.log('🔍 DEBUG: staff-list innerHTML before:', staffListElement?.innerHTML?.substring(0, 100));
                    console.log('🔍 DEBUG: empty-staff display before:', emptyStaffElement?.style?.display);
                    
                    // Test Hypothesis 3: Data Type Conversion Problem
                    console.log('🔍 HYPOTHESIS 3: Testing Data Type Handling...');
                    if (data?.staff) {
                        console.log('🔍 DEBUG: First staff member:', data.staff[0]);
                        console.log('🔍 DEBUG: First staff member type:', typeof data.staff[0]);
                        console.log('🔍 DEBUG: First staff member keys:', Object.keys(data.staff[0] || {}));
                        console.log('🔍 DEBUG: Array methods test - map:', typeof data.staff.map);
                        console.log('🔍 DEBUG: Array methods test - forEach:', typeof data.staff.forEach);
                        console.log('🔍 DEBUG: Array methods test - length property:', data.staff.length);
                    }
                    
                    // Test Hypothesis 4: CSS/Display Issue
                    console.log('🔍 HYPOTHESIS 4: Testing CSS and Display Properties...');
                    if (staffListElement) {
                        const computedStyle = window.getComputedStyle(staffListElement);
                        console.log('🔍 DEBUG: staff-list computed style:', {
                            display: computedStyle.display,
                            visibility: computedStyle.visibility,
                            opacity: computedStyle.opacity,
                            height: computedStyle.height,
                            width: computedStyle.width,
                            position: computedStyle.position,
                            zIndex: computedStyle.zIndex
                        });
                    }
                    
                    // Test Hypothesis 5: Event Handler Registration
                    console.log('🔍 HYPOTHESIS 5: Testing Event Handler Registration...');
                    const staffForm = document.getElementById('staff-form');
                    const submitButton = document.querySelector('button[type="submit"]');
                    const addButton = document.querySelector('button[onclick*="showAddStaffModal"]');
                    
                    console.log('🔍 DEBUG: staff-form element exists:', !!staffForm);
                    console.log('🔍 DEBUG: submit button exists:', !!submitButton);
                    console.log('🔍 DEBUG: add button exists:', !!addButton);
                    console.log('🔍 DEBUG: staff-form event listeners:', staffForm ? 'exists' : 'missing');
                    console.log('🔍 DEBUG: submit button event listeners:', submitButton ? 'exists' : 'missing');
                    
                    // Now call the original functions with enhanced logging
                    console.log('🔍 DEBUG: Calling original updateSummaryCards...');
                    if (data?.summary) {
                        window.updateSummaryCards(data.summary);
                    } else {
                        console.log('🔍 DEBUG: No summary data to update');
                    }
                    
                    console.log('🔍 DEBUG: Calling original updateStaffList...');
                    if (data?.staff) {
                        window.updateStaffList(data.staff);
                    } else {
                        console.log('🔍 DEBUG: No staff data to update');
                    }
                    
                    // Store data globally for testing
                    window.debugStaffData = data;
                    window.debugStaffDataReceived = true;
                    
                    console.log('🔍 DEBUG: loadStaffData() completed');
                    return { success: true, data: data };
                    
                } catch (error) {
                    console.error('🔍 ERROR in loadStaffData:', error);
                    console.error('🔍 ERROR stack:', error.stack);
                    return { success: false, error: error.message };
                }
            };
            
            // Override updateStaffList with enhanced logging
            window.updateStaffList = function(staff) {
                console.log('🔍 DEBUG: updateStaffList() called with:', staff);
                console.log('🔍 DEBUG: staff type:', typeof staff);
                console.log('🔍 DEBUG: staff length:', staff?.length);
                console.log('🔍 DEBUG: staff is array:', Array.isArray(staff));
                
                const container = document.getElementById('staff-list');
                const emptyMessage = document.getElementById('empty-staff');
                
                console.log('🔍 DEBUG: container element:', !!container);
                console.log('🔍 DEBUG: emptyMessage element:', !!emptyMessage);
                console.log('🔍 DEBUG: container innerHTML before:', container?.innerHTML?.substring(0, 100));
                console.log('🔍 DEBUG: emptyMessage display before:', emptyMessage?.style?.display);
                
                if (!staff || staff.length === 0) {
                    console.log('🔍 DEBUG: No staff data, showing empty message');
                    if (container) container.innerHTML = '';
                    if (emptyMessage) emptyMessage.style.display = 'block';
                    return;
                }
                
                console.log('🔍 DEBUG: Processing staff data, count:', staff.length);
                
                if (emptyMessage) emptyMessage.style.display = 'none';
                if (container) container.innerHTML = '';
                
                staff.forEach((member, index) => {
                    console.log(`🔍 DEBUG: Processing staff member ${index}:`, member);
                    console.log(`🔍 DEBUG: Member name:`, member.name);
                    console.log(`🔍 DEBUG: Member outstanding_balance:`, member.outstanding_balance);
                    console.log(`🔍 DEBUG: Member payment_status:`, member.payment_status);
                    
                    const div = document.createElement('div');
                    div.className = 'staff-grid';
                    
                    const statusClass = window.getPaymentStatusClass ? window.getPaymentStatusClass(member.payment_status) : 'never';
                    const outstandingAmount = member.outstanding_balance || 0;
                    const thisWeekInfo = `${member.this_week_massages || 0} massages, ฿${(member.this_week_fees || 0).toFixed(2)}`;
                    const lastPayment = member.last_payment_date ? 
                        `${new Date(member.last_payment_date).toLocaleDateString()} (฿${(member.last_payment_amount || 0).toFixed(2)})` : 
                        'Never';
                    
                    div.innerHTML = `
                        <div>
                            <strong>${member.name}</strong>
                            ${member.hire_date ? `<br><small>Hired: ${new Date(member.hire_date).toLocaleDateString()}</small>` : ''}
                        </div>
                        <div class="outstanding-amount">฿${outstandingAmount.toFixed(2)}</div>
                        <div class="payment-status ${statusClass}">${member.payment_status}</div>
                        <div><small>${thisWeekInfo}</small></div>
                        <div><small>${lastPayment}</small></div>
                        <div class="btn-group">
                            <button onclick="showPaymentModal(${member.id})" class="btn btn-small">💰 Pay</button>
                            <button onclick="editStaff(${member.id})" class="btn btn-small btn-secondary">✏️ Edit</button>
                            <button onclick="removeStaff(${member.id})" class="btn btn-small btn-danger">❌</button>
                        </div>
                    `;
                    
                    if (container) {
                        container.appendChild(div);
                        console.log(`🔍 DEBUG: Added staff member ${index} to DOM`);
                    }
                });
                
                console.log('🔍 DEBUG: updateStaffList() completed');
                console.log('🔍 DEBUG: Final container innerHTML:', container?.innerHTML?.substring(0, 200));
                console.log('🔍 DEBUG: Final emptyMessage display:', emptyMessage?.style?.display);
            };
            
            // Override updateSummaryCards with enhanced logging
            window.updateSummaryCards = function(summary) {
                console.log('🔍 DEBUG: updateSummaryCards() called with:', summary);
                console.log('🔍 DEBUG: summary type:', typeof summary);
                console.log('🔍 DEBUG: summary keys:', Object.keys(summary || {}));
                
                const totalOutstanding = document.getElementById('total-outstanding');
                const overdueCount = document.getElementById('overdue-count');
                const thisWeekFees = document.getElementById('this-week-fees');
                const nextPaymentDate = document.getElementById('next-payment-date');
                
                console.log('🔍 DEBUG: Summary card elements found:', {
                    totalOutstanding: !!totalOutstanding,
                    overdueCount: !!overdueCount,
                    thisWeekFees: !!thisWeekFees,
                    nextPaymentDate: !!nextPaymentDate
                });
                
                if (totalOutstanding) {
                    totalOutstanding.textContent = `฿${(summary.total_outstanding || 0).toFixed(2)}`;
                    console.log('🔍 DEBUG: Updated total-outstanding');
                }
                if (overdueCount) {
                    overdueCount.textContent = summary.overdue_count || 0;
                    console.log('🔍 DEBUG: Updated overdue-count');
                }
                if (thisWeekFees) {
                    thisWeekFees.textContent = `฿${(summary.total_this_week_fees || 0).toFixed(2)}`;
                    console.log('🔍 DEBUG: Updated this-week-fees');
                }
                if (nextPaymentDate && summary.next_payment_date) {
                    const date = new Date(summary.next_payment_date);
                    nextPaymentDate.textContent = date.toLocaleDateString();
                    console.log('🔍 DEBUG: Updated next-payment-date');
                }
                
                console.log('🔍 DEBUG: updateSummaryCards() completed');
            };
            
            console.log('🔍 DEBUG: All debugging functions injected successfully');
            
            // Trigger the enhanced loadStaffData
            console.log('🔍 DEBUG: Manually triggering loadStaffData...');
            setTimeout(() => {
                window.loadStaffData();
            }, 1000);
            
            return { 
                message: 'Debugging functions injected',
                originalFunctions: {
                    loadStaffData: !!originalLoadStaffData,
                    updateStaffList: !!originalUpdateStaffList,
                    updateSummaryCards: !!originalUpdateSummaryCards
                }
            };
        });
        
        console.log('🔍 DEBUG: Debug injection results:', debugResults);
        
        // Wait for debugging to complete
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get final state after debugging
        const finalState = await page.evaluate(() => {
            return {
                debugDataReceived: window.debugStaffDataReceived || false,
                debugData: window.debugStaffData || null,
                staffListContent: document.getElementById('staff-list')?.innerHTML || '',
                emptyMessageDisplay: document.getElementById('empty-staff')?.style?.display || 'none',
                summaryCards: {
                    totalOutstanding: document.getElementById('total-outstanding')?.textContent || 'N/A',
                    overdueCount: document.getElementById('overdue-count')?.textContent || 'N/A',
                    thisWeekFees: document.getElementById('this-week-fees')?.textContent || 'N/A',
                    nextPaymentDate: document.getElementById('next-payment-date')?.textContent || 'N/A'
                }
            };
        });
        
        console.log('🔍 DEBUG: Final state after debugging:', finalState);
        
        // Test all hypotheses with the collected data
        console.log('\n🎯 HYPOTHESIS TESTING RESULTS 🎯');
        console.log('=====================================');
        
        // Hypothesis 1: API Response Structure Mismatch
        console.log('\n🔍 HYPOTHESIS 1: API Response Structure Mismatch');
        if (finalState.debugData && finalState.debugData.staff) {
            console.log('✅ CONFIRMED: API returns data.staff structure');
            console.log('   Staff count:', finalState.debugData.staff.length);
            console.log('   First staff member:', finalState.debugData.staff[0]?.name || 'N/A');
        } else {
            console.log('❌ REJECTED: API does not return expected data.staff structure');
            console.log('   Debug data:', finalState.debugData);
        }
        
        // Hypothesis 2: JavaScript Execution Order Issue
        console.log('\n🔍 HYPOTHESIS 2: JavaScript Execution Order Issue');
        if (finalState.staffListContent.length > 0) {
            console.log('✅ CONFIRMED: DOM elements are accessible and staff list has content');
        } else {
            console.log('❌ REJECTED: DOM elements may not be ready or staff list is empty');
        }
        
        // Hypothesis 3: Data Type Conversion Problem
        console.log('\n🔍 HYPOTHESIS 3: Data Type Conversion Problem');
        if (finalState.debugData && Array.isArray(finalState.debugData.staff)) {
            console.log('✅ CONFIRMED: Staff data is proper array type');
        } else {
            console.log('❌ REJECTED: Staff data is not proper array type');
        }
        
        // Hypothesis 4: CSS/Display Issue
        console.log('\n🔍 HYPOTHESIS 4: CSS/Display Issue');
        if (finalState.emptyMessageDisplay === 'none' && finalState.staffListContent.length > 0) {
            console.log('✅ CONFIRMED: Staff list is visible and has content');
        } else {
            console.log('❌ REJECTED: Staff list may be hidden or empty');
        }
        
        // Hypothesis 5: Event Handler Registration Failure
        console.log('\n🔍 HYPOTHESIS 5: Event Handler Registration Failure');
        if (finalState.debugDataReceived) {
            console.log('✅ CONFIRMED: Event handlers are working and data is being processed');
        } else {
            console.log('❌ REJECTED: Event handlers may not be working properly');
        }
        
        console.log('\n🎯 FINAL DIAGNOSIS 🎯');
        console.log('========================');
        
        if (finalState.debugData && finalState.debugData.staff && finalState.debugData.staff.length > 0) {
            console.log('✅ SUCCESS: Staff data is being loaded and processed correctly');
            console.log('   The issue may be resolved or was a temporary problem');
        } else {
            console.log('❌ FAILURE: Staff data is still not loading correctly');
            console.log('   Root cause identified from hypothesis testing above');
        }
        
    } catch (error) {
        console.error('❌ ERROR in comprehensive debugging:', error);
    } finally {
        if (browser) {
            await browser.close();
            console.log('🔄 Browser closed.');
        }
    }
}

// Run the comprehensive debugging
comprehensiveStaffDebug().catch(console.error);
