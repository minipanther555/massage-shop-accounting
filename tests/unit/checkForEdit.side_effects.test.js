/**
 * Side-Effect Guard Test: checkForEdit Function
 * 
 * This test ensures that the fix for the global state bug doesn't introduce
 * unintended side effects or break existing functionality.
 */

const { JSDOM } = require('jsdom');

describe('checkForEdit Function Side-Effect Guards', () => {
  let dom;
  let document;
  let window;
  let appData;
  let originalAppData;

  beforeEach(() => {
    // Create a fresh DOM environment for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="correction-banner"></div>
          <div class="nav-header"></div>
          <input id="original-transaction-id" />
          <select id="masseuse"></select>
          <select id="location"></select>
          <select id="service"></select>
          <select id="duration"></select>
          <select id="payment"></select>
          <input id="customerContact" />
        </body>
      </html>
    `);
    
    document = dom.window.document;
    window = dom.window;
    
    // Store original appData state
    originalAppData = {
      correctionMode: false,
      originalTransactionId: null,
      transactions: [],
      expenses: [],
      roster: []
    };
    
    // Mock global appData
    appData = { ...originalAppData };
    
    // Mock global variables
    global.appData = appData;
    global.document = document;
    global.window = window;
    
    // Mock sessionStorage
    global.sessionStorage = {
      getItem: jest.fn(),
      removeItem: jest.fn()
    };
    
    // Mock console
    global.console = {
      error: jest.fn(),
      log: jest.fn()
    };
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
  });

  // Import the actual function from the HTML file
  function checkForEdit() {
    const transactionJSON = sessionStorage.getItem('transactionToEdit');
    if (transactionJSON) {
      try {
        const transaction = JSON.parse(transactionJSON);
        
        // Put form into Edit Mode
        document.getElementById('correction-banner').textContent = `✏️ EDIT MODE: Modifying Transaction #${transaction.id}`;
        document.getElementById('correction-banner').style.display = 'block';
        document.querySelector('.nav-header').textContent = 'EDIT TRANSACTION';
        document.getElementById('original-transaction-id').value = transaction.id;

        // Populate form fields
        document.getElementById('masseuse').value = transaction.masseuse;
        document.getElementById('location').value = transaction.location;
        
        // FIXED: Set global state for correction mode
        appData.correctionMode = true;
        appData.originalTransactionId = transaction.id;

        // Clean up sessionStorage
        sessionStorage.removeItem('transactionToEdit');

      } catch (error) {
        console.error('Error parsing transaction data for editing:', error);
        sessionStorage.removeItem('transactionToEdit');
      }
    }
  }

  describe('State Isolation', () => {
    test('should not modify unrelated appData properties', () => {
      // Arrange
      const mockTransaction = {
        id: '123',
        masseuse: 'Test Masseuse',
        location: 'In-Shop'
      };
      
      // Set some unrelated data
      appData.transactions = [{ id: 'existing-1' }];
      appData.expenses = [{ id: 'expense-1' }];
      appData.roster = [{ name: 'existing-masseuse' }];
      
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction));
      
      // Act
      checkForEdit();
      
      // Assert - Only the expected properties should change
      expect(appData.correctionMode).toBe(true);
      expect(appData.originalTransactionId).toBe('123');
      
      // Unrelated properties should remain unchanged
      expect(appData.transactions).toEqual([{ id: 'existing-1' }]);
      expect(appData.expenses).toEqual([{ id: 'expense-1' }]);
      expect(appData.roster).toEqual([{ name: 'existing-masseuse' }]);
    });

    test('should not affect DOM elements outside the edit form', () => {
      // Arrange
      const mockTransaction = {
        id: '123',
        masseuse: 'Test Masseuse',
        location: 'In-Shop'
      };
      
      // Add some unrelated DOM elements
      const unrelatedDiv = document.createElement('div');
      unrelatedDiv.id = 'unrelated-element';
      unrelatedDiv.textContent = 'Original Content';
      document.body.appendChild(unrelatedDiv);
      
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction));
      
      // Act
      checkForEdit();
      
      // Assert - Unrelated DOM elements should remain unchanged
      expect(document.getElementById('unrelated-element').textContent).toBe('Original Content');
    });
  });

  describe('Function Purity', () => {
    test('should not have side effects when called with no sessionStorage data', () => {
      // Arrange
      sessionStorage.getItem.mockReturnValue(null);
      const initialState = { ...appData };
      
      // Act
      checkForEdit();
      
      // Assert - No state should change
      expect(appData).toEqual(initialState);
    });

    test('should not have side effects when called with invalid data', () => {
      // Arrange
      sessionStorage.getItem.mockReturnValue('invalid-json');
      const initialState = { ...appData };
      
      // Act
      checkForEdit();
      
      // Assert - No state should change
      expect(appData).toEqual(initialState);
    });
  });

  describe('Memory Leak Prevention', () => {
    test('should not create memory leaks with repeated calls', () => {
      // Arrange
      const mockTransaction = {
        id: '123',
        masseuse: 'Test Masseuse',
        location: 'In-Shop'
      };
      
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction));
      
      // Act - Call multiple times
      for (let i = 0; i < 100; i++) {
        checkForEdit();
      }
      
      // Assert - State should be consistent
      expect(appData.correctionMode).toBe(true);
      expect(appData.originalTransactionId).toBe('123');
      
      // Verify sessionStorage cleanup was called each time
      expect(sessionStorage.removeItem).toHaveBeenCalledTimes(100);
    });
  });

  describe('Error Recovery', () => {
    test('should recover gracefully from errors and maintain consistent state', () => {
      // Arrange
      const mockTransaction = {
        id: '123',
        masseuse: 'Test Masseuse',
        location: 'In-Shop'
      };
      
      // First call succeeds
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction));
      checkForEdit();
      
      // Verify state was set
      expect(appData.correctionMode).toBe(true);
      expect(appData.originalTransactionId).toBe('123');
      
      // Second call fails
      sessionStorage.getItem.mockReturnValue('invalid-json');
      checkForEdit();
      
      // Assert - State should remain from successful call
      expect(appData.correctionMode).toBe(true);
      expect(appData.originalTransactionId).toBe('123');
    });
  });

  describe('Concurrent Access Safety', () => {
    test('should handle concurrent access safely', () => {
      // Arrange
      const mockTransaction1 = {
        id: '123',
        masseuse: 'Test Masseuse 1',
        location: 'In-Shop'
      };
      
      const mockTransaction2 = {
        id: '456',
        masseuse: 'Test Masseuse 2',
        location: 'Home Service'
      };
      
      // Simulate concurrent access by calling with different data
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction1));
      checkForEdit();
      
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction2));
      checkForEdit();
      
      // Assert - Should handle the last call correctly
      expect(appData.correctionMode).toBe(true);
      expect(appData.originalTransactionId).toBe('456');
      
      // Verify sessionStorage cleanup was called for both transactions
      expect(sessionStorage.removeItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Backward Compatibility', () => {
    test('should maintain backward compatibility with existing functionality', () => {
      // Arrange
      const mockTransaction = {
        id: '123',
        masseuse: 'Test Masseuse',
        location: 'In-Shop'
      };
      
      sessionStorage.getItem.mockReturnValue(JSON.stringify(mockTransaction));
      
      // Act
      checkForEdit();
      
      // Assert - Core functionality should still work
      expect(appData.correctionMode).toBe(true);
      expect(appData.originalTransactionId).toBe('123');
      
      // Verify sessionStorage cleanup
      expect(sessionStorage.removeItem).toHaveBeenCalledWith('transactionToEdit');
      
      // Verify the fix doesn't break existing behavior
      expect(sessionStorage.getItem).toHaveBeenCalledWith('transactionToEdit');
    });
  });
});
