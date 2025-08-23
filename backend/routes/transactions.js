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
  console.log('--- [TX CREATE] Received POST request to /api/transactions ---');
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
      original_transaction_id = null
    } = req.body;
    console.log('[TX CREATE - STEP 1] Request body destructured:', req.body);

    // Validate required fields
    if (!masseuse_name || !service_type || !location || !duration || !payment_method || !start_time || !end_time) {
      console.error('[TX CREATE - ERROR] Missing required fields.');
      return res.status(400).json({ 
        error: 'Missing required fields: masseuse_name, service_type, location, duration, payment_method, start_time, end_time' 
      });
    }
    console.log('[TX CREATE - STEP 2] Field validation passed.');

    // Get service pricing with duration and location filtering
    console.log(`[TX CREATE - STEP 3] Looking for service: ${service_type}, Duration: ${duration}, Location: ${location}`);
    const service = await database.get(
      'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND duration_minutes = ? AND location = ? AND active = true',
      [service_type, parseInt(duration), location]
    );
    
    if (!service) {
        console.error('[TX CREATE - ERROR] Service not found in database.');
        return res.status(400).json({ error: `Service not found: ${service_type} (${duration} minutes, ${location})`});
    }
    console.log(`[TX CREATE - STEP 4] Service found: Price=${service.price}, Fee=${service.masseuse_fee}`);

    const timestamp = new Date();
    const transaction_id = timestamp.toISOString().replace(/[-:T.]/g, '').slice(0, 17);
    const date = timestamp.toISOString().split('T')[0];
    console.log(`[TX CREATE - STEP 5] Generated Transaction ID: ${transaction_id}`);

    // --- Start of Edit Logic ---
    if (original_transaction_id) {
        console.log(`[TX CREATE - STEP 6a] EDIT MODE DETECTED. Original TX ID: ${original_transaction_id}`);
        const originalTransaction = await database.get('SELECT masseuse_fee FROM transactions WHERE transaction_id = ?', [original_transaction_id]);
        
        if (originalTransaction) {
            console.log(`[TX CREATE - STEP 6b] Original transaction found. Reversing fee of ${originalTransaction.masseuse_fee}`);
            await database.run(
              `UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?`,
              [originalTransaction.masseuse_fee, masseuse_name]
            );

            console.log(`[TX CREATE - STEP 6c] Marking original transaction as EDITED.`);
            await database.run(
              'UPDATE transactions SET status = ? WHERE transaction_id = ?',
              [`EDITED (Corrected by ${transaction_id})`, original_transaction_id]
            );
        }
    }
    // --- End of Edit Logic ---

    console.log('[TX CREATE - STEP 7] Inserting new transaction into database...');
    const result = await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee, 
        start_time, end_time, status, corrected_from_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, service.price, payment_method, service.masseuse_fee, 
        start_time, end_time, 'ACTIVE', original_transaction_id
      ]
    );
    console.log('[TX CREATE - STEP 8] New transaction inserted successfully.');

    console.log(`[TX CREATE - STEP 9] Updating staff total_fees_earned for ${masseuse_name} with amount ${service.masseuse_fee}`);
    await database.run(
      `UPDATE staff 
       SET total_fees_earned = total_fees_earned + ?
       WHERE name = ?`,
      [service.masseuse_fee, masseuse_name]
    );
    console.log('[TX CREATE - STEP 10] Staff fees updated.');

    const newTransaction = await database.get(
      'SELECT * FROM transactions WHERE id = ?',
      [result.id]
    );
    console.log('[TX CREATE - STEP 11] Fetching and returning new transaction.');

    res.status(201).json(newTransaction);
  } catch (error) {
    console.error('--- [TX CREATE - CATASTROPHIC ERROR] ---');
    console.error(error);
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
