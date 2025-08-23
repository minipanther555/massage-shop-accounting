const axios = require('axios');
const assert = require('assert');
const { getAuthenticatedClient } = require('./auth-fixture');

// --- Test Configuration ---
const TEST_STAFF_NAME = `IntegrationTestStaff-${Date.now()}`;
let apiClient; // To hold the authenticated axios instance

// Helper function to create a staff member
async function createTestStaff() {
  console.log(`- Creating test staff member: ${TEST_STAFF_NAME}...`);
  const response = await apiClient.post('/api/admin/staff', { name: TEST_STAFF_NAME });
  assert.strictEqual(response.status, 201, 'Test staff creation failed.');
  console.log(`- Staff member created with ID: ${response.data.id}`);
  return response.data;
}

// Helper function to create a transaction
async function createTransaction(staffName, serviceType, duration, fee, originalId = null) {
  const transactionData = {
    masseuse_name: staffName,
    service_type: serviceType,
    location: 'In-Shop',
    duration,
    payment_method: 'Cash',
    start_time: '14:00',
    end_time: '15:00',
    original_transaction_id: originalId
  };
  const response = await apiClient.post('/api/transactions', transactionData);
  assert.strictEqual(response.status, 201, 'Transaction creation failed.');
  return response.data;
}

async function runIntegrationTest() {
  let testStaff;
  let initialTransaction;

  console.log('--- Running Integration Test for Auditable Transaction Edit ---');

  try {
    // --- Step 1: Setup - Get an authenticated API client ---
    apiClient = await getAuthenticatedClient();

    // --- Step 2: Setup - Create a temporary staff member for the test ---
    testStaff = await createTestStaff();

    // --- Step 3: Create an initial transaction ---
    console.log('- Creating initial transaction...');
    initialTransaction = await createTransaction(TEST_STAFF_NAME, 'Thai Massage', 60, 100.00);
    console.log(`- Initial transaction created with ID: ${initialTransaction.transaction_id}`);

    // --- Step 4: Create the "edited" transaction, linking it to the original ---
    console.log('- Submitting an edited transaction...');
    const editedTransaction = await createTransaction(TEST_STAFF_NAME, 'Thai Massage', 90, 150.00, initialTransaction.transaction_id);
    console.log(`- Edited transaction created with ID: ${editedTransaction.transaction_id}`);

    // --- Step 5: Verification - Fetch all transactions for the test staff ---
    console.log('- Fetching transactions to verify results...');
    const allTransactionsResponse = await apiClient.get('/api/transactions?status=all'); // Fetch all, not just active
    const staffTransactions = allTransactionsResponse.data.transactions.filter((t) => t.masseuse_name === TEST_STAFF_NAME);

    const originalTxAfterEdit = staffTransactions.find((t) => t.transaction_id === initialTransaction.transaction_id);
    const newTxAfterEdit = staffTransactions.find((t) => t.transaction_id === editedTransaction.transaction_id);

    // --- Assertions ---
    console.log('\n--- VERIFICATION ---');

    // 1. Check that two transactions exist for the staff member
    assert.strictEqual(staffTransactions.length, 2, `Expected 2 transactions for staff, but found ${staffTransactions.length}`);
    console.log('✅ SUCCESS: Correct number of transactions (2) found.');

    // 2. Check the status of the original transaction
    assert.ok(originalTxAfterEdit.status.startsWith('EDITED'), `Original transaction status should be 'EDITED', but was '${originalTxAfterEdit.status}'`);
    console.log('✅ SUCCESS: Original transaction status correctly marked as \'EDITED\'.');

    // 3. Check the new transaction's link and status
    assert.strictEqual(newTxAfterEdit.status, 'ACTIVE', `New transaction status should be 'ACTIVE', but was '${newTxAfterEdit.status}'`);
    assert.strictEqual(newTxAfterEdit.corrected_from_id, initialTransaction.transaction_id, 'New transaction is not correctly linked to the original.');
    console.log('✅ SUCCESS: New transaction is ACTIVE and linked to the original.');

    console.log('\n✅ Integration Test Passed');
  } catch (error) {
    console.error('\n--- ❌ TEST FAILED ---');
    if (error.response) {
      console.error('Request failed with status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error(error.message);
    }
    if (error.stack) {
      console.error(error.stack);
    }
  } finally {
    // --- Cleanup ---
    if (testStaff) {
      console.log('\n- Cleaning up created test staff member...');
      try {
        await apiClient.delete(`/api/admin/staff/${testStaff.id}`);
        console.log('- Cleanup successful.');
      } catch (cleanupError) {
        console.error('- Cleanup failed:', cleanupError.response ? cleanupError.response.data : cleanupError.message);
      }
    }
    console.log('--- Test Complete ---');
  }
}

runIntegrationTest();
