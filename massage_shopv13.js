// Copyright 2025. For internal deployment.
// v8.1 - Fixes a "Range not found" error in Data Validation setup by adding safeguards for range calculation.

// --- CONFIGURATION ---
const CONFIG = {
    sheets: { 
      dailyEntry: "Daily Entry", 
      masterLog: "Master Log", 
      reports: "Reports", 
      settings: "Settings", 
      dailySummary: "Daily Summary",
      historicalData: "Historical Data",
      archiveLog: "Archive Log"
    },
    managementEmail: Session.getEffectiveUser().getEmail(),
    rosterSize: 20,
    buttons: { submit: 'G13', load: 'G20', next: 'E1', endDay: 'G25' }
  };
  
  const THEME = {
    headerBackground: "#4a86e8", headerFontColor: "#ffffff", headerFontSize: 12, headerFontWeight: "bold",
    subHeaderBackground: "#f3f3f3", buttonBackground: "#34a853", correctionModeBackground: "#fff2cc"
  };
  
  // =================================================================
  // ===           PRIMARY TRIGGERS & UI                           ===
  // =================================================================
  function onOpen(e) {
    if (e && e.authMode == ScriptApp.AuthMode.NONE) { return; }
    SpreadsheetApp.getUi().createMenu('SHOP ACTIONS')
        .addItem('ADMIN: Build/Reset Template', 'createBookkeepingTemplate')
        .addToUi();
  }
  
  function onEdit(e) {
    console.log("=== ONEDIT FUNCTION START ===");
    
    // Wrap entire function in try-catch to prevent trigger failures
    try {
      console.log("1. Entering try block");
      
      const range = e.range;
      console.log("2. Got range:", range);
      
      const sheet = range.getSheet();
      console.log("3. Got sheet:", sheet);
      
      const sheetName = sheet.getName();
      console.log("4. Sheet name:", sheetName);
      
      // Early return if not the right sheet
      if (sheetName !== CONFIG.sheets.dailyEntry) { 
        console.log("5. Wrong sheet, returning early");
        return; 
      }
      
      console.log("5. Correct sheet, continuing");
      
      // Debug: Log the edit event
      const a1Notation = range.getA1Notation();
      const value = e.value;
      console.log("6. onEdit triggered:", a1Notation, "value:", value);
      
      // Handle checkbox clicks with individual try-catch blocks
      if (value === "TRUE") {
        console.log("7. Checkbox clicked - value is TRUE");
        const cell = a1Notation;
        console.log("8. Checkbox cell:", cell);
        
        // Reset checkbox immediately to prevent it from staying checked
        console.log("9. About to reset checkbox");
        try {
          range.setValue(false);
          console.log("10. ✅ Checkbox reset successful");
        } catch (resetError) {
          console.log("10. ❌ Failed to reset checkbox:", resetError);
        }
        
        // Handle each button type separately to isolate failures
        console.log("11. Checking which button was clicked");
        
        if (cell === CONFIG.buttons.submit) { 
          console.log("12. Submit button clicked");
          try {
            console.log("13. About to call submitTransaction");
            submitTransaction(); 
            console.log("14. ✅ submitTransaction completed");
          } catch (submitError) {
            console.log("14. ❌ Submit transaction error:", submitError);
          }
        } 
        else if (cell === CONFIG.buttons.load) { 
          console.log("12. Load button clicked");
          try {
            console.log("13. About to call loadTransactionForCorrection");
            loadTransactionForCorrection(); 
            console.log("14. ✅ loadTransactionForCorrection completed");
          } catch (loadError) {
            console.log("14. ❌ Load transaction error:", loadError);
          }
        }
        else if (cell === CONFIG.buttons.next) { 
          console.log("12. Next button clicked");
          try {
            console.log("13. About to call serveNextCustomer");
            serveNextCustomer(); 
            console.log("14. ✅ serveNextCustomer completed");
          } catch (nextError) {
            console.log("14. ❌ Serve next customer error:", nextError);
          }
        }
        else if (cell === CONFIG.buttons.endDay) { 
          console.log("12. End day button clicked");
          try {
            console.log("13. About to call endDay");
            endDay(); 
            console.log("14. ✅ endDay completed");
          } catch (endDayError) {
            console.log("14. ❌ End day error:", endDayError);
          }
        }
        else {
          console.log("12. Unknown checkbox clicked:", cell);
        }
      } else {
        console.log("7. Not a checkbox click - value is:", value);
      }
      
      // Handle time dropdown population when F6 (Payment Method) changes
      console.log("15. Checking if F6 changed");
      if (a1Notation === "F6" && value) {
        console.log("16. Payment method changed, populating time dropdowns");
        try {
          console.log("17. About to call populateTimeDropdowns");
          populateTimeDropdowns(sheet);
          console.log("18. ✅ populateTimeDropdowns completed");
        } catch (timeError) {
          console.log("18. ❌ Time dropdown population error:", timeError);
        }
      } else {
        console.log("16. Not F6 change");
      }
      
      // Handle customer contact field changes (F9) - just log, don't process
      console.log("19. Checking if F9 changed");
      if (a1Notation === "F9") {
        console.log("20. Customer contact field changed:", value);
        console.log("21. Doing nothing with customer contact - just logging");
      } else {
        console.log("20. Not F9 change");
      }
      
      console.log("22. ✅ onEdit function completed successfully");
      
    } catch (onEditError) {
      console.log("❌ onEdit function error:", onEditError);
      console.log("Error details:", onEditError.message);
      console.log("Error stack:", onEditError.stack);
      // Don't let the error propagate - this prevents the trigger from failing
    }
    
    console.log("=== ONEDIT FUNCTION END ===");
  }
  
  function createBookkeepingTemplate() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSettingsSheet(ss);
    setupMasterLogSheet(ss);
    setupReportsSheet(ss);
    setupDailySummarySheet(ss);
    setupDailyEntrySheet(ss);
    setupHistoricalDataSheet(ss);
    setupArchiveLogSheet(ss);
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet) { ss.deleteSheet(defaultSheet); }
    try { SpreadsheetApp.getUi().toast('Template build complete.', 'Success', 5); } catch (e) { console.log('Build complete.'); }
  }
  
  // =================================================================
  // ===            CORE TRANSACTION & CORRECTION LOGIC            ===
  // =================================================================

