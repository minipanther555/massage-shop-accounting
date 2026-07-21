const crypto = require('crypto');
const express = require('express');

const router = express.Router();
const database = require('../models/database');
const { getBusinessDay } = require('../utils/business-day');
const { getTimeWindowQuote } = require('../services/time-window-promotion-service');
const {
  BOOKING_CREDIT_AMOUNT,
  calculateScheduledEnd,
  createBookingId,
  hasBookingConflict,
  isBookingCreditEligible,
  normalizeBookingStart
} = require('../services/booking-service');

// Get all transactions (with pagination and filtering)
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 50, date, status
    } = req.query; // Removed default 'ACTIVE'
    const offset = (page - 1) * limit;

    let sql = `SELECT t.*, COALESCE(bc.amount, 0) AS booking_credit_amount
               FROM transactions t
               LEFT JOIN booking_credits bc
                 ON bc.transaction_id = t.transaction_id AND bc.status = 'ACTIVE'`;
    const params = [];
    const conditions = [];

    if (status && status.toLowerCase() !== 'all') {
      conditions.push('t.status = ?');
      params.push(status);
    }

    if (date) {
      conditions.push('t.date = ?');
      params.push(date);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY datetime(t.timestamp) DESC, t.id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit, 10), offset);

    const transactions = await database.all(sql, params);

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM transactions t';
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

    let sql = `SELECT t.*, COALESCE(bc.amount, 0) AS booking_credit_amount
               FROM transactions t
               LEFT JOIN booking_credits bc
                 ON bc.transaction_id = t.transaction_id AND bc.status = 'ACTIVE'
               WHERE (t.status = 'ACTIVE' OR t.status = 'CORRECTED' OR t.status LIKE 'EDITED%')`;
    const params = [];

    if (date) {
      sql += ` AND t.date = ?`;
      params.push(date);
      console.log('🔍 [RECENT] Added date filter for:', date);
    }

    sql += ` ORDER BY datetime(t.timestamp) DESC, t.id DESC LIMIT ?`;
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
router.post('/quote', async (req, res) => {
  try {
    const {
      service_type: serviceType,
      location,
      duration,
      time_window_promotion_override: manualOverride = false
    } = req.body;
    if (!serviceType || !location || !duration) {
      return res.status(400).json({ error: 'service_type, location, and duration are required' });
    }
    const quote = await getTimeWindowQuote(database, {
      serviceType,
      location,
      duration,
      manualOverride: manualOverride === true
    });
    if (!quote) return res.status(400).json({ error: 'Selected service is not active' });
    return res.json(quote);
  } catch (error) {
    console.error('Error quoting transaction promotion:', error);
    return res.status(500).json({ error: 'Failed to quote transaction promotion' });
  }
});

