// Debug version of submitTransaction function
function submitTransactionDebug() {
  console.log("=== SUBMIT TRANSACTION DEBUG START ===");
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const entrySheet = ss.getSheetByName(CONFIG.sheets.dailyEntry);
  const logSheet = ss.getSheetByName(CONFIG.sheets.masterLog);
  const settingsSheet = ss.getSheetByName(CONFIG.sheets.settings);
  const ui = SpreadsheetApp.getUi();

  console.log("1. Sheets loaded successfully");

  const entryData = entrySheet.getRange("F4:F9").getValues();
  console.log("2. Entry data read:", entryData);

  const originalId = entrySheet.getRange("F19").getValue();
  const status = originalId ? `CORRECTED (Original: ${originalId})` : "ACTIVE";
  console.log("3. Original ID:", originalId, "Status:", status);
  
  const [masseuse, service, paymentMethod, startTime, endTime, customerContact] = 
        [entryData[0][0], entryData[1][0], entryData[2][0], entryData[3][0], entryData[4][0], entryData[5][0]];

  console.log("4. Extracted values:", { masseuse, service, paymentMethod, startTime, endTime, customerContact });
  console.log("5. Customer contact type:", typeof customerContact, "Value:", customerContact);

  if (!masseuse || !service || !paymentMethod || !startTime || !endTime) { 
    console.log("❌ VALIDATION FAILED - missing required fields");
    ui.alert("Error", "Masseuse, Service, Payment, and Times are required."); 
    return; 
  }
  console.log("6. ✅ Validation passed");
  
  const settingsData = settingsSheet.getRange("A2:E" + settingsSheet.getLastRow()).getValues();
  let price = 0, fee = 0;
  for (let i = 0; i < settingsData.length; i++) { 
    if (settingsData[i][1] === service) { 
      price = settingsData[i][2]; 
      fee = settingsData[i][3]; 
      break; 
    } 
  }
  console.log("7. Price:", price, "Fee:", fee);
  
  const timestamp = new Date();
  const tz = ss.getSpreadsheetTimeZone();
  const dateOnly = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());
  const transactionId = Utilities.formatDate(timestamp, tz, "yyyyMMddHHmmssS");
  console.log("8. Transaction ID:", transactionId);
  
  // Test different customer contact handling approaches
  console.log("9. Testing customer contact processing...");
  
  // Approach 1: Current approach
  const safeCustomerContact1 = customerContact ? String(customerContact).trim() : "";
  console.log("   Approach 1 (current):", safeCustomerContact1);
  
  // Approach 2: More defensive
  const safeCustomerContact2 = customerContact ? String(customerContact || "").trim() : "";
  console.log("   Approach 2 (defensive):", safeCustomerContact2);
  
  // Approach 3: Explicit null check
  const safeCustomerContact3 = (customerContact !== null && customerContact !== undefined) ? String(customerContact).trim() : "";
  console.log("   Approach 3 (explicit null):", safeCustomerContact3);
  
  // Use the most defensive approach
  const safeCustomerContact = safeCustomerContact3;
  
  const newRow = [transactionId, timestamp, dateOnly, masseuse, service, price, paymentMethod, fee, startTime, endTime, safeCustomerContact, status];
  console.log("10. New row constructed:", newRow);
  console.log("11. Row length:", newRow.length);
  
  // Test each value in the row
  newRow.forEach((val, index) => {
    console.log(`   Index ${index}:`, val, "Type:", typeof val);
  });
  
  console.log("12. About to attempt appendRow...");
  
  try {
    console.log("13. Calling logSheet.appendRow...");
    logSheet.appendRow(newRow);
    console.log("14. ✅ appendRow completed successfully");
  } catch (appendError) {
    console.log("❌ appendRow failed:", appendError);
    console.log("Error details:", appendError.message);
    console.log("Error stack:", appendError.stack);
    ui.alert("Error", "Failed to log transaction. Please try again.");
    return;
  }
  
  console.log("15. Clearing form fields...");
  entrySheet.getRange("F4:F9").clearContent();
  entrySheet.getRange("E4:G11").setBackground(null);
  entrySheet.getRange("F4:F9").setBackground(THEME.subHeaderBackground);
  entrySheet.getRange("F18:F19").clearContent();
  
  console.log("16. Flushing and activating...");
  SpreadsheetApp.flush();
  entrySheet.getRange("F4").activate();
  
  console.log("17. Showing success toast...");
  ui.toast("Transaction logged successfully.");
  
  console.log("=== SUBMIT TRANSACTION DEBUG COMPLETE ===");
}