function serveNextCustomer() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.sheets.dailyEntry);
  const rosterRange = sheet.getRange(3, 2, CONFIG.rosterSize, 2);
  const rosterData = rosterRange.getValues();
  let nextMasseuseIndex = -1, currentServingIndex = -1;

  for (let i = 0; i < rosterData.length; i++) {
    if ((rosterData[i][1] === 'Available' || rosterData[i][1] === 'Next') && nextMasseuseIndex === -1) { 
      nextMasseuseIndex = i; 
    }
    if (rosterData[i][1] === 'Busy') { 
      currentServingIndex = i; 
    }
  }

  if (nextMasseuseIndex !== -1) {
    if (currentServingIndex !== -1) { 
      sheet.getRange(3 + currentServingIndex, 3).setValue('Break'); 
    }
    const nextMasseuseName = rosterData[nextMasseuseIndex][0];
    sheet.getRange(3 + nextMasseuseIndex, 3).setValue('Busy');
    sheet.getRange("F4").setValue(nextMasseuseName);
  } else {
    SpreadsheetApp.getUi().alert("No masseuse is 'Available' or 'Next' in the roster.");
  }
}

function endDay() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert('End Day', 'Are you sure you want to end the day? This will archive today\'s data and reset the sheet for tomorrow.', ui.ButtonSet.YES_NO);
  
  if (response === ui.Button.YES) {
    try {
      // Archive today's data to Daily Summary
      archiveDailyData();
      
      // Archive old Master Log data to Archive Log (keep only current month)
      archiveOldMasterLogData();
      
      // Reset the Daily Entry sheet for tomorrow
      resetDailyEntrySheet();
      
      // Show success message
      ui.alert('Day ended successfully. Data archived and sheet reset for tomorrow.');
    } catch (error) {
      ui.alert('Error ending day: ' + error.message);
    }
  }
}

function archiveDailyData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailySummarySheet = ss.getSheetByName(CONFIG.sheets.dailySummary);
  const masterLogSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
  
  // Get today's transactions
  const today = new Date();
  const todayStr = Utilities.formatDate(today, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
  
  // Calculate daily totals
  const dailyData = calculateDailyTotals(todayStr);
  
  // Add to Daily Summary (only basic totals, breakdowns calculated by formulas)
  dailySummarySheet.appendRow([
    todayStr,
    dailyData.totalRevenue,
    dailyData.totalFees,
    dailyData.totalTransactions
  ]);
}

function calculateDailyTotals(dateStr) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterLogSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
  
  // Get all transactions for the date
  const allData = masterLogSheet.getDataRange().getValues();
  const headers = allData.shift();
  
  const dateCol = headers.indexOf("Date");
  const revenueCol = headers.indexOf("Payment Amount");
  const feesCol = headers.indexOf("Masseuse Fee");
  const statusCol = headers.indexOf("Status");
  
  let totalRevenue = 0;
  let totalFees = 0;
  let totalTransactions = 0;
  
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const rowDate = Utilities.formatDate(row[dateCol], ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
    
    if (rowDate === dateStr && row[statusCol] === "ACTIVE") {
      const revenue = row[revenueCol] || 0;
      const fees = row[feesCol] || 0;
      
      totalRevenue += revenue;
      totalFees += fees;
      totalTransactions++;
    }
  }
  
  return {
    totalRevenue,
    totalFees,
    totalTransactions
  };
}

function archiveOldMasterLogData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterLogSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
  const archiveLogSheet = ss.getSheetByName(CONFIG.sheets.archiveLog);
  
  // Get current month start date
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  
  // Get all Master Log data
  const allData = masterLogSheet.getDataRange().getValues();
  const headers = allData.shift();
  
  const dateCol = headers.indexOf("Date");
  const statusCol = headers.indexOf("Status");
  
  let rowsToArchive = [];
  let rowsToKeep = [];
  
  // Separate data: archive old data, keep current month
  for (let i = 0; i < allData.length; i++) {
    const row = allData[i];
    const rowDate = new Date(row[dateCol]);
    
    // Archive data older than current month
    if (rowDate < currentMonthStart) {
      rowsToArchive.push(row);
    } else {
      rowsToKeep.push(row);
    }
  }
  
  // Move old data to Archive Log
  if (rowsToArchive.length > 0) {
    // Get current archive data to append to
    const archiveLastRow = archiveLogSheet.getLastRow();
    const startRow = archiveLastRow > 0 ? archiveLastRow + 1 : 2; // Start after header if exists
    
    // Append old data to Archive Log
    if (startRow === 2) {
      // First time archiving - add headers
      archiveLogSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      archiveLogSheet.getRange(2, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
    } else {
      // Append to existing archive
      archiveLogSheet.getRange(startRow, 1, rowsToArchive.length, headers.length).setValues(rowsToArchive);
    }
  }
  
  // Clear Master Log and restore with current month data only
  masterLogSheet.clear();
  masterLogSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  if (rowsToKeep.length > 0) {
    masterLogSheet.getRange(2, 1, rowsToKeep.length, headers.length).setValues(rowsToKeep);
  }
  
  // Restore Master Log formatting
  masterLogSheet.setColumnWidths(1, 12, 150);
  masterLogSheet.getRange("C:C").setNumberFormat("yyyy-mm-dd");
  masterLogSheet.getRange("I:J").setNumberFormat("h:mm am/pm");
  masterLogSheet.getRange("F:F").setNumberFormat("#,##0.00"); 
  masterLogSheet.getRange("H:H").setNumberFormat("#,##0.00");
}

function resetDailyEntrySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailyEntrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
  
  // Clear form fields
  dailyEntrySheet.getRange("F4:F9").clearContent();
  dailyEntrySheet.getRange("F18:F19").clearContent();
  
  // Reset roster statuses to "Available"
  dailyEntrySheet.getRange(3, 3, CONFIG.rosterSize, 1).setValue("Available");
  
  // Clear recent transactions log DATA ONLY (not the header) - exactly 3 rows of data (A29:I31)
  dailyEntrySheet.getRange("A29:I31").clearContent();
  
  // Clear today's quick summary section
  dailyEntrySheet.getRange("A33:B35").clearContent();
  dailyEntrySheet.getRange("A39").clearContent();
  
  // Restore the recent transactions log header styling
  dailyEntrySheet.getRange("A27:I27").setBackground(THEME.headerBackground).setFontColor(THEME.headerFontColor).setFontSize(THEME.headerFontSize).setFontWeight(THEME.headerFontWeight).setHorizontalAlignment("center");
  
  // Restore today's quick summary header styling
  dailyEntrySheet.getRange("A32:I32").setBackground(THEME.headerBackground).setFontColor(THEME.headerFontColor).setFontSize(THEME.headerFontSize).setFontWeight(THEME.headerFontWeight).setHorizontalAlignment("center");
  
  // Massage count column uses formulas - will automatically reset to 0 for new day
}

