const express = require('express');
const router = express.Router();
const database = require('../models/database');

// Middleware to check if user is authenticated and has manager role
const requireManagerAuth = (req, res, next) => {
  // For now, we'll use a simple check - in production this should use JWT tokens
  // This will be enhanced when we integrate with the existing auth system
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // TODO: Implement proper JWT token validation for manager role
  next();
};

// GET /api/payment-types - List all payment types
router.get('/', async (req, res) => {
  try {
    const paymentTypes = await database.all(
      'SELECT * FROM payment_methods ORDER BY method_name ASC'
    );
    res.json(paymentTypes);
  } catch (error) {
    console.error('Error fetching payment types:', error);
    res.status(500).json({ error: 'Failed to fetch payment types' });
  }
});

// POST /api/payment-types - Create new payment type
router.post('/', requireManagerAuth, async (req, res) => {
  try {
    const { method_name, description } = req.body;
    
    // Validation
    if (!method_name || method_name.trim() === '') {
      return res.status(400).json({ error: 'Payment method name is required' });
    }
    
    // Check if payment method already exists
    const existing = await database.get(
      'SELECT id FROM payment_methods WHERE method_name = ?',
      [method_name.trim()]
    );
    
    if (existing) {
      return res.status(409).json({ error: 'Payment method already exists' });
    }
    
    // Insert new payment method
    const result = await database.run(
      'INSERT INTO payment_methods (method_name, description, active, created_at) VALUES (?, ?, ?, ?)',
      [method_name.trim(), description || null, true, new Date().toISOString()]
    );
    
    // Fetch the newly created payment method
    const newPaymentType = await database.get(
      'SELECT * FROM payment_methods WHERE id = ?',
      [result.id]
    );
    
    console.log(`✅ New payment type created: ${method_name}`);
    res.status(201).json(newPaymentType);
  } catch (error) {
    console.error('Error creating payment type:', error);
    res.status(500).json({ error: 'Failed to create payment type' });
  }
});

// PUT /api/payment-types/:id - Update existing payment type
router.put('/:id', requireManagerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { method_name, description, active } = req.body;
    
    // Validation
    if (!method_name || method_name.trim() === '') {
      return res.status(400).json({ error: 'Payment method name is required' });
    }
    
    // Check if payment method exists
    const existing = await database.get(
      'SELECT id FROM payment_methods WHERE id = ?',
      [id]
    );
    
    if (!existing) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    // Check if new name conflicts with existing payment methods (excluding current one)
    const nameConflict = await database.get(
      'SELECT id FROM payment_methods WHERE method_name = ? AND id != ?',
      [method_name.trim(), id]
    );
    
    if (nameConflict) {
      return res.status(409).json({ error: 'Payment method name already exists' });
    }
    
    // Update payment method
    await database.run(
      'UPDATE payment_methods SET method_name = ?, description = ?, active = ?, updated_at = ? WHERE id = ?',
      [method_name.trim(), description || null, active !== undefined ? active : true, new Date().toISOString(), id]
    );
    
    // Fetch the updated payment method
    const updatedPaymentType = await database.get(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    
    console.log(`✅ Payment type updated: ${method_name}`);
    res.json(updatedPaymentType);
  } catch (error) {
    console.error('Error updating payment type:', error);
    res.status(500).json({ error: 'Failed to update payment type' });
  }
});

// DELETE /api/payment-types/:id - Soft delete payment type
router.delete('/:id', requireManagerAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if payment method exists
    const existing = await database.get(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    
    if (!existing) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    // Check if payment method is being used in transactions
    const usageCount = await database.get(
      'SELECT COUNT(*) as count FROM transactions WHERE payment_method = ?',
      [existing.method_name]
    );
    
    if (usageCount.count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete payment method that is being used in transactions',
        usageCount: usageCount.count
      });
    }
    
    // Soft delete by setting active to false
    await database.run(
      'UPDATE payment_methods SET active = ?, updated_at = ? WHERE id = ?',
      [false, new Date().toISOString(), id]
    );
    
    console.log(`✅ Payment type soft deleted: ${existing.method_name}`);
    res.json({ 
      message: 'Payment type deleted successfully',
      deletedPaymentType: existing.method_name
    });
  } catch (error) {
    console.error('Error deleting payment type:', error);
    res.status(500).json({ error: 'Failed to delete payment type' });
  }
});

// GET /api/payment-types/:id - Get single payment type
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const paymentType = await database.get(
      'SELECT * FROM payment_methods WHERE id = ?',
      [id]
    );
    
    if (!paymentType) {
      return res.status(404).json({ error: 'Payment method not found' });
    }
    
    res.json(paymentType);
  } catch (error) {
    console.error('Error fetching payment type:', error);
    res.status(500).json({ error: 'Failed to fetch payment type' });
  }
});

module.exports = router;