router.post('/', async (req, res) => {
  console.log('--- [TX CREATE] Received POST request to /api/transactions ---');
  let dbTransactionStarted = false;
  try {
    let {
      masseuse_name: masseuseName,
      service_type: serviceType,
      location,
      duration,
      payment_method: paymentMethod,
      start_time: startTime,
      end_time: endTime,
      customer_contact: customerContact = '',
      corrected_transaction_id: originalTransactionId = null,
      booking_id: bookingId = null,
      requested_staff_booking: requestedStaffBooking = false,
      start_datetime: startDateTime = null,
      end_datetime: endDateTime = null,
      time_window_promotion_override: manualTimeWindowPromotionOverride = false
    } = req.body;
    console.log('[TX CREATE - STEP 1] Request body destructured:', req.body);

    let booking = null;
    if (bookingId) {
      booking = await database.get('SELECT * FROM bookings WHERE booking_id = ?', [bookingId]);
      if (!booking) return res.status(404).json({ error: 'Booking not found' });

      const isCorrectionOfCompletedBooking = originalTransactionId
        && booking.status === 'COMPLETED'
        && booking.transaction_id === originalTransactionId;
      if (booking.status !== 'BOOKED' && !isCorrectionOfCompletedBooking) {
        return res.status(409).json({ error: 'Booking has already been completed or closed' });
      }

      serviceType = booking.service_type;
      location = booking.location;
      duration = booking.duration;
      customerContact = booking.customer_contact || customerContact;
      startDateTime = booking.scheduled_start;
      endDateTime = booking.scheduled_end;
      startTime = startTime || booking.scheduled_start;
      endTime = endTime || booking.scheduled_end;
      if (booking.requested_masseuse_name) {
        masseuseName = booking.requested_masseuse_name;
      }
    }

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
    const promotion = await getTimeWindowQuote(database, {
      serviceType,
      location,
      duration,
      manualOverride: manualTimeWindowPromotionOverride === true
    });
    if (!promotion) {
      return res.status(400).json({ error: 'Selected service is not active' });
    }
    console.log(`[TX CREATE - STEP 4] Service found: Price=${service.price}, Fee=${service.masseuse_fee}`);

    if (requestedStaffBooking) {
      if (bookingId || originalTransactionId) {
        return res.status(400).json({ error: 'Immediate requested-staff booking cannot reuse another booking or correction' });
      }
      const immediateStart = normalizeBookingStart(new Date().toISOString());
      startDateTime = immediateStart;
      endDateTime = calculateScheduledEnd(immediateStart, Number(duration));
      bookingId = createBookingId();
      booking = {
        booking_id: bookingId,
        scheduled_start: startDateTime,
        scheduled_end: endDateTime,
        service_type: serviceType,
        location,
        duration: Number(duration),
        requested_masseuse_name: masseuseName,
        customer_contact: customerContact,
        status: 'BOOKED'
      };
    }

    if (startDateTime && endDateTime) {
      const blockingBookings = await database.all(
        `SELECT booking_id, scheduled_start, scheduled_end
         FROM bookings
         WHERE status = 'BOOKED'
           AND requested_masseuse_name = ?
           AND booking_id != COALESCE(?, '')`,
        [masseuseName, bookingId]
      );
      if (hasBookingConflict(startDateTime, endDateTime, blockingBookings)) {
        return res.status(409).json({
          error: 'This massage would leave less than 15 minutes before or after a booking'
        });
      }
    }

    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();
    const transactionId = `TX-${timestamp.getTime()}-${crypto.randomBytes(3).toString('hex')}`;
    const date = timestampIso.split('T')[0];
    const businessDay = getBusinessDay(timestamp);
    console.log(`[TX CREATE - STEP 5] Generated Transaction ID: ${transactionId}`);

    await database.run('BEGIN IMMEDIATE TRANSACTION');
    dbTransactionStarted = true;

    if (requestedStaffBooking) {
      await database.run(
        `INSERT INTO bookings (
          booking_id, scheduled_start, scheduled_end, service_type, location,
          duration, requested_masseuse_name, customer_contact, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED')`,
        [
          bookingId, startDateTime, endDateTime, serviceType, location,
          Number(duration), masseuseName, customerContact
        ]
      );
    }

    if (originalTransactionId) {
      console.log(`[TX CREATE - STEP 6a] EDIT MODE DETECTED. Original TX ID: ${originalTransactionId}`);
      const originalTransaction = await database.get(
        'SELECT masseuse_fee, masseuse_name, booking_id FROM transactions WHERE transaction_id = ?',
        [originalTransactionId]
      );

      if (originalTransaction) {
        console.log(`[TX CREATE - STEP 6b] Original transaction found. Reversing fee of ${originalTransaction.masseuse_fee}`);
        await database.run(
          'UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?',
          [originalTransaction.masseuse_fee, originalTransaction.masseuse_name]
        );

        const originalCredit = await database.get(
          `SELECT id, masseuse_name, amount FROM booking_credits
           WHERE transaction_id = ? AND status = 'ACTIVE'`,
          [originalTransactionId]
        );
        if (originalCredit) {
          await database.run(
            `UPDATE booking_credits
             SET status = 'REVERSED', reversed_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [originalCredit.id]
          );
          await database.run(
            'UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?',
            [originalCredit.amount, originalCredit.masseuse_name]
          );
        }

        bookingId = bookingId || originalTransaction.booking_id;

        console.log('[TX CREATE - STEP 6c] Marking original transaction as EDITED.');
        await database.run(
          'UPDATE transactions SET status = ? WHERE transaction_id = ?',
          [`EDITED (Corrected by ${transactionId})`, originalTransactionId]
        );
      }
    }

    console.log('[TX CREATE - STEP 7] Inserting new transaction into database...');
    const result = await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        corrected_from_id, booking_id, start_datetime, end_datetime,
        base_price, discount_amount, promotion_type, promotion_label
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, timestampIso, date, masseuseName, serviceType,
        location, duration, promotion.finalPrice, paymentMethod, service.masseuse_fee,
        startTime, endTime, customerContact,
        originalTransactionId ? 'CORRECTED' : 'ACTIVE', businessDay,
        originalTransactionId, bookingId, startDateTime, endDateTime,
        promotion.basePrice, promotion.discountAmount, promotion.promotionType, promotion.promotionLabel
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

    const creditBooking = booking
      ? { ...booking, status: 'BOOKED' }
      : null;
    if (bookingId && isBookingCreditEligible(creditBooking, masseuseName)) {
      await database.run(
        `INSERT INTO booking_credits (
          booking_id, transaction_id, masseuse_name, amount, status
        ) VALUES (?, ?, ?, ?, 'ACTIVE')`,
        [bookingId, transactionId, masseuseName, BOOKING_CREDIT_AMOUNT]
      );
      await database.run(
        'UPDATE staff SET total_fees_earned = total_fees_earned + ? WHERE name = ?',
        [BOOKING_CREDIT_AMOUNT, masseuseName]
      );
    }

    if (bookingId) {
      await database.run(
        `UPDATE bookings
         SET status = 'COMPLETED', transaction_id = ?, completed_at = CURRENT_TIMESTAMP
         WHERE booking_id = ?`,
        [transactionId, bookingId]
      );
    }

    await database.run('COMMIT');
    dbTransactionStarted = false;

    const newTransaction = await database.get(
      `SELECT t.*, COALESCE(bc.amount, 0) AS booking_credit_amount
       FROM transactions t
       LEFT JOIN booking_credits bc
         ON bc.transaction_id = t.transaction_id AND bc.status = 'ACTIVE'
       WHERE t.id = ?`,
      [result.id]
    );
    console.log('[TX CREATE - STEP 11] Fetching and returning new transaction.');

    res.status(201).json(newTransaction);
  } catch (error) {
    if (dbTransactionStarted) {
      try {
        await database.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back transaction creation:', rollbackError);
      }
    }
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
       ORDER BY datetime(timestamp) DESC, id DESC
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