function loadTransactionForCorrection() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const entrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
    const logSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
    const ui = SpreadsheetApp.getUi();
    
    // Get the most recent ACTIVE transaction
    const logData = logSheet.getDataRange().getValues();
    const headers = logData.shift();
    const statusCol = headers.indexOf("Status");
    
    let mostRecentIndex = -1;
    for (let i = logData.length - 1; i >= 0; i--) {
      if (logData[i][statusCol] === "ACTIVE") {
        mostRecentIndex = i;
        break;
      }
    }
    
    if (mostRecentIndex === -1) { 
      ui.alert("No recent transactions found to correct."); 
      return; 
    }
    
    // Mark the most recent transaction as VOID
    const transactionId = logData[mostRecentIndex][headers.indexOf("Transaction ID")];
    logSheet.getRange(mostRecentIndex + 2, statusCol + 1).setValue("VOID");
    
    // Load the transaction data for correction
    const rowData = logData[mostRecentIndex];
    entrySheet.getRange("F4:F9").setValues([
      [rowData[headers.indexOf("Masseuse Name")]],[rowData[headers.indexOf("Service Type")]],[rowData[headers.indexOf("Payment Method")]],
      [rowData[headers.indexOf("Start Time")]],[rowData[headers.indexOf("End Time")]],[rowData[headers.indexOf("Customer Contact (Optional)")]]
    ]);
    
    entrySheet.getRange("E4:G11").setBackground(THEME.correctionModeBackground);
    entrySheet.getRange("F19").setValue(transactionId);
    ui.alert(`Most recent transaction (${transactionId}) is VOID and loaded for correction.`);
  }
  
  function submitTransaction() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const entrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
    const logSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
    const settingsSheet = ss.getSheetByName(CONFIG.sheets.settings);
    const ui = SpreadsheetApp.getUi();

    const entryData = entrySheet.getRange("F4:F9").getValues();
    const originalId = entrySheet.getRange("F19").getValue();
    const status = originalId ? `CORRECTED (Original: ${originalId})` : "ACTIVE";
    
    const [masseuse, service, paymentMethod, startTime, endTime] = 
          [entryData[0][0], entryData[1][0], entryData[2][0], entryData[3][0], entryData[4][0]];
    const customerContact = String(entryData[5][0] || "");

    // Debug: Log the values to see what's causing issues
    console.log("Submit values:", { masseuse, service, paymentMethod, startTime, endTime, customerContact });

    if (!masseuse || !service || !paymentMethod || !startTime || !endTime) { 
      ui.alert("Error", "Masseuse, Service, Payment, and Times are required."); 
      return; 
    }
    
    const settingsData = settingsSheet.getRange("A2:E" + settingsSheet.getLastRow()).getValues();
    let price = 0, fee = 0;
    for (let i = 0; i < settingsData.length; i++) { if (settingsData[i][1] === service) { price = settingsData[i][2]; fee = settingsData[i][3]; break; } }
    
    const timestamp = new Date();
    const tz = ss.getSpreadsheetTimeZone();
    const dateOnly = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    const transactionId = Utilities.formatDate(timestamp, tz, "yyyyMMddHHmmssS");
    
    // Enhanced customer contact handling with multiple fallbacks
    let safeCustomerContact = "";
    try {
      if (customerContact !== null && customerContact !== undefined && customerContact !== "") {
        // Convert to string and trim, with multiple safety checks
        const contactStr = String(customerContact);
        safeCustomerContact = contactStr.trim();
        
        // Additional validation - ensure it's not too long or contains problematic characters
        if (safeCustomerContact.length > 100) {
          safeCustomerContact = safeCustomerContact.substring(0, 100);
        }
      }
    } catch (contactError) {
      console.log("Customer contact processing error:", contactError);
      safeCustomerContact = ""; // Fallback to empty string
    }
    
    console.log("Processed customer contact:", safeCustomerContact);
    
    const newRow = [transactionId, timestamp, dateOnly, masseuse, service, price, paymentMethod, fee, startTime, endTime, safeCustomerContact, status];
    
    // Validate the entire row before attempting to append
    const hasInvalidValues = newRow.some((val, index) => {
      if (val === undefined || val === null) {
        console.log(`Invalid value at index ${index}:`, val);
        return true;
      }
      return false;
    });
    
    if (hasInvalidValues) {
      ui.alert("Error", "Invalid data detected. Please check your inputs and try again.");
      return;
    }
    
    // Test: Try to append row and catch any specific errors
    try {
      console.log("About to append row with customer contact:", safeCustomerContact);
      
      // Use a more robust append method
      const lastRow = logSheet.getLastRow();
      logSheet.getRange(lastRow + 1, 1, 1, newRow.length).setValues([newRow]);
      
      console.log("Row appended successfully");
    } catch (appendError) {
      console.log("Append row error:", appendError);
      ui.alert("Error", "Failed to log transaction. Please try again.");
      return;
    }
    
    entrySheet.getRange("F4:F9").clearContent();
    entrySheet.getRange("E4:G11").setBackground(null);
    entrySheet.getRange("F4:F9").setBackground(THEME.subHeaderBackground);
    entrySheet.getRange("F18:F19").clearContent();
    
    SpreadsheetApp.flush();
    entrySheet.getRange("F4").activate();
    ui.toast("Transaction logged successfully.");
  }
  
  // =================================================================
  // ===                 SHEET SETUP HELPERS                      ===
  // =================================================================
  function getAndClearSheet(ss, sheetName) {
      let sheet = ss.getSheetByName(sheetName);
      if (sheet) { 
          sheet.clear(); 
          // Clear all data validation rules to prevent conflicts
          // Use the entire sheet range to clear all validations
          const fullRange = sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns());
          fullRange.clearDataValidations();
      } else { 
          sheet = ss.insertSheet(sheetName); 
      }
      const protection = sheet.getProtections(SpreadsheetApp.ProtectionType.SHEET)[0];
      if (protection && protection.canEdit()) { protection.remove(); }
      return sheet;
  }
  
  function applyHeaderStyle(range) {
    // Clear any existing validation rules on header cells to prevent conflicts
    range.clearDataValidations();
    range.setBackground(THEME.headerBackground).setFontColor(THEME.headerFontColor).setFontSize(THEME.headerFontSize).setFontWeight(THEME.headerFontWeight).setHorizontalAlignment("center");
  }
  
  function setupSettingsSheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.settings);
    applyHeaderStyle(sheet.getRange("A1:E1").setValues([["Masseuse Names", "Service Types", "Service Prices", "Masseuse Fee", "Payment Methods"]]));
    sheet.getRange("A2:E5").setValues([["Anna", "Thai 60", 250, 100, "Cash"], ["Betty", "Neck and Shoulder", 150, 60, "Credit Card"], ["Carla", "Foot", 200, 80, "Voucher"], ["Diana", "Oil", 400, 150, "Cash"]]);
    sheet.getRange("C2:D5").setNumberFormat("#,##0");
    sheet.setColumnWidths(1, 5, 180).protect().addEditor(CONFIG.managementEmail);
  }
  
  function setupMasterLogSheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.masterLog);
    const headers = ["Transaction ID", "Timestamp", "Date", "Masseuse Name", "Service Type", "Payment Amount", "Payment Method", "Masseuse Fee", "Start Time", "End Time", "Customer Contact (Optional)", "Status"];
    applyHeaderStyle(sheet.getRange("A1:L1").setValues([headers]));
    sheet.setColumnWidths(1, 12, 150);
    sheet.getRange("C:C").setNumberFormat("yyyy-mm-dd");
    sheet.getRange("I:J").setNumberFormat("h:mm am/pm");
    sheet.getRange("F:F").setNumberFormat("#,##0.00"); sheet.getRange("H:H").setNumberFormat("#,##0.00");
    const protection = sheet.protect(); protection.addEditor(CONFIG.managementEmail); sheet.hideSheet();
  }
  
  function setupReportsSheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.reports);
    
    // Set column widths for better layout
    sheet.setColumnWidths(1, 6, 200);
    
    // Header
    sheet.getRange("A1").setValue("CURRENT PERIOD REPORTS").setFontWeight("bold").setFontSize(16);
    
    // SECTION 1: THIS WEEK'S MASSEUSE FEES (for Sunday payments)
    sheet.getRange("A3").setValue("THIS WEEK'S MASSEUSE FEES (Sunday Payment)").setFontWeight("bold").setFontSize(14);
    const weekStart = `=TODAY()-WEEKDAY(TODAY(),2)+1`; // Monday of current week
    const weekEnd = `=TODAY()-WEEKDAY(TODAY(),2)+7`;   // Sunday of current week
    const weeklyFeesFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT D, SUM(H), COUNT(H) WHERE (L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED') AND C >= DATE '"&TEXT(${weekStart},"yyyy-mm-dd")&"' AND C <= DATE '"&TEXT(${weekEnd},"yyyy-mm-dd")&"' GROUP BY D ORDER BY SUM(H) DESC LABEL D 'Masseuse', SUM(H) 'Weekly Fees', COUNT(H) 'Weekly Massages'", 1), "No data this week.")`;
    sheet.getRange("A4").setFormula(weeklyFeesFormula);
    
    // SECTION 2: THIS MONTH'S BREAKDOWN
    sheet.getRange("A10").setValue("THIS MONTH'S BREAKDOWN").setFontWeight("bold").setFontSize(14);
    const monthStart = `=EOMONTH(TODAY(),-1)+1`;
    const monthEnd = `=EOMONTH(TODAY(),0)`;
    const monthlyRevenueFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F) WHERE (L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED') AND C >= DATE '"&TEXT(${monthStart},"yyyy-mm-dd")&"' AND C <= DATE '"&TEXT(${monthEnd},"yyyy-mm-dd")&"' GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Type', SUM(F) 'Monthly Revenue', COUNT(F) 'Monthly Count'", 1), "No data this month.")`;
    sheet.getRange("A11").setFormula(monthlyRevenueFormula);
    
    // SECTION 3: LAST 7 DAYS BREAKDOWN
    sheet.getRange("A17").setValue("LAST 7 DAYS BREAKDOWN").setFontWeight("bold").setFontSize(14);
    const dailyBreakdownFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT C, SUM(F), COUNT(F) WHERE (L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED') AND C >= DATE '"&TEXT(TODAY()-6,"yyyy-mm-dd")&"' GROUP BY C ORDER BY C DESC LABEL C 'Date', SUM(F) 'Daily Revenue', COUNT(F) 'Daily Transactions'", 1), "No data in last 7 days.")`;
    sheet.getRange("A18").setFormula(dailyBreakdownFormula);
    
    // Format all number columns
    sheet.getRange("B:D").setNumberFormat("#,##0.00");
    sheet.getRange("C:C").setNumberFormat("#,##0");
    
    const protection = sheet.protect(); protection.addEditor(CONFIG.managementEmail); sheet.hideSheet();
  }
  
  function setupDailySummarySheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.dailySummary);
    
    // Headers
    const headers = ["Date", "Total Revenue", "Total Fees", "Total Transactions"];
    applyHeaderStyle(sheet.getRange("A1:D1").setValues([headers]));
    
    // Format columns
    sheet.getRange("A:A").setNumberFormat("yyyy-mm-dd");
    sheet.getRange("B:C").setNumberFormat("#,##0.00");
    sheet.getRange("D:D").setNumberFormat("#,##0");
    
    // Set column widths
    sheet.setColumnWidths(1, 4, 200);
    
    // Add today's summary section
    sheet.getRange("A3").setValue("TODAY'S SUMMARY").setFontWeight("bold").setFontSize(14);
    sheet.getRange("A4").setValue("Today's Revenue:").setFontWeight("bold");
    sheet.getRange("B4").setFormula(`=IFERROR(SUMIFS(B:B, A:A, TODAY()), 0)`).setNumberFormat("#,##0.00");
    sheet.getRange("A5").setValue("Today's Transactions:").setFontWeight("bold");
    sheet.getRange("B5").setFormula(`=IFERROR(COUNTIFS(A:A, TODAY()), 0)`);
    sheet.getRange("A6").setValue("Today's Total Fees:").setFontWeight("bold");
    sheet.getRange("B6").setFormula(`=IFERROR(SUMIFS(C:C, A:A, TODAY()), 0)`).setNumberFormat("#,##0.00");
    
    // Add monthly summary section
    sheet.getRange("A8").setValue("THIS MONTH'S SUMMARY").setFontWeight("bold").setFontSize(14);
    sheet.getRange("A9").setValue("Month Revenue:").setFontWeight("bold");
    sheet.getRange("B9").setFormula(`=IFERROR(SUMIFS(B:B, A:A, ">="&EOMONTH(TODAY(),-1)+1, A:A, "<="&EOMONTH(TODAY(),0)), 0)`).setNumberFormat("#,##0.00");
    sheet.getRange("A10").setValue("Month Transactions:").setFontWeight("bold");
    sheet.getRange("B10").setFormula(`=IFERROR(COUNTIFS(A:A, ">="&EOMONTH(TODAY(),-1)+1, A:A, "<="&EOMONTH(TODAY(),0)), 0)`);
    sheet.getRange("A11").setValue("Month Total Fees:").setFontWeight("bold");
    sheet.getRange("B11").setFormula(`=IFERROR(SUMIFS(C:C, A:A, ">="&EOMONTH(TODAY(),-1)+1, A:A, "<="&EOMONTH(TODAY(),0)), 0)`).setNumberFormat("#,##0.00");
    
    // Add payment type breakdown section
    sheet.getRange("A13").setValue("TODAY'S PAYMENT BREAKDOWN").setFontWeight("bold").setFontSize(14);
    sheet.getRange("A14").setValue("Payment Type:").setFontWeight("bold");
    sheet.getRange("B14").setValue("Revenue:").setFontWeight("bold");
    sheet.getRange("C14").setValue("Count:").setFontWeight("bold");
    
    // Dynamic payment breakdown for today
    const todayPaymentFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F) WHERE L CONTAINS 'ACTIVE' AND C = DATE '"&TEXT(TODAY(),"yyyy-mm-dd")&"' GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Type', SUM(F) 'Revenue', COUNT(F) 'Count'", 1), "No transactions today.")`;
    sheet.getRange("A15").setFormula(todayPaymentFormula);
    
    // Add masseuse fees breakdown section
    sheet.getRange("A20").setValue("TODAY'S MASSEUSE FEES").setFontWeight("bold").setFontSize(14);
    sheet.getRange("A21").setValue("Masseuse:").setFontWeight("bold");
    sheet.getRange("B21").setValue("Fees Owed:").setFontWeight("bold");
    sheet.getRange("C21").setValue("Massages:").setFontWeight("bold");
    
    // Dynamic masseuse fees for today
    const todayFeesFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT D, SUM(H), COUNT(H) WHERE L CONTAINS 'ACTIVE' AND C = DATE '"&TEXT(TODAY(),"yyyy-mm-dd")&"' GROUP BY D ORDER BY SUM(H) DESC LABEL D 'Masseuse', SUM(H) 'Fees Owed', COUNT(H) 'Massages'", 1), "No transactions today.")`;
    sheet.getRange("A22").setFormula(todayFeesFormula);
    
    const protection = sheet.protect(); protection.addEditor(CONFIG.managementEmail); sheet.hideSheet();
  }
  
  function setupHistoricalDataSheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.historicalData);
    
    // Set column widths for better layout
    sheet.setColumnWidths(1, 6, 200);
    
    // Header
    sheet.getRange("A1").setValue("HISTORICAL DATA & ANALYSIS").setFontWeight("bold").setFontSize(16);
    
    // SECTION 1: ALL-TIME MASSEUSE PERFORMANCE
    sheet.getRange("A3").setValue("ALL-TIME MASSEUSE PERFORMANCE").setFontWeight("bold").setFontSize(14);
    const allTimeMasseuseFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT D, SUM(F), SUM(H), COUNT(F) WHERE L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED' GROUP BY D ORDER BY SUM(F) DESC LABEL D 'Masseuse', SUM(F) 'Total Revenue', SUM(H) 'Total Fees', COUNT(F) 'Total Massages'", 1), "No data yet.")`;
    sheet.getRange("A4").setFormula(allTimeMasseuseFormula);
    
    // SECTION 2: ALL-TIME SERVICE TYPE PERFORMANCE
    sheet.getRange("A10").setValue("ALL-TIME SERVICE TYPE PERFORMANCE").setFontWeight("bold").setFontSize(14);
    const servicePerformanceFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT E, SUM(F), COUNT(F), AVG(F) WHERE (L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED') GROUP BY E ORDER BY SUM(F) DESC LABEL E 'Service Type', SUM(F) 'Total Revenue', COUNT(F) 'Total Count', AVG(F) 'Average Price'", 1), "No data yet.")`;
    sheet.getRange("A11").setFormula(servicePerformanceFormula);
    
    // SECTION 3: ANNUAL BREAKDOWNS
    sheet.getRange("A17").setValue("ANNUAL BREAKDOWNS").setFontWeight("bold").setFontSize(14);
    const annualBreakdownFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT YEAR(C), SUM(F), COUNT(F), AVG(F) WHERE (L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED') GROUP BY YEAR(C) ORDER BY YEAR(C) DESC LABEL YEAR(C) 'Year', SUM(F) 'Annual Revenue', COUNT(F) 'Annual Transactions', AVG(F) 'Average Transaction'", 1), "No data yet.")`;
    sheet.getRange("A18").setFormula(annualBreakdownFormula);
    
    // SECTION 4: PAYMENT METHOD HISTORICAL ANALYSIS
    sheet.getRange("A24").setValue("PAYMENT METHOD HISTORICAL ANALYSIS").setFontWeight("bold").setFontSize(14);
    const paymentAnalysisFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F), AVG(F) WHERE (L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED') GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Type', SUM(F) 'Total Revenue', COUNT(F) 'Total Count', AVG(F) 'Average Amount'", 1), "No data yet.")`;
    sheet.getRange("A25").setFormula(paymentAnalysisFormula);
    
    // Format all number columns
    sheet.getRange("B:D").setNumberFormat("#,##0.00");
    sheet.getRange("C:C").setNumberFormat("#,##0");
    
    const protection = sheet.protect(); protection.addEditor(CONFIG.managementEmail); sheet.hideSheet();
  }
  
  function setupArchiveLogSheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.archiveLog);
    
    // Same structure as Master Log but for archived data
    const headers = ["Transaction ID", "Timestamp", "Date", "Masseuse Name", "Service Type", "Payment Amount", "Payment Method", "Masseuse Fee", "Start Time", "End Time", "Customer Contact (Optional)", "Status"];
    applyHeaderStyle(sheet.getRange("A1:L1").setValues([headers]));
    
    // Set column widths and formatting
    sheet.setColumnWidths(1, 12, 150);
    sheet.getRange("C:C").setNumberFormat("yyyy-mm-dd");
    sheet.getRange("I:J").setNumberFormat("h:mm am/pm");
    sheet.getRange("F:F").setNumberFormat("#,##0.00"); 
    sheet.getRange("H:H").setNumberFormat("#,##0.00");
    
    // Add header description
    sheet.getRange("A3").setValue("ARCHIVED TRANSACTION DATA (Old Master Log entries)").setFontWeight("bold").setFontSize(12);
    sheet.getRange("A4").setValue("This sheet contains historical transaction data moved from Master Log during End Day operations.").setFontStyle("italic");
    
    const protection = sheet.protect(); protection.addEditor(CONFIG.managementEmail); sheet.hideSheet();
  }
  
  // =================================================================
  // ===                 SETTINGS SHEET HELPERS                   ===
  // =================================================================
  function setupTimeDropdowns(sheet) {
    // F7 will be auto-populated by populateTimeDropdowns when F6 changes
    // F8 will be populated with calculated end times by populateTimeDropdowns
    // No initial setup needed - everything is handled by populateTimeDropdowns
  }

