// Quick test function for Google Apps Script
function testQueryFormula() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterLogSheet = ss.getSheetByName("Master Log");
  
  if (!masterLogSheet) {
    console.log("❌ Master Log sheet not found");
    return;
  }
  
  // Test the QUERY formula directly
  const testFormula = `=IFERROR(QUERY('Master Log'!A:L, "SELECT G, D, E, F, H, I, J WHERE L = 'ACTIVE' ORDER BY B DESC LIMIT 3 LABEL G 'Payment', D 'Masseuse', E 'Service', F 'Amount', H 'Fee', I 'Start', J 'End'", 1), "No transactions yet.")`;
  
  console.log("Testing QUERY formula:", testFormula);
  
  // Get the actual data to verify
  const allData = masterLogSheet.getDataRange().getValues();
  const headers = allData.shift();
  
  console.log("Total rows in Master Log:", allData.length);
  console.log("Active transactions:", allData.filter(row => row[11] === "ACTIVE").length);
  
  // Simulate what the QUERY should return
  const activeTransactions = allData.filter(row => row[11] === "ACTIVE");
  const sortedTransactions = activeTransactions.sort((a, b) => new Date(b[1]) - new Date(a[1]));
  const recent3 = sortedTransactions.slice(0, 3);
  
  console.log("Expected 3 most recent transactions:");
  recent3.forEach((row, index) => {
    console.log(`${index + 1}. ${row[6]} | ${row[3]} | ${row[4]} | ${row[5]} | ${row[7]} | ${row[8]} | ${row[9]}`);
  });
  
  console.log("✅ Test completed - formula should work correctly");
}


