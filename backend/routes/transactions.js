const express = require('express');

const router = express.Router();
const database = require('../models/database');

// Get all transactions (with pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 50, date, status
    } = req.query; // Removed default 'ACTIVE'
    const offset = (page - 1) * limit;

    let sql = 'SELECT * FROM transactions';
    const params = [];
    const conditions = [];

    if (status && status.toLowerCase() !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (date) {
      conditions.push('date = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const transactions = await database.all(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM transactions';
    const countParams = [];
    if (conditions.length > 0) {
      countSql += ` WHERE ${conditions.join(' AND ')}`;
      // Use the same params as the main query, but without the final limit/offset
      countParams.push(...params.slice(0, -2));
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
    const { limit = 5, date } = req.query;
    console.log('🔍 [RECENT] Query params:', { limit, date });

    let sql = `SELECT * FROM transactions 
               WHERE (status = 'ACTIVE' OR status = 'CORRECTED' OR status LIKE 'EDITED%')`;
    const params = [];

    if (date) {
      sql += ` AND date = ?`;
      params.push(date);
      console.log('🔍 [RECENT] Added date filter for:', date);
    }

    sql += ` ORDER BY timestamp ASC LIMIT ?`;
    params.push(parseInt(limit));

    console.log('🔍 [RECENT] Final SQL (raw):', JSON.stringify(sql));
    console.log('🔍 [RECENT] Final params:', params);

    console.log('🔍 [RECENT] Executing SQL with params:', { sql, params });
    const transactions = await database.all(sql, params);
    console.log('🔍 [RECENT] Query returned', transactions.length, 'transactions');
    
    // Log first few results to debug
    if (transactions.length > 0) {
      console.log('🔍 [RECENT] First 3 results:');
      transactions.slice(0, 3).forEach((t, i) => {
        console.log(`🔍 [RECENT] Result ${i + 1}:`, {
          id: t.transaction_id,
          date: t.date,
          status: t.status
        });
      });
    }

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
      masseuse_name: masseuseName,
      service_type: serviceType,
      location,
      duration,
      payment_method: paymentMethod,
      start_time: startTime,
      end_time: endTime,
      customer_contact: customerContact = '',
      corrected_transaction_id: originalTransactionId = null
    } = req.body;
    console.log('[TX CREATE - STEP 1] Request body destructured:', req.body);

    // Validate required fields
    if (!masseuseName || !serviceType || !location || !duration || !paymentMethod || !startTime || !endTime) {
      console.error('[TX CREATE - ERROR] Missing required fields.');
      return res.status(400).json({
        error: 'Missing required fields: masseuse_name, service_type, location, duration, payment_method, start_time, end_time'
      });
    }
    console.log('[TX CREATE - STEP 2] Field validation passed.');

    // Get service pricing with duration and location filtering
    console.log(`[TX CREATE - STEP 3] Looking for service: ${serviceType}, Duration: ${duration}, Location: ${location}`);
    const service = await database.get(
      'SELECT price, masseuse_fee FROM services WHERE service_name = ? AND duration_minutes = ? AND location = ? AND active = true',
      [serviceType, parseInt(duration, 10), location]
    );

    if (!service) {
      console.error('[TX CREATE - ERROR] Service not found in database.');
      return res.status(400).json({ error: `Service not found: ${serviceType} (${duration} minutes, ${location})` });
    }
    console.log(`[TX CREATE - STEP 4] Service found: Price=${service.price}, Fee=${service.masseuse_fee}`);

    const timestamp = new Date();
    const transactionId = timestamp.toISOString().replace(/[-:T.]/g, '').slice(0, 17);
    const date = timestamp.toISOString().split('T')[0];
    console.log(`[TX CREATE - STEP 5] Generated Transaction ID: ${transactionId}`);

    // --- Start of Edit Logic ---
    if (originalTransactionId) {
      console.log(`[TX CREATE - STEP 6a] EDIT MODE DETECTED. Original TX ID: ${originalTransactionId}`);
      const originalTransaction = await database.get('SELECT masseuse_fee FROM transactions WHERE transaction_id = ?', [originalTransactionId]);

      if (originalTransaction) {
        console.log(`[TX CREATE - STEP 6b] Original transaction found. Reversing fee of ${originalTransaction.masseuse_fee}`);
        await database.run(
          'UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?',
          [originalTransaction.masseuse_fee, masseuseName]
        );

        console.log('[TX CREATE - STEP 6c] Marking original transaction as EDITED.');
        await database.run(
          'UPDATE transactions SET status = ? WHERE transaction_id = ?',
          [`EDITED (Corrected by ${transactionId})`, originalTransactionId]
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, timestamp, date, masseuseName, serviceType,
        location, duration, service.price, paymentMethod, service.masseuse_fee,
        startTime, endTime, originalTransactionId ? 'CORRECTED' : 'ACTIVE', originalTransactionId
      ]
    );
    console.log('[TX CREATE - STEP 8] New transaction inserted successfully.');

    console.log(`[TX CREATE - STEP 9] Updating staff total_fees_earned for ${masseuseName} with amount ${service.masseuse_fee}`);
    await database.run(
      `UPDATE staff
       SET total_fees_earned = total_fees_earned + ?
       WHERE name = ?`,
      [service.masseuse_fee, masseuseName]
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

// Fix existing transactions that should be marked as EDITED
router.post('/fix-edited-status', async (req, res) => {
  try {
    console.log('🔧 [TX FIX] === FIXING EDITED STATUS ===');
    
    // Find all transactions with corrected_from_id that are still ACTIVE
    const transactionsToFix = await database.all(
      `SELECT transaction_id, corrected_from_id FROM transactions 
       WHERE corrected_from_id IS NOT NULL AND status = 'ACTIVE'`
    );
    
    console.log('🔧 [TX FIX] Found transactions to fix:', transactionsToFix.length);
    
    let fixedCount = 0;
    for (const tx of transactionsToFix) {
      // Find the CORRECTED transaction that references this one
      const correctedTx = await database.get(
        'SELECT transaction_id FROM transactions WHERE corrected_from_id = ? AND status = "CORRECTED"',
        [tx.transaction_id]
      );
      
      if (correctedTx) {
        console.log(`🔧 [TX FIX] Fixing transaction ${tx.transaction_id} -> EDITED (Corrected by ${correctedTx.transaction_id})`);
        
        await database.run(
          'UPDATE transactions SET status = ? WHERE transaction_id = ?',
          [`EDITED (Corrected by ${correctedTx.transaction_id})`, tx.transaction_id]
        );
        
        fixedCount++;
      }
    }
    
    console.log(`🔧 [TX FIX] Fixed ${fixedCount} transactions`);
    res.json({ 
      message: `Fixed ${fixedCount} transactions`, 
      fixedCount,
      totalFound: transactionsToFix.length 
    });
    
  } catch (error) {
    console.error('❌ [TX FIX] ERROR OCCURRED:', error);
    res.status(500).json({ error: 'Failed to fix edited status' });
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