function populateTimeDropdowns(sheet) {
  // Get current time and set F7 (Start Time) to current time
  const now = new Date();
  const currentTime = Utilities.formatDate(now, Session.getScriptTimeZone(), "h:mm a");
  sheet.getRange("F7").setValue(currentTime);
  
  // Calculate end time options based on current time + duration
  const durations = [30, 60, 90, 120]; // minutes
  const endTimeOptions = [];
  
  for (let duration of durations) {
    const endTime = new Date(now.getTime() + duration * 60000);
    const formattedEndTime = Utilities.formatDate(endTime, Session.getScriptTimeZone(), "h:mm a");
    endTimeOptions.push(formattedEndTime);
  }
  
  // Update F8 dropdown with calculated end times
  const endTimeValidation = SpreadsheetApp.newDataValidation().requireValueInList(endTimeOptions).setAllowInvalid(false).build();
  sheet.getRange("F8").setDataValidation(endTimeValidation);
  
  // Set time format for F7 and F8 to prevent decimal conversion
  sheet.getRange("F7:F8").setNumberFormat("h:mm am/pm");
}

function setupDailyEntrySheet(ss) {
  const sheet = getAndClearSheet(ss, CONFIG.sheets.dailyEntry);
  ss.setActiveSheet(sheet); ss.moveActiveSheet(1);
  const settingsSheet = ss.getSheetByName(CONFIG.sheets.settings);
  if (!settingsSheet) throw new Error("CRITICAL: Settings sheet not found.");
  
  // Set column widths
  sheet.setColumnWidths(1, 3, 120);
  sheet.setColumnWidth(4, 180);
  sheet.setColumnWidths(5, 3, 200);
  
  // SECTION 1: DAILY STAFF ROSTER (A1:C25)
  applyHeaderStyle(sheet.getRange("A1:C1").merge().setValue("DAILY STAFF ROSTER"));
  
  // Serve Next button in D1
  sheet.getRange("D1").setValue("Serve Next Customer ->").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
  sheet.getRange(CONFIG.buttons.next).insertCheckboxes().setVerticalAlignment("middle");
  
  // Roster headers and data
  let rosterHeaders = [["Position", "Masseuse Name", "Status", "Today's Massages"]];
  for (let i = 1; i <= CONFIG.rosterSize; i++) { 
    rosterHeaders.push([`#${i}`, "", "Available", 0]); 
  }
  sheet.getRange(2, 1, CONFIG.rosterSize + 1, 4).setValues(rosterHeaders);
  sheet.getRange("A2:D2").setFontWeight("bold");
  
  // Add formulas for massage count (D3:D22) - counts from Master Log for today
  for (let i = 3; i <= CONFIG.rosterSize + 2; i++) {
    const masseuseNameCell = `B${i}`;
    const countFormula = `=IFERROR(COUNTIFS('${CONFIG.sheets.masterLog}'!D:D, ${masseuseNameCell}, '${CONFIG.sheets.masterLog}'!C:C, TODAY(), '${CONFIG.sheets.masterLog}'!L:L, "ACTIVE"), 0)`;
    const cell = sheet.getRange(`D${i}`);
    cell.setFormula(countFormula);
    cell.setNumberFormat("#,##0"); // Ensure integer formatting
  }
  
  // SECTION 2: NEW TRANSACTION (E1:G15) - CLEARLY SEPARATED
  applyHeaderStyle(sheet.getRange("E1:G1").merge().setValue("NEW TRANSACTION"));
  
  // Form labels and fields
  const formLabels = [["Masseuse Name:"], ["Service Type:"], ["Payment Method:"], ["Start Time:"], ["End Time:"], ["Customer Contact (Optional):"], ["Service Price:"], ["Fee Preview:"]];
  sheet.getRange("E4:E11").setValues(formLabels).setFontWeight("bold");
  sheet.getRange("F4:F9").setBackground(THEME.subHeaderBackground);
  sheet.getRange("F10:F11").setFontWeight("bold").setNumberFormat('"฿"#,##0.00');
  
  // Formulas for auto-calculated fields
  sheet.getRange("F10").setFormula(`=IFERROR(VLOOKUP(F5, Settings!B:D, 2, FALSE), "")`);
  sheet.getRange("F11").setFormula(`=IFERROR(VLOOKUP(F5, Settings!B:D, 3, FALSE), "")`);
  
  // Submit button - CORRECTLY PLACED AT G13
  sheet.getRange("E13:F13").merge().setValue("Click to Submit ->").setBackground(THEME.buttonBackground).setFontColor(THEME.headerFontColor).setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
  sheet.getRange(CONFIG.buttons.submit).insertCheckboxes().setVerticalAlignment("middle");
  
  // SECTION 3: CORRECT A MISTAKE (E17:G22) - CLEARLY SEPARATED
  applyHeaderStyle(sheet.getRange("E17:G17").merge().setValue("CORRECT A MISTAKE"));
  sheet.getRange("E18").setValue("Most Recent Transaction:").setFontWeight("bold");
  sheet.getRange("F18").setValue("(Auto-detected)").setBackground(THEME.subHeaderBackground).setFontStyle("italic");
  sheet.getRange("E20:F20").merge().setValue("Click to Load ->").setBackground("#f4b400").setFontColor("black").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
  sheet.getRange(CONFIG.buttons.load).insertCheckboxes().setVerticalAlignment("middle");
  
  // SECTION 4: END DAY BUTTON (E24:G24)
  applyHeaderStyle(sheet.getRange("E24:G24").merge().setValue("END DAY"));
  sheet.getRange("E25:F25").merge().setValue("Click to End Day ->").setBackground("#e06666").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
  sheet.getRange(CONFIG.buttons.endDay).insertCheckboxes().setVerticalAlignment("middle");
  
  // SECTION 5: RECENT TRANSACTIONS LOG (A27:I30) - EXACTLY 4 ROWS TOTAL (1 header + 3 data)
  applyHeaderStyle(sheet.getRange("A27:I27").merge().setValue("RECENT TRANSACTIONS LOG"));
  
  // Fixed QUERY formula - shows exactly 3 most recent transactions
  // Shows: Payment Method, Masseuse, Service, Amount, Fee, Start Time, End Time
  // Limited to exactly 3 rows of data (4 total including header)
  const recentLogFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, D, E, F, H, I, J WHERE L CONTAINS 'ACTIVE' OR L CONTAINS 'CORRECTED' ORDER BY B DESC LIMIT 3 LABEL G 'Payment', D 'Masseuse', E 'Service', F 'Amount', H 'Fee', I 'Start', J 'End'", 1), "No transactions yet.")`;
  sheet.getRange("A28").setFormula(recentLogFormula);
  
  // Style the QUERY result headers (A28:I28) to be bold
  sheet.getRange("A28:I28").setFontWeight("bold");
  
  // Set time format for the entire recent log area to prevent decimal conversion
  sheet.getRange("F28:I30").setNumberFormat("h:mm am/pm");
  
  // SECTION 6: DAILY SUMMARY (A32:I42) - MOVED TO CORRECT POSITION
  applyHeaderStyle(sheet.getRange("A32:I32").merge().setValue("TODAY'S QUICK SUMMARY"));
  sheet.getRange("A33").setValue("Today's Revenue:").setFontWeight("bold");
  sheet.getRange("B33").setFormula(`=IFERROR(SUMIFS('${CONFIG.sheets.masterLog}'!F:F, '${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`).setNumberFormat("#,##0.00");
  sheet.getRange("A34").setValue("Today's Transactions:").setFontWeight("bold");
  sheet.getRange("B34").setFormula(`=IFERROR(COUNTIFS('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`);
  sheet.getRange("A35").setValue("Total Revenue (All Time):").setFontWeight("bold");
  sheet.getRange("B35").setFormula(`=IFERROR(SUMIF('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!F:F), 0)`).setNumberFormat("#,##0.00");
  
  // Payment Method Breakdown for Today
  sheet.getRange("A37").setValue("TODAY'S PAYMENT BREAKDOWN:").setFontWeight("bold").setFontSize(12);
  sheet.getRange("A38").setValue("Payment Method:").setFontWeight("bold");
  sheet.getRange("B38").setValue("Today's Revenue:").setFontWeight("bold");
  sheet.getRange("C38").setValue("Count:").setFontWeight("bold");
  
  // Dynamic payment breakdown for today
  const todayPaymentFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F) WHERE L CONTAINS 'ACTIVE' AND C = DATE '"&TEXT(TODAY(),"yyyy-mm-dd")&"' GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Method', SUM(F) 'Revenue', COUNT(F) 'Count'", 1), "No transactions today.")`;
  sheet.getRange("A39").setFormula(todayPaymentFormula);
  
  // SETUP VALIDATION RANGES
  const lastRow = Math.max(settingsSheet.getLastRow(), 6);
  
  const masseuseRange = settingsSheet.getRange(2, 1, lastRow - 1, 1);
  const serviceRange = settingsSheet.getRange(2, 2, lastRow - 1, 1);
  const paymentRange = settingsSheet.getRange(2, 5, lastRow - 1, 1);
  
  // SETUP DATA VALIDATION
  const rosterValidationRule = SpreadsheetApp.newDataValidation().requireValueInRange(masseuseRange).setAllowInvalid(false).build();
  sheet.getRange(3, 2, CONFIG.rosterSize, 1).setDataValidation(rosterValidationRule);
  sheet.getRange("F4").setDataValidation(rosterValidationRule);
  sheet.getRange("F5").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(serviceRange).setAllowInvalid(false).build());
  sheet.getRange("F6").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(paymentRange).setAllowInvalid(false).build());
  
  // Add status dropdown for roster (C3:C22)
  const statusOptions = ["Available", "Busy", "Break", "Off", "Next"];
  const statusValidationRule = SpreadsheetApp.newDataValidation().requireValueInList(statusOptions).setAllowInvalid(false).build();
  sheet.getRange(3, 3, CONFIG.rosterSize, 1).setDataValidation(statusValidationRule);
  
  // SETUP TIME DROPDOWNS
  setupTimeDropdowns(sheet);
  
  // Set time format for time input fields to prevent decimal conversion
  sheet.getRange("F7:F8").setNumberFormat("h:mm am/pm");
  
  // SETUP SHEET PROTECTION
  sheet.protect().setUnprotectedRanges([
    sheet.getRange(3, 2, CONFIG.rosterSize, 2), 
    sheet.getRange("F4:F9"), 
    sheet.getRange("F18")
  ]).addEditor(CONFIG.managementEmail);
}