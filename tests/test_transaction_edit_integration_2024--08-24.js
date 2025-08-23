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
}

// Helper function to create a transaction
async function createTransaction(masseuseId, start_time, end_time, original_transaction_id) {
  console.log(`- Creating transaction for masseuse ID: ${masseuseId}...`);
  const transactionData = {
    masseuse_id: masseuseId,
    start_time,
    end_time,
    original_transaction_id
  };
  const response = await apiClient.post('/api/transactions', transactionData);
  assert.strictEqual(response.status, 201, 'Transaction creation failed.');
  return response.data;
}

// Helper function to edit a transaction
async function editTransaction(transactionId, newStartTime, newEndTime) {
  console.log(`- Editing transaction with ID: ${transactionId}...`);
  const response = await apiClient.patch(`/api/transactions/${transactionId}`, {
    start_time: newStartTime,
    end_time: newEndTime
  });
  assert.strictEqual(response.status, 200, 'Transaction edit failed.');
  return response.data;
}

// Helper function to delete a transaction
async function deleteTransaction(transactionId) {
  console.log(`- Deleting transaction with ID: ${transactionId}...`);
  const response = await apiClient.delete(`/api/transactions/${transactionId}`);
  assert.strictEqual(response.status, 200, 'Transaction deletion failed.');
}

// Helper function to fetch all transactions for a staff member
async function fetchAllTransactions(masseuseName) {
  console.log(`- Fetching all transactions for masseuse: ${masseuseName}...`);
  const response = await apiClient.get('/api/transactions?status=all'); // Fetch all, not just active
  assert.strictEqual(response.status, 200, 'Failed to fetch transactions.');
  return response.data;
}

// Helper function to find a transaction by ID
async function findTransactionById(transactions, transactionId) {
  return transactions.find((t) => t.transaction_id === transactionId);
}

// Helper function to verify transaction details
function verifyTransactionDetails(transaction, expectedMasseuseName, expectedStartTime, expectedEndTime, expectedStatus) {
  assert.strictEqual(transaction.masseuse_name, expectedMasseuseName, 'Masseuse name mismatch.');
  assert.strictEqual(transaction.start_time, expectedStartTime, 'Start time mismatch.');
  assert.strictEqual(transaction.end_time, expectedEndTime, 'End time mismatch.');
  assert.strictEqual(transaction.status, expectedStatus, 'Status mismatch.');
}

describe('Transaction Edit Integration Test', () => {
  before(async () => {
    apiClient = await getAuthenticatedClient();
    await createTestStaff();
  });

  it('should successfully edit a transaction', async () => {
    // --- Step 1: Create a transaction ---
    const masseuseId = (await apiClient.get('/api/admin/staff')).data.staff[0].id; // Assuming the first staff member is the masseuse
    const transactionData = {
      masseuse_id: masseuseId,
      start_time: '09:00',
      end_time: '10:00',
      original_transaction_id: null
    };
    const response = await apiClient.post('/api/transactions', transactionData);
    assert.strictEqual(response.status, 201, 'Transaction creation failed.');
    const initialTransaction = response.data;
    console.log(`- Initial transaction created with ID: ${initialTransaction.transaction_id}`);

    // --- Step 2: Edit the transaction ---
    const newStartTime = '09:30';
    const newEndTime = '10:30';
    const editedTransaction = await editTransaction(initialTransaction.transaction_id, newStartTime, newEndTime);
    console.log(`- Transaction edited. New start time: ${editedTransaction.start_time}, New end time: ${editedTransaction.end_time}`);

    // --- Step 3: Verify the edited transaction ---
    const allTransactionsResponse = await fetchAllTransactions(TEST_STAFF_NAME);
    const originalTxAfterEdit = await findTransactionById(allTransactionsResponse.transactions, initialTransaction.transaction_id);
    verifyTransactionDetails(originalTxAfterEdit, TEST_STAFF_NAME, newStartTime, newEndTime, 'active');
    console.log('- Transaction verified after edit.');

    // --- Step 4: Delete the transaction ---
    await deleteTransaction(initialTransaction.transaction_id);
    console.log('- Transaction deleted.');

    // --- Step 5: Verification - Fetch all transactions for the test staff ---
    console.log('- Fetching transactions to verify results...');
    const allTransactionsResponseAfterDelete = await apiClient.get('/api/transactions?status=all'); // Fetch all, not just active
    const staffTransactionsAfterDelete = allTransactionsResponseAfterDelete.data.transactions.filter((t) => t.masseuse_name === TEST_STAFF_NAME);

    const originalTxAfterEditAfterDelete = staffTransactionsAfterDelete.find((t) => t.transaction_id === initialTransaction.transaction_id);
    assert.strictEqual(originalTxAfterEditAfterDelete, undefined, 'Transaction should have been deleted.');
    console.log('- Transaction verified after deletion.');

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
  });
});
