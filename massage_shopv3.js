// Copyright 2025. For internal deployment.
// v8.1 - Fixes a "Range not found" error in Data Validation setup by adding safeguards for range calculation.

// --- CONFIGURATION ---
const CONFIG = {
    sheets: { dailyEntry: "Daily Entry", masterLog: "Master Log", reports: "Reports", settings: "Settings", dailySummary: "Daily Summary" },
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
    const range = e.range;
    const sheet = range.getSheet();
    if (sheet.getName() !== CONFIG.sheets.dailyEntry) { return; }
    
    // Handle checkbox clicks
    if (e.value === "TRUE") {
      const cell = range.getA1Notation();
      if (cell === CONFIG.buttons.submit) { range.setValue(false); submitTransaction(); } 
      else if (cell === CONFIG.buttons.load) { range.setValue(false); loadTransactionForCorrection(); }
      else if (cell === CONFIG.buttons.next) { range.setValue(false); serveNextCustomer(); }
      else if (cell === CONFIG.buttons.endDay) { range.setValue(false); endDay(); }
    }
    
    // Handle time dropdown population when F6 (Payment Method) changes
    if (range.getA1Notation() === "F6" && e.value) {
      populateTimeDropdowns(sheet);
    }
  }
  
  function createBookkeepingTemplate() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSettingsSheet(ss);
    setupMasterLogSheet(ss);
    setupReportsSheet(ss);
    setupDailySummarySheet(ss);
    setupDailyEntrySheet(ss); 
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

function resetDailyEntrySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dailyEntrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
  
  // Clear form fields
  dailyEntrySheet.getRange("F4:F9").clearContent();
  dailyEntrySheet.getRange("F18:F19").clearContent();
  
  // Reset roster statuses to "Available"
  dailyEntrySheet.getRange(3, 3, CONFIG.rosterSize, 1).setValue("Available");
  
  // Clear recent transactions log DATA ONLY (not the header) - 4 rows of data
  dailyEntrySheet.getRange("A28:I31").clearContent();
  
  // Reset massage count column to 0
  dailyEntrySheet.getRange(3, 4, CONFIG.rosterSize, 1).setValue(0);
}

