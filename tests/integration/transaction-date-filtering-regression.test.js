const { test, expect } = require('@playwright/test');

test.describe('Transaction Date Filtering - Regression Prevention', () => {
  test.beforeEach(async ({ request }) => {
    // Ensure we're testing against a clean state
    console.log('🧪 REGRESSION: Starting transaction date filtering test');
  });

  test('should prevent SQL parentheses bug regression in /transactions/recent endpoint', async ({ request }) => {
    console.log('🧪 REGRESSION: Testing SQL parentheses fix for date filtering');
    
    const today = new Date().toISOString().split('T')[0];
    console.log('🧪 REGRESSION: Testing with date:', today);
    
    // Test 1: Verify date filtering works correctly
    const response = await request.get(`http://localhost:3000/api/transactions/recent?limit=50&date=${today}`);
    expect(response.ok()).toBeTruthy();
    const transactions = await response.json();
    
    console.log('🧪 REGRESSION: Transactions returned with date filter:', transactions.length);
    
    // Test 2: Verify ALL returned transactions are from today
    if (transactions.length > 0) {
      const allFromToday = transactions.every(t => t.date === today);
      console.log('🧪 REGRESSION: All transactions from today?', allFromToday);
      
      if (!allFromToday) {
        const nonTodayTransactions = transactions.filter(t => t.date !== today);
        console.log('🧪 REGRESSION: Transactions NOT from today:', nonTodayTransactions.map(t => ({
          id: t.transaction_id,
          date: t.date,
          status: t.status
        })));
      }
      
      expect(allFromToday).toBeTruthy();
    }
    
    // Test 3: Verify chronological ordering (oldest first)
    if (transactions.length > 1) {
      const timestamps = transactions.map(t => new Date(t.timestamp).getTime());
      const isChronological = timestamps.every((time, i) => i === 0 || time >= timestamps[i - 1]);
      console.log('🧪 REGRESSION: Transactions in chronological order?', isChronological);
      expect(isChronological).toBeTruthy();
    }
  });

  test('should maintain consistency between /transactions and /transactions/recent endpoints', async ({ request }) => {
    console.log('🧪 REGRESSION: Testing endpoint consistency');
    
    const today = new Date().toISOString().split('T')[0];
    
    // Test 1: Get transactions from main endpoint
    const response1 = await request.get(`http://localhost:3000/api/transactions?date=${today}&limit=50`);
    expect(response1.ok()).toBeTruthy();
    const mainTransactions = await response1.json();
    
    // Test 2: Get transactions from recent endpoint
    const response2 = await request.get(`http://localhost:3000/api/transactions/recent?limit=50&date=${today}`);
    expect(response2.ok()).toBeTruthy();
    const recentTransactions = await response2.json();
    
    console.log('🧪 REGRESSION: Main endpoint count:', mainTransactions.transactions?.length || 0);
    console.log('🧪 REGRESSION: Recent endpoint count:', recentTransactions.length);
    
    // Test 3: Verify data consistency
    if (mainTransactions.transactions && recentTransactions.length > 0) {
      const mainIds = mainTransactions.transactions.map(t => t.transaction_id).sort();
      const recentIds = recentTransactions.map(t => t.transaction_id).sort();
      
      const consistent = JSON.stringify(mainIds) === JSON.stringify(recentIds);
      console.log('🧪 REGRESSION: Endpoints return consistent data?', consistent);
      
      if (!consistent) {
        const onlyInMain = mainIds.filter(id => !recentIds.includes(id));
        const onlyInRecent = recentIds.filter(id => !mainIds.includes(id));
        console.log('🧪 REGRESSION: Inconsistencies detected:');
        console.log('🧪 REGRESSION: Only in main:', onlyInMain);
        console.log('🧪 REGRESSION: Only in recent:', onlyInRecent);
      }
      
      expect(consistent).toBeTruthy();
    }
  });

  test('should handle edge cases in date filtering', async ({ request }) => {
    console.log('🧪 REGRESSION: Testing edge cases');
    
    // Test 1: No date parameter should return recent transactions (no filtering)
    const response1 = await request.get('http://localhost:3000/api/transactions/recent?limit=10');
    expect(response1.ok()).toBeTruthy();
    const transactions1 = await response1.json();
    console.log('🧪 REGRESSION: No date param returned:', transactions1.length, 'transactions');
    expect(transactions1.length).toBeGreaterThan(0);
    
    // Test 2: Invalid date format should be handled gracefully
    const response2 = await request.get('http://localhost:3000/api/transactions/recent?limit=10&date=invalid-date');
    expect(response2.ok()).toBeTruthy();
    const transactions2 = await response2.json();
    console.log('🧪 REGRESSION: Invalid date param returned:', transactions2.length, 'transactions');
    
    // Test 3: Future date should return empty result
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    
    const response3 = await request.get(`http://localhost:3000/api/transactions/recent?limit=10&date=${futureDateStr}`);
    expect(response3.ok()).toBeTruthy();
    const transactions3 = await response3.json();
    console.log('🧪 REGRESSION: Future date param returned:', transactions3.length, 'transactions');
    expect(transactions3.length).toBe(0);
  });
});
