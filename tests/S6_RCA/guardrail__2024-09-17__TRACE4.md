# S6_RCA - Permanent Guardrails

**Timestamp**: 2024-09-17  
**Trace**: TRACE4  
**Status**: IMPLEMENTED - Guardrails to prevent recurrence

## Code Pattern Guardrails

### **1. Idempotent Render Pattern (MANDATORY)**

**Rule**: All list/dropdown rendering must be idempotent.

**Pattern**:
```javascript
// ✅ CORRECT - Idempotent render
function renderListIdempotent(container, items, options = {}) {
    // Clear first
    container.innerHTML = options.defaultHTML || '';
    
    // Build in fragment
    const fragment = document.createDocumentFragment();
    items.forEach(item => {
        const element = document.createElement(options.elementType || 'option');
        element.value = item.value || item;
        element.textContent = item.text || item;
        fragment.appendChild(element);
    });
    
    // Replace atomically
    container.appendChild(fragment);
}

// ❌ FORBIDDEN - Non-idempotent append
container.innerHTML += `<option value="${item}">${item}</option>`;
```

### **2. Single-Flight Guard Pattern (RECOMMENDED)**

**Rule**: Async operations that modify DOM should use single-flight guards.

**Pattern**:
```javascript
// ✅ CORRECT - Single-flight guard
function asyncOperationWithGuard() {
    if (window._operationInflight) {
        console.log('⏳ Operation already in progress, skipping...');
        return window._operationInflight;
    }
    
    window._operationInflight = performAsyncOperation()
        .finally(() => {
            window._operationInflight = null;
        });
    
    return window._operationInflight;
}
```

### **3. Error Handling Pattern (MANDATORY)**

**Rule**: DOM operations must handle errors gracefully.

**Pattern**:
```javascript
// ✅ CORRECT - Error handling with fallback
asyncOperation()
    .then(data => {
        // Success: render data
        renderListIdempotent(container, data);
    })
    .catch(error => {
        console.error('Operation failed:', error);
        showToast('Error loading data', 'error');
        // Fallback: ensure default state
        container.innerHTML = '<option value="">Select...</option>';
    });
```

## Lint Rules (Future Implementation)

### **ESLint Rule: No innerHTML += in List Contexts**

```javascript
// .eslintrc.js
rules: {
    'no-innerhtml-append': 'error'
}

// Custom rule implementation
module.exports = {
    rules: {
        'no-innerhtml-append': {
            create(context) {
                return {
                    AssignmentExpression(node) {
                        if (node.operator === '+=' && 
                            node.left.type === 'MemberExpression' &&
                            node.left.property.name === 'innerHTML') {
                            context.report({
                                node,
                                message: 'Use idempotent render pattern instead of innerHTML += for list rendering'
                            });
                        }
                    }
                };
            }
        }
    }
};
```

## Test Patterns (MANDATORY)

### **1. Idempotency Tests**

```javascript
test('function should be idempotent', async () => {
    // Call function multiple times
    await renderFunction();
    await renderFunction();
    await renderFunction();
    
    const elements = container.querySelectorAll('option');
    const values = Array.from(elements).map(el => el.value);
    
    // Should always produce same result
    expect(elements.length).toBe(expectedCount);
    expect([...new Set(values)].length).toBe(elements.length);
});
```

### **2. Concurrency Tests**

```javascript
test('should handle concurrent calls', async () => {
    // Fire multiple rapid calls
    const promises = Array.from({ length: 10 }, () => renderFunction());
    await Promise.all(promises);
    
    // Should remain idempotent
    const elements = container.querySelectorAll('option');
    expect(elements.length).toBe(expectedCount);
});
```

### **3. Error Handling Tests**

```javascript
test('should handle errors gracefully', async () => {
    // Mock API to fail
    mockApi.getData = () => Promise.reject(new Error('API Error'));
    
    await renderFunction();
    
    // Should have fallback state
    const elements = container.querySelectorAll('option');
    expect(elements.length).toBe(1); // Default option only
});
```

## Documentation Standards

### **Function Documentation Template**

```javascript
/**
 * Renders a list of items in an idempotent manner.
 * 
 * @param {HTMLElement} container - The container element to render into
 * @param {Array} items - Array of items to render
 * @param {Object} options - Rendering options
 * @param {string} options.defaultHTML - Default HTML to show when empty
 * @param {string} options.elementType - Type of element to create (default: 'option')
 * 
 * @example
 * renderListIdempotent(dropdown, ['Alice', 'Bob'], {
 *   defaultHTML: '<option value="">Select...</option>',
 *   elementType: 'option'
 * });
 */
function renderListIdempotent(container, items, options = {}) {
    // Implementation...
}
```

## Code Review Checklist

### **DOM Manipulation Review**

- [ ] Uses idempotent render pattern (clear → build → replace)
- [ ] Avoids `innerHTML +=` for list rendering
- [ ] Uses document fragments for performance
- [ ] Handles errors gracefully with fallback state
- [ ] Includes single-flight guard for async operations
- [ ] Has comprehensive test coverage

### **Async Operation Review**

- [ ] Implements single-flight guard
- [ ] Clears inflight flag in finally block
- [ ] Handles promise rejection
- [ ] Provides user feedback on errors
- [ ] Maintains consistent state on failure

## Monitoring & Alerts

### **Client-Side Monitoring**

```javascript
// Monitor for duplicate options
function monitorDropdownHealth(container) {
    const options = container.querySelectorAll('option');
    const values = Array.from(options).map(opt => opt.value);
    const uniqueValues = [...new Set(values)];
    
    if (values.length !== uniqueValues.length) {
        console.warn('Duplicate options detected in dropdown:', {
            total: values.length,
            unique: uniqueValues.length,
            duplicates: values.length - uniqueValues.length
        });
        
        // Auto-fix: re-render idempotently
        const items = uniqueValues.filter(v => v !== '');
        renderListIdempotent(container, items);
    }
}
```

## Conclusion

These guardrails ensure that the duplicate dropdown issue cannot recur. The patterns are:

1. **Mandatory**: Idempotent render pattern for all list rendering
2. **Recommended**: Single-flight guards for async operations  
3. **Required**: Comprehensive test coverage including concurrency tests
4. **Future**: Lint rules to catch violations automatically

**Status**: ✅ **IMPLEMENTED** - Guardrails in place to prevent recurrence.