function loadTransactionForCorrection() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const entrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
    const logSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
    const ui = SpreadsheetApp.getUi();
    
    const transactionIdToCorrect = entrySheet.getRange("F18").getValue();
    if (!transactionIdToCorrect) { ui.alert("Please enter a Transaction ID to correct."); return; }
  
    const logData = logSheet.getDataRange().getValues();
    const headers = logData.shift();
    const idCol = headers.indexOf("Transaction ID"), statusCol = headers.indexOf("Status");
  
    let rowIndex = -1;
    for(let i = 0; i < logData.length; i++) { if (logData[i][idCol] == transactionIdToCorrect) { rowIndex = i; break; } }
    if (rowIndex === -1) { ui.alert("Transaction ID not found."); return; }
    
    logSheet.getRange(rowIndex + 2, statusCol + 1).setValue("VOID");
    
    const rowData = logData[rowIndex];
    entrySheet.getRange("F4:F9").setValues([
      [rowData[headers.indexOf("Masseuse Name")]],[rowData[headers.indexOf("Service Type")]],[rowData[headers.indexOf("Payment Method")]],
      [rowData[headers.indexOf("Start Time")]],[rowData[headers.indexOf("End Time")]],[rowData[headers.indexOf("Customer Contact (Optional)")]]
    ]);
    
    entrySheet.getRange("E4:G11").setBackground(THEME.correctionModeBackground);
    entrySheet.getRange("F19").setValue(transactionIdToCorrect);
    ui.alert(`Transaction ${transactionIdToCorrect} is VOID and loaded for correction.`);
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
    
    const [masseuse, service, paymentMethod, startTime, endTime, customerContact] = 
          [entryData[0][0], entryData[1][0], entryData[2][0], entryData[3][0], entryData[4][0], entryData[5][0]];
  
    if (!masseuse || !service || !paymentMethod || !startTime || !endTime) { ui.alert("Error", "Masseuse, Service, Payment, and Times are required."); return; }
    
    const settingsData = settingsSheet.getRange("A2:E" + settingsSheet.getLastRow()).getValues();
    let price = 0, fee = 0;
    for (let i = 0; i < settingsData.length; i++) { if (settingsData[i][1] === service) { price = settingsData[i][2]; fee = settingsData[i][3]; break; } }
    
    const timestamp = new Date();
    const tz = ss.getSpreadsheetTimeZone();
    const dateOnly = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
    const transactionId = Utilities.formatDate(timestamp, tz, "yyyyMMddHHmmssS");
    
    const newRow = [transactionId, timestamp, dateOnly, masseuse, service, price, paymentMethod, fee, startTime, endTime, customerContact || "", status];
    logSheet.appendRow(newRow);
    
    // Increment massage count for the masseuse
    const rosterRange = entrySheet.getRange(3, 2, CONFIG.rosterSize, 1);
    const rosterData = rosterRange.getValues();
    for (let i = 0; i < rosterData.length; i++) {
      if (rosterData[i][0] === masseuse) {
        const currentCount = entrySheet.getRange(3 + i, 4).getValue() || 0;
        entrySheet.getRange(3 + i, 4).setValue(currentCount + 1);
        break;
      }
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
    sheet.getRange("A1").setValue("MANAGEMENT DASHBOARD");
    const reportFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT D, SUM(F), SUM(H) WHERE L CONTAINS 'ACTIVE' GROUP BY D ORDER BY SUM(F) DESC LABEL D 'Masseuse', SUM(F) 'Total Revenue', SUM(H) 'Total Fees'", 1), "No data yet.")`;
    sheet.getRange("A3").setValue("Masseuse Performance").setFontWeight("bold");
    sheet.getRange("A4").setFormula(reportFormula);
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
  
  // =================================================================
  // ===                 SETTINGS SHEET HELPERS                   ===
  // =================================================================
  function setupTimeDropdowns(sheet) {
    // F7 will be auto-populated, not a dropdown
    // F8 will be a simple dropdown with duration options
    const durationOptions = ["30 minutes", "60 minutes", "90 minutes", "120 minutes"];
    const durationValidation = SpreadsheetApp.newDataValidation().requireValueInList(durationOptions).setAllowInvalid(false).build();
    sheet.getRange("F8").setDataValidation(durationValidation);
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
  sheet.getRange("E18").setValue("Transaction ID to Correct:").setFontWeight("bold");
  sheet.getRange("F18").setBackground(THEME.subHeaderBackground);
  sheet.getRange("E20:F20").merge().setValue("Click to Load ->").setBackground("#f4b400").setFontColor("black").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
  sheet.getRange(CONFIG.buttons.load).insertCheckboxes().setVerticalAlignment("middle");
  
  // SECTION 4: END DAY BUTTON (E24:G24)
  applyHeaderStyle(sheet.getRange("E24:G24").merge().setValue("END DAY"));
  sheet.getRange("E25:F25").merge().setValue("Click to End Day ->").setBackground("#e06666").setFontColor("white").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
  sheet.getRange(CONFIG.buttons.endDay).insertCheckboxes().setVerticalAlignment("middle");
  
  // SECTION 5: RECENT TRANSACTIONS LOG (A27:I35) - CLEARLY SEPARATED
  applyHeaderStyle(sheet.getRange("A27:I27").merge().setValue("RECENT TRANSACTIONS LOG"));
  
  // Fixed QUERY formula with proper time formatting and LIMITED to 5 most recent
  // This ensures the submit button never fails due to QUERY formula limits
  // All transactions are stored in Master Log - this is just for quick reference
  const recentLogFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT A, C, D, E, F, H, I, J, K, L WHERE L CONTAINS 'ACTIVE' ORDER BY B DESC LIMIT 4 FORMAT C 'yyyy-mm-dd', F '฿#,##0.00', H '฿#,##0.00', I 'h:mm am/pm', J 'h:mm am/pm'", 1), "No transactions yet.")`;
  sheet.getRange("A28").setFormula(recentLogFormula);
  
  // SECTION 6: DAILY SUMMARY (A40:I50) - RESTORED
  applyHeaderStyle(sheet.getRange("A40:I40").merge().setValue("TODAY'S QUICK SUMMARY"));
  sheet.getRange("A41").setValue("Today's Revenue:").setFontWeight("bold");
  sheet.getRange("B41").setFormula(`=IFERROR(SUMIFS('${CONFIG.sheets.masterLog}'!F:F, '${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`).setNumberFormat("#,##0.00");
  sheet.getRange("A42").setValue("Today's Transactions:").setFontWeight("bold");
  sheet.getRange("B42").setFormula(`=IFERROR(COUNTIFS('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`);
  sheet.getRange("A43").setValue("Total Revenue (All Time):").setFontWeight("bold");
  sheet.getRange("B43").setFormula(`=IFERROR(SUMIF('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!F:F), 0)`).setNumberFormat("#,##0.00");
  
  // Payment Method Breakdown for Today
  sheet.getRange("A45").setValue("TODAY'S PAYMENT BREAKDOWN:").setFontWeight("bold").setFontSize(12);
  sheet.getRange("A46").setValue("Payment Method:").setFontWeight("bold");
  sheet.getRange("B46").setValue("Today's Revenue:").setFontWeight("bold");
  sheet.getRange("C46").setValue("Count:").setFontWeight("bold");
  
  // Dynamic payment breakdown for today
  const todayPaymentFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F) WHERE L CONTAINS 'ACTIVE' AND C = DATE '"&TEXT(TODAY(),"yyyy-mm-dd")&"' GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Method', SUM(F) 'Revenue', COUNT(F) 'Count'", 1), "No transactions today.")`;
  sheet.getRange("A47").setFormula(todayPaymentFormula);
  
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
  
  // SETUP SHEET PROTECTION
  sheet.protect().setUnprotectedRanges([
    sheet.getRange(3, 2, CONFIG.rosterSize, 2), 
    sheet.getRange("F4:F9"), 
    sheet.getRange("F18")
  ]).addEditor(CONFIG.managementEmail);
}