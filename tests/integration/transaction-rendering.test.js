/**
 * Component Test: Transaction Rendering with EDITED Status Styling
 * 
 * This test isolates the frontend rendering logic that applies styling to edited transactions.
 * It tests the exact same logic used in summary.html without any network or database dependencies.
 */

// Mock the DOM environment for testing
const { JSDOM } = require('jsdom');

describe('Transaction Rendering Component', () => {
  let dom;
  let document;
  let container;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="all-transactions">
            <div class="transaction-item">
              <div>Time</div>
              <div>Service</div>
              <div>Masseuse</div>
              <div>Amount</div>
            </div>
          </div>
        </body>
      </html>
    `);
    
    document = dom.window.document;
    container = document.getElementById('all-transactions');
  });

  // Extract the exact rendering logic from summary.html
  function updateAllTransactions(transactions) {
    const header = container.querySelector('.transaction-item');
    container.innerHTML = '';
    container.appendChild(header);

    if (transactions.length === 0) {
      const div = document.createElement('div');
      div.className = 'empty-state';
      div.innerHTML = '<div class="icon">📋</div><div>No transactions today</div>';
      container.appendChild(div);
      return;
    }

    transactions.forEach((transaction, index) => {
      console.log(`[DEBUG] Rendering transaction ${index}:`, {
        id: transaction.id,
        status: transaction.status,
        hasStatus: !!transaction.status,
        includesEdited: transaction.status && transaction.status.includes('EDITED')
      });

      const div = document.createElement('div');
      div.className = 'transaction-item';
      
      // Check if the transaction has been edited
      if (transaction.status && transaction.status.includes('EDITED')) {
        console.log(`[DEBUG] Adding edited-transaction class to transaction ${index}`);
        div.classList.add('edited-transaction');
      }

      let statusBadge = '';
      if (transaction.status && transaction.status.includes('EDITED')) {
        statusBadge = `<span class="edited-status-badge">(EDITED)</span>`;
      }

      div.innerHTML = `
        <div>${transaction.timestamp}</div>
        <div>${transaction.service} ${statusBadge}</div>
        <div>${transaction.masseuse}</div>
        <div>฿${transaction.paymentAmount.toFixed(2)}</div>
        <div class="btn-group">
          <button onclick="editTransaction('${transaction.id}')" class="btn btn-small btn-secondary" ${transaction.status && transaction.status.includes('EDITED') ? 'disabled' : ''}>✏️ Edit</button>
        </div>
      `;
      
      console.log(`[DEBUG] Final div classes:`, div.className);
      console.log(`[DEBUG] Final div HTML:`, div.innerHTML);
      
      container.appendChild(div);
    });
  }

  test('should apply edited-transaction class to transactions with EDITED status', () => {
    // Arrange: Mock transaction data with one EDITED transaction
    const mockTransactions = [
      {
        id: '1',
        timestamp: '10:00 AM',
        service: 'Thai Massage',
        masseuse: 'พี่วัน',
        paymentAmount: 650,
        status: 'ACTIVE'
      },
      {
        id: '2',
        timestamp: '11:00 AM',
        service: 'Foot Massage',
        masseuse: 'May',
        paymentAmount: 450,
        status: 'EDITED (Corrected by 3)' // This should get styling
      },
      {
        id: '3',
        timestamp: '12:00 PM',
        service: 'Body Scrub',
        masseuse: 'แจ๋ว',
        paymentAmount: 800,
        status: 'CORRECTED'
      }
    ];

    // Act: Render the transactions
    updateAllTransactions(mockTransactions);

    // Assert: Check that the EDITED transaction has the correct class
    const transactionItems = container.querySelectorAll('.transaction-item');
    
    // First item is header, so we skip it
    // Find the transaction with EDITED status by looking for the class
    const editedTransaction = container.querySelector('.transaction-item.edited-transaction');
    const activeTransaction = container.querySelector('.transaction-item:not(.edited-transaction)');
    
    // The EDITED transaction should have the edited-transaction class
    expect(editedTransaction).toBeTruthy();
    expect(editedTransaction.classList.contains('edited-transaction')).toBe(true);
    
    // The ACTIVE transaction should NOT have the edited-transaction class
    expect(activeTransaction).toBeTruthy();
    expect(activeTransaction.classList.contains('edited-transaction')).toBe(false);
  });

  test('should add (EDITED) badge to transactions with EDITED status', () => {
    // Arrange: Mock transaction data
    const mockTransactions = [
      {
        id: '1',
        timestamp: '10:00 AM',
        service: 'Thai Massage',
        masseuse: 'พี่วัน',
        paymentAmount: 650,
        status: 'EDITED (Corrected by 2)'
      }
    ];

    // Act: Render the transactions
    updateAllTransactions(mockTransactions);

    // Assert: Check that the (EDITED) badge is present
    const editedTransaction = container.querySelector('.transaction-item.edited-transaction');
    expect(editedTransaction).toBeTruthy();
    
    const statusBadge = editedTransaction.querySelector('.edited-status-badge');
    expect(statusBadge).toBeTruthy();
    expect(statusBadge.textContent).toBe('(EDITED)');
  });

  test('should disable Edit button for transactions with EDITED status', () => {
    // Arrange: Mock transaction data
    const mockTransactions = [
      {
        id: '1',
        timestamp: '10:00 AM',
        service: 'Thai Massage',
        masseuse: 'พี่วัน',
        paymentAmount: 650,
        status: 'EDITED (Corrected by 2)'
      }
    ];

    // Act: Render the transactions
    updateAllTransactions(mockTransactions);

    // Assert: Check that the Edit button is disabled
    const editedTransaction = container.querySelector('.transaction-item.edited-transaction');
    const editButton = editedTransaction.querySelector('button');
    
    expect(editButton.disabled).toBe(true);
    expect(editButton.textContent).toBe('✏️ Edit');
  });

  test('should enable Edit button for transactions without EDITED status', () => {
    // Arrange: Mock transaction data
    const mockTransactions = [
      {
        id: '1',
        timestamp: '10:00 AM',
        service: 'Thai Massage',
        masseuse: 'พี่วัน',
        paymentAmount: 650,
        status: 'ACTIVE'
      }
    ];

    // Act: Render the transactions
    updateAllTransactions(mockTransactions);

    // Assert: Check that the Edit button is enabled
    // Use a more explicit selector that works in jsdom
    const activeTransaction = container.querySelector('.transaction-item:last-child');
    expect(activeTransaction).toBeTruthy();
    expect(activeTransaction.classList.contains('edited-transaction')).toBe(false);
    
    const editButton = activeTransaction.querySelector('button');
    expect(editButton).toBeTruthy();
    expect(editButton.disabled).toBe(false);
    expect(editButton.textContent).toBe('✏️ Edit');
  });

  test('should handle transactions with undefined status gracefully', () => {
    // Arrange: Mock transaction data with undefined status
    const mockTransactions = [
      {
        id: '1',
        timestamp: '10:00 AM',
        service: 'Thai Massage',
        masseuse: 'พี่วัน',
        paymentAmount: 650,
        status: undefined
      }
    ];

    // Act: Render the transactions
    updateAllTransactions(mockTransactions);

    // Assert: Check that no styling is applied
    const transaction = container.querySelector('.transaction-item:not(:first-child)');
    expect(transaction.classList.contains('edited-transaction')).toBe(false);
    
    const editButton = transaction.querySelector('button');
    expect(editButton.disabled).toBe(false);
  });

  test('should handle empty transaction array', () => {
    // Arrange: Empty transactions array
    const mockTransactions = [];

    // Act: Render the transactions
    updateAllTransactions(mockTransactions);

    // Assert: Check that empty state is shown
    const emptyState = container.querySelector('.empty-state');
    expect(emptyState).toBeTruthy();
    expect(emptyState.textContent).toContain('No transactions today');
  });
});
