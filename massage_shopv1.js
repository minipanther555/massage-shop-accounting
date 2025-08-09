// Copyright 2025. For internal deployment.
// v8.1 - Fixes a "Range not found" error in Data Validation setup by adding safeguards for range calculation.

// --- CONFIGURATION ---
const CONFIG = {
    sheets: { dailyEntry: "Daily Entry", masterLog: "Master Log", reports: "Reports", settings: "Settings" },
    managementEmail: Session.getEffectiveUser().getEmail(),
    rosterSize: 20,
    buttons: { submit: 'G13', load: 'G20' }
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
    if (sheet.getName() !== CONFIG.sheets.dailyEntry || e.value !== "TRUE") { return; }
    const cell = range.getA1Notation();
    if (cell === CONFIG.buttons.submit) { range.setValue(false); submitTransaction(); } 
    else if (cell === CONFIG.buttons.load) { range.setValue(false); loadTransactionForCorrection(); }
  }
  
  function createBookkeepingTemplate() {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setupSettingsSheet(ss);
    setupMasterLogSheet(ss);
    setupReportsSheet(ss);
    setupDailyEntrySheet(ss); 
    const defaultSheet = ss.getSheetByName('Sheet1');
    if (defaultSheet) { ss.deleteSheet(defaultSheet); }
    try { SpreadsheetApp.getUi().toast('Template build complete.', 'Success', 5); } catch (e) { console.log('Build complete.'); }
  }
  
  // =================================================================
  // ===            CORE TRANSACTION & CORRECTION LOGIC            ===
  // =================================================================
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
  
  // Main Dashboard Header
  applyHeaderStyle(sheet.getRange("A1:C1").merge().setValue("MANAGEMENT DASHBOARD"));
  
  // Total Revenue Section
  sheet.getRange("A3").setValue("TOTAL REVENUE").setFontWeight("bold").setFontSize(14);
  sheet.getRange("A4").setValue("Total Revenue (All Time):").setFontWeight("bold");
  sheet.getRange("B4").setFormula(`=IFERROR(SUMIF('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!F:F), 0)`).setNumberFormat("#,##0.00");
  
  // Payment Method Breakdown
  sheet.getRange("A6").setValue("REVENUE BY PAYMENT METHOD").setFontWeight("bold").setFontSize(14);
  sheet.getRange("A7").setValue("Payment Method:").setFontWeight("bold");
  sheet.getRange("B7").setValue("Total Revenue:").setFontWeight("bold");
  sheet.getRange("C7").setValue("Transaction Count:").setFontWeight("bold");
  
  // Dynamic payment method breakdown formula
  const paymentBreakdownFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F) WHERE L CONTAINS 'ACTIVE' GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Method', SUM(F) 'Total Revenue', COUNT(F) 'Count'", 1), "No data yet.")`;
  sheet.getRange("A8").setFormula(paymentBreakdownFormula);
  
  // Masseuse Performance Section
  sheet.getRange("A12").setValue("MASSEUSE PERFORMANCE & SALARY").setFontWeight("bold").setFontSize(14);
  sheet.getRange("A13").setValue("Masseuse:").setFontWeight("bold");
  sheet.getRange("B13").setValue("Total Revenue:").setFontWeight("bold");
  sheet.getRange("C13").setValue("Total Fees (Salary):").setFontWeight("bold");
  sheet.getRange("D13").setValue("Transaction Count:").setFontWeight("bold");
  
  // Masseuse performance formula with salary calculation
  const masseusePerformanceFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT D, SUM(F), SUM(H), COUNT(F) WHERE L CONTAINS 'ACTIVE' GROUP BY D ORDER BY SUM(F) DESC LABEL D 'Masseuse', SUM(F) 'Total Revenue', SUM(H) 'Total Fees', COUNT(F) 'Count'", 1), "No data yet.")`;
  sheet.getRange("A14").setFormula(masseusePerformanceFormula);
  
  // Today's Summary
  sheet.getRange("A18").setValue("TODAY'S SUMMARY").setFontWeight("bold").setFontSize(14);
  sheet.getRange("A19").setValue("Today's Revenue:").setFontWeight("bold");
  sheet.getRange("B19").setFormula(`=IFERROR(SUMIFS('${CONFIG.sheets.masterLog}'!F:F, '${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`).setNumberFormat("#,##0.00");
  sheet.getRange("A20").setValue("Today's Transactions:").setFontWeight("bold");
  sheet.getRange("B20").setFormula(`=IFERROR(COUNTIFS('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`);
  
  // Formatting
  sheet.getRange("B4").setNumberFormat("#,##0.00");
  sheet.getRange("B19").setNumberFormat("#,##0.00");
  sheet.setColumnWidths(1, 4, 200);
  
  const protection = sheet.protect(); protection.addEditor(CONFIG.managementEmail); sheet.hideSheet();
}
  
  function setupDailyEntrySheet(ss) {
    const sheet = getAndClearSheet(ss, CONFIG.sheets.dailyEntry);
    ss.setActiveSheet(sheet); ss.moveActiveSheet(1);
    const settingsSheet = ss.getSheetByName(CONFIG.sheets.settings);
    if (!settingsSheet) throw new Error("CRITICAL: Settings sheet not found.");
    
    applyHeaderStyle(sheet.getRange("A1:B1").merge().setValue("DAILY STAFF ROSTER"));
    let rosterHeaders = [["Position", "Masseuse Name"]];
    for (let i = 1; i <= CONFIG.rosterSize; i++) { rosterHeaders.push([`#${i}`, ""]); }
    sheet.getRange(2, 1, CONFIG.rosterSize + 1, 2).setValues(rosterHeaders).setFontWeight("normal");
    sheet.getRange("A2:B2").setFontWeight("bold");
  
    applyHeaderStyle(sheet.getRange("E1:F1").merge().setValue("NEW TRANSACTION"));
    sheet.getRange("E2:G22").clear();
    const formLabels = [["Masseuse Name:"], ["Service Type:"], ["Payment Method:"], ["Start Time:"], ["End Time:"], ["Customer Contact (Optional):"], ["Service Price:"], ["Fee Preview:"]];
    sheet.getRange("E4:E11").setValues(formLabels).setFontWeight("bold");
    sheet.getRange("F4:F9").setBackground(THEME.subHeaderBackground);
    sheet.getRange("F10:F11").setFontWeight("bold").setNumberFormat("#,##0.00");
    sheet.getRange("F10").setFormula(`=IFERROR(VLOOKUP(F5, Settings!B:D, 2, FALSE), "")`);
    sheet.getRange("F11").setFormula(`=IFERROR(VLOOKUP(F5, Settings!B:D, 3, FALSE), "")`);
    
    const submitButtonCell = sheet.getRange("E13:F13");
    submitButtonCell.merge().setValue("Click Checkbox to Submit ->").setBackground(THEME.buttonBackground).setFontColor(THEME.headerFontColor).setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
    sheet.getRange(CONFIG.buttons.submit).insertCheckboxes().setVerticalAlignment("middle");
  
    applyHeaderStyle(sheet.getRange("E17:F17").merge().setValue("CORRECT A MISTAKE"));
    sheet.getRange("E18").setValue("Transaction ID to Correct:").setFontWeight("bold");
    sheet.getRange("F18").setBackground(THEME.subHeaderBackground);
    const correctionButtonCell = sheet.getRange("E20:F20");
    correctionButtonCell.merge().setValue("Click Checkbox to Load ->").setBackground("#f4b400").setFontColor("black").setFontWeight("bold").setHorizontalAlignment("right").setVerticalAlignment("middle");
    sheet.getRange(CONFIG.buttons.load).insertCheckboxes().setVerticalAlignment("middle");
    
    applyHeaderStyle(sheet.getRange("A25:I25").merge().setValue("RECENT TRANSACTIONS LOG"));
    const recentLogFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT L, A, C, D, E, F, I, J, K WHERE L CONTAINS 'ACTIVE' ORDER BY B DESC LIMIT 5", 0), "No transactions yet.")`;
    sheet.getRange("A26").setFormula(recentLogFormula);
    
    // Quick Summary Section
    applyHeaderStyle(sheet.getRange("A30:I30").merge().setValue("TODAY'S QUICK SUMMARY"));
    sheet.getRange("A31").setValue("Today's Revenue:").setFontWeight("bold");
    sheet.getRange("B31").setFormula(`=IFERROR(SUMIFS('${CONFIG.sheets.masterLog}'!F:F, '${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`).setNumberFormat("#,##0.00");
    sheet.getRange("A32").setValue("Today's Transactions:").setFontWeight("bold");
    sheet.getRange("B32").setFormula(`=IFERROR(COUNTIFS('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!C:C, TODAY()), 0)`);
    sheet.getRange("A33").setValue("Total Revenue (All Time):").setFontWeight("bold");
    sheet.getRange("B33").setFormula(`=IFERROR(SUMIF('${CONFIG.sheets.masterLog}'!L:L, "ACTIVE", '${CONFIG.sheets.masterLog}'!F:F), 0)`).setNumberFormat("#,##0.00");
    
    // Payment Method Breakdown for Today
    sheet.getRange("A35").setValue("TODAY'S PAYMENT BREAKDOWN:").setFontWeight("bold").setFontSize(12);
    sheet.getRange("A36").setValue("Payment Method:").setFontWeight("bold");
    sheet.getRange("B36").setValue("Today's Revenue:").setFontWeight("bold");
    sheet.getRange("C36").setValue("Count:").setFontWeight("bold");
    
    // Dynamic payment breakdown for today
    const todayPaymentFormula = `=IFERROR(QUERY('${CONFIG.sheets.masterLog}'!A:L, "SELECT G, SUM(F), COUNT(F) WHERE L CONTAINS 'ACTIVE' AND C = DATE '"&TEXT(TODAY(),"yyyy-mm-dd")&"' GROUP BY G ORDER BY SUM(F) DESC LABEL G 'Payment Method', SUM(F) 'Revenue', COUNT(F) 'Count'", 1), "No transactions today.")`;
    sheet.getRange("A37").setFormula(todayPaymentFormula);
  
    // --- CRITICAL BUG FIX IS HERE ---
    // Safeguards added to ensure calculated ranges are always valid.
    const lastSettingsRow = settingsSheet.getLastRow();
    const lastDataRow = Math.max(2, Math.min(lastSettingsRow, 5)); // Use actual data rows (2-5)
    
    const masseuseRange = settingsSheet.getRange("A2:A" + lastDataRow);
    const serviceRange = settingsSheet.getRange("B2:B" + lastDataRow);
    const paymentRange = settingsSheet.getRange("E2:E" + lastDataRow);
    
    const rosterValidationRule = SpreadsheetApp.newDataValidation().requireValueInRange(masseuseRange).setAllowInvalid(false).build();
    sheet.getRange(3, 2, CONFIG.rosterSize, 1).setDataValidation(rosterValidationRule);
    sheet.getRange("F4").setDataValidation(rosterValidationRule);
    sheet.getRange("F5").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(serviceRange).setAllowInvalid(false).build());
    sheet.getRange("F6").setDataValidation(SpreadsheetApp.newDataValidation().requireValueInRange(paymentRange).setAllowInvalid(false).build());
    
    const protection = sheet.protect().setDescription("Protects all but input cells.");
    protection.setUnprotectedRanges([
      sheet.getRange(3, 2, CONFIG.rosterSize, 1), sheet.getRange("F4:F9"), sheet.getRange("F18")
    ]);
    protection.addEditor(CONFIG.managementEmail);
  }