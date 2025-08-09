const express = require('express');
const router = express.Router();
const database = require('../models/database');

// Get all services
router.get('/', async (req, res) => {
  try {
    const services = await database.all(
      'SELECT * FROM services WHERE active = true ORDER BY service_name ASC'
    );
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Get all payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const methods = await database.all(
      'SELECT * FROM payment_methods WHERE active = true ORDER BY method_name ASC'
    );
    res.json(methods);
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// Add new service
router.post('/', async (req, res) => {
  try {
    const { service_name, price, masseuse_fee } = req.body;
    
    if (!service_name || !price || !masseuse_fee) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await database.run(
      'INSERT INTO services (service_name, price, masseuse_fee) VALUES (?, ?, ?)',
      [service_name, price, masseuse_fee]
    );
    
    const newService = await database.get(
      'SELECT * FROM services WHERE id = ?',
      [result.id]
    );
    
    res.status(201).json(newService);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Service name already exists' });
    } else {
      console.error('Error creating service:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
});

// Add new payment method
router.post('/payment-methods', async (req, res) => {
  try {
    const { method_name } = req.body;
    
    if (!method_name) {
      return res.status(400).json({ error: 'Missing method_name' });
    }
    
    const result = await database.run(
      'INSERT INTO payment_methods (method_name) VALUES (?)',
      [method_name]
    );
    
    const newMethod = await database.get(
      'SELECT * FROM payment_methods WHERE id = ?',
      [result.id]
    );
    
    res.status(201).json(newMethod);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Payment method already exists' });
    } else {
      console.error('Error creating payment method:', error);
      res.status(500).json({ error: 'Failed to create payment method' });
    }
  }
});

module.exports = router;
