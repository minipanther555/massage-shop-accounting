// Test script to simulate QUERY formula behavior
function testRecentTransactionsQuery() {
  console.log("Testing QUERY formula behavior...");
  
  // Simulate Master Log data
  const mockMasterLog = [
    ["ID1", "2025-08-07 10:00", "2025-08-07", "Anna", "Thai 60", 250, "Cash", 100, "10:00 AM", "11:00 AM", "email1", "ACTIVE"],
    ["ID2", "2025-08-07 11:00", "2025-08-07", "Betty", "Neck", 150, "Card", 60, "11:00 AM", "12:00 PM", "email2", "ACTIVE"],
    ["ID3", "2025-08-07 12:00", "2025-08-07", "Carla", "Foot", 200, "Cash", 80, "12:00 PM", "1:00 PM", "email3", "ACTIVE"],
    ["ID4", "2025-08-07 13:00", "2025-08-07", "Diana", "Oil", 400, "Card", 150, "1:00 PM", "2:00 PM", "email4", "ACTIVE"],
    ["ID5", "2025-08-07 14:00", "2025-08-07", "Eve", "Thai 90", 300, "Cash", 120, "2:00 PM", "3:30 PM", "email5", "ACTIVE"]
  ];
  
  // Simulate QUERY formula: SELECT G, D, E, F, H, I, J WHERE L = 'ACTIVE' ORDER BY B DESC LIMIT 3
  const queryResult = mockMasterLog
    .filter(row => row[11] === "ACTIVE")  // WHERE L = 'ACTIVE'
    .sort((a, b) => new Date(b[1]) - new Date(a[1]))  // ORDER BY B DESC
    .slice(0, 3)  // LIMIT 3
    .map(row => [row[6], row[3], row[4], row[5], row[7], row[8], row[9]]);  // SELECT G, D, E, F, H, I, J
  
  console.log("QUERY Result (3 most recent):");
  queryResult.forEach((row, index) => {
    console.log(`${index + 1}. Payment: ${row[0]}, Masseuse: ${row[1]}, Service: ${row[2]}, Amount: ${row[3]}, Fee: ${row[4]}, Start: ${row[5]}, End: ${row[6]}`);
  });
  
  console.log("\n✅ Test completed - QUERY should work with LIMIT 3");
}

// Run the test
testRecentTransactionsQuery();


