const express = require('express');
const router = express.Router();
const database = require('../models/database');

// Get all transactions (with pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, date, status = 'ACTIVE' } = req.query;
    const offset = (page - 1) * limit;
    
    let sql = 'SELECT * FROM transactions WHERE status = ?';
    let params = [status];
    
    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);
    
    const transactions = await database.all(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM transactions WHERE status = ?';
    let countParams = [status];
    if (date) {
      countSql += ' AND date = ?';
      countParams.push(date);
    }
    
    const { total } = await database.get(countSql, countParams);
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// Get recent transactions (for dashboard)
router.get('/recent', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const transactions = await database.all(
      `SELECT * FROM transactions 
       WHERE status IN ('ACTIVE', 'CORRECTED') 
       ORDER BY timestamp DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ error: 'Failed to fetch recent transactions' });
  }
});

// Create new transaction
router.post('/', async (req, res) => {
  try {
    const {
      masseuse_name,
      service_type,
      location,
      duration,
      payment_method,
      start_time,
      end_time,
      customer_contact = '',
      corrected_transaction_id = null
    } = req.body;

    // Validate required fields
    if (!masseuse_name || !service_type || !location || !duration || !payment_method || !start_time || !end_time) {
      return res.status(400).json({ 
        error: 'Missing required fields: masseuse_name, service_type, location, duration, payment_method, start_time, end_time' 
      });
    }

    // Get service pricing with duration and location filtering
    console.log('🔍 LOOKING FOR SERVICE:', service_type, 'DURATION:', duration, 'LOCATION:', location);
    const service = await database.get(
      'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND duration_minutes = ? AND location = ? AND active = true',
      [service_type, parseInt(duration), location]
    );
    console.log('🔍 FOUND SERVICE:', service);
    console.log('✅ SERVICE LOOKUP SUCCESSFUL:', {
      service_type,
      duration,
      location,
      price: service.price,
      masseuse_fee: service.masseuse_fee
    });

    if (!service) {
      console.log('🚨 SERVICE NOT FOUND - available services:');
      console.log('🚨 LOOKING FOR:', { service_type, duration, location });
      const allServices = await database.all('SELECT service_name, duration_minutes, location, active FROM services WHERE service_name = ?', [service_type]);
      console.log('🚨 ALL SERVICES WITH SAME NAME:', allServices);
      return res.status(400).json({ 
        error: `Service not found: ${service_type} (${duration} minutes, ${location})`,
        availableServices: allServices
      });
    }

    // Generate transaction ID (timestamp-based like Google Sheets version)
    const timestamp = new Date();
    const transaction_id = timestamp.toISOString().replace(/[-:T.]/g, '').slice(0, 17);
    const date = timestamp.toISOString().split('T')[0];

    // Determine status
    const status = corrected_transaction_id 
      ? `CORRECTED (Original: ${corrected_transaction_id})` 
      : 'ACTIVE';

    // Insert transaction
    const result = await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        payment_amount, payment_method, masseuse_fee, start_time, end_time,
        customer_contact, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction_id, timestamp, date, masseuse_name, service_type,
        service.price, payment_method, service.masseuse_fee, start_time, end_time,
        customer_contact, status
      ]
    );

    // Update staff total fees earned
    await database.run(
      `UPDATE staff_roster 
       SET total_fees_earned = total_fees_earned + ?,
           last_updated = CURRENT_TIMESTAMP
       WHERE masseuse_name = ?`,
      [service.masseuse_fee, masseuse_name]
    );

    // If this is a correction, mark original as VOID
    if (corrected_transaction_id) {
      await database.run(
        'UPDATE transactions SET status = ? WHERE transaction_id = ?',
        ['VOID', corrected_transaction_id]
      );
    }

    // Get the created transaction
    const newTransaction = await database.get(
      'SELECT * FROM transactions WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Get most recent transaction for correction
router.get('/latest-for-correction', async (req, res) => {
  try {
    const transaction = await database.get(
      `SELECT * FROM transactions 
       WHERE status = 'ACTIVE' 
       ORDER BY timestamp DESC 
       LIMIT 1`
    );

    if (!transaction) {
      return res.status(404).json({ error: 'No recent transactions found to correct' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching latest transaction:', error);
    res.status(500).json({ error: 'Failed to fetch latest transaction' });
  }
});

// Get today's summary
router.get('/summary/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const summary = await database.get(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(payment_amount), 0) as total_revenue,
        COALESCE(SUM(masseuse_fee), 0) as total_fees
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'`,
      [today]
    );

    // Get payment method breakdown
    const paymentBreakdown = await database.all(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(payment_amount) as revenue
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'
       GROUP BY payment_method
       ORDER BY revenue DESC`,
      [today]
    );

    res.json({
      ...summary,
      payment_breakdown: paymentBreakdown
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    res.status(500).json({ error: 'Failed to fetch daily summary' });
  }
});

module.exports = router;
