const crypto = require('crypto');
const express = require('express');

const router = express.Router();
const database = require('../models/database');
const { getBusinessDay } = require('../utils/business-day');
const { getTimeWindowQuote } = require('../services/time-window-promotion-service');
const { countsAsLiveWork } = require('../services/transaction-status-sql');
const {
  BOOKING_CREDIT_AMOUNT,
  BOOKING_BUFFER_MINUTES,
  hasBookingConflict,
  isBookingCreditEligible,
} = require('../services/booking-service');

async function getCorrectionEligibleStaff(businessDay, excludedTransactionId, now = new Date()) {
  const todayStaff = await database.all(
    `SELECT ts.display_name AS masseuse_name, ts.position,
       (SELECT COUNT(*) FROM transactions t
        WHERE t.business_day = ts.business_day AND t.masseuse_name = ts.display_name
          AND ${countsAsLiveWork('t')} AND t.transaction_id != ?) AS today_massages
     FROM today_staff ts
     WHERE ts.business_day = ? AND ts.removed_at IS NULL`,
    [excludedTransactionId, businessDay]
  );
  const activeTransactions = await database.all(
    `SELECT masseuse_name, timestamp, end_datetime, duration
     FROM transactions
     WHERE business_day = ? AND ${countsAsLiveWork('')} AND transaction_id != ?`,
    [businessDay, excludedTransactionId]
  );
  const bookings = await database.all(
    `SELECT requested_masseuse_name, scheduled_start
     FROM bookings
     WHERE status = 'BOOKED' AND substr(scheduled_start, 1, 10) = ?`,
    [businessDay]
  );
  const nowMs = now.getTime();
  return todayStaff.filter((staff) => {
    const busy = activeTransactions.some((transaction) => transaction.masseuse_name === staff.masseuse_name
      && Date.parse(transaction.end_datetime || transaction.timestamp) + (transaction.end_datetime ? 0 : Number(transaction.duration) * 60000) > nowMs);
    const constrainedByBooking = bookings.some((booking) => booking.requested_masseuse_name === staff.masseuse_name
      && Date.parse(booking.scheduled_start) - (BOOKING_BUFFER_MINUTES * 60000) < nowMs);
    return !busy && !constrainedByBooking;
  }).sort((left, right) => (left.today_massages - right.today_massages) || (left.position - right.position));
}

async function getCorrectionCandidates(businessDay, requestedLimit = 10) {
  const limit = Math.min(Math.max(Number.parseInt(requestedLimit, 10) || 10, 1), 10);
  return database.all(
    `SELECT *
     FROM transactions
     WHERE business_day = ?
       AND status IN ('ACTIVE', 'CORRECTED')
     ORDER BY datetime(timestamp) DESC, id DESC
     LIMIT ?`,
    [businessDay, limit]
  );
}

async function reverseActiveBookingCredit(transactionId) {
  const activeCredit = await database.get(
    `SELECT id, masseuse_name, amount
     FROM booking_credits
     WHERE transaction_id = ? AND status = 'ACTIVE'`,
    [transactionId]
  );
  if (!activeCredit) return null;

  await database.run(
    `UPDATE booking_credits
     SET status = 'REVERSED', reversed_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [activeCredit.id]
  );
  await database.run(
    'UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?',
    [activeCredit.amount, activeCredit.masseuse_name]
  );
  return activeCredit;
}

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

const ADD_ON_KINDS = new Set(['DURATION_UPGRADE', 'ADDITIONAL_SERVICE']);
const PAYMENT_STATUSES = new Set(['PAID', 'PENDING']);

function addMinutesIso(iso, minutes) {
  return new Date(Date.parse(iso) + (Number(minutes) * 60000)).toISOString();
}

/**
 * Derive the add-on's occupied window.
 * A duration upgrade stretches the original session to its new total length; an
 * additional service begins where the original ended. Both are only defaults —
 * an explicit window in the request wins.
 */
function deriveAddOnWindow({ parent, addOnKind, duration, startDateTime, endDateTime }) {
  if (startDateTime && endDateTime) return { startDateTime, endDateTime };

  const parentStart = parent.start_datetime || parent.timestamp;
  const parentEnd = parent.end_datetime || addMinutesIso(parentStart, parent.duration);

  if (addOnKind === 'DURATION_UPGRADE') {
    return {
      startDateTime: startDateTime || parentStart,
      endDateTime: endDateTime || addMinutesIso(parentStart, duration),
    };
  }
  return {
    startDateTime: startDateTime || parentEnd,
    endDateTime: endDateTime || addMinutesIso(parentEnd, duration),
  };
}

// PTE-API-001 — create a paid add-on linked to an original sale.
// The original transaction is never modified; money is always derived server-side.
router.post('/add-ons', async (req, res) => {
  let dbTransactionStarted = false;
  try {
    const {
      parent_transaction_id: parentTransactionId,
      add_on_kind: addOnKind,
      service_type: serviceType,
      location,
      duration,
      payment_method: paymentMethod = null,
      payment_status: paymentStatus = 'PAID',
      masseuse_name: requestedMasseuseName = null,
      customer_contact: customerContact = '',
      start_datetime: requestedStart = null,
      end_datetime: requestedEnd = null,
      time_window_promotion_override: manualOverride = false,
    } = req.body;

    if (!ADD_ON_KINDS.has(addOnKind)) {
      return res.status(400).json({ error: 'add_on_kind must be DURATION_UPGRADE or ADDITIONAL_SERVICE' });
    }
    if (!parentTransactionId || !serviceType || !location || !duration) {
      return res.status(400).json({
        error: 'Missing required fields: parent_transaction_id, service_type, location, duration',
      });
    }
    if (!PAYMENT_STATUSES.has(paymentStatus)) {
      return res.status(400).json({ error: 'payment_status must be PAID or PENDING' });
    }
    if (paymentStatus === 'PAID' && !paymentMethod) {
      return res.status(400).json({ error: 'payment_method is required when the add-on is paid now' });
    }

    const parent = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [parentTransactionId]
    );
    if (!parent) return res.status(404).json({ error: 'Original transaction not found' });
    if (parent.parent_transaction_id) {
      return res.status(400).json({ error: 'An add-on cannot be extended; extend the original transaction instead' });
    }
    if (parent.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'Only an active transaction can be extended' });
    }

    const quote = await getTimeWindowQuote(database, {
      serviceType,
      location,
      duration,
      manualOverride: manualOverride === true,
    });
    if (!quote) return res.status(400).json({ error: 'Selected service is not active' });

    let masseuseName;
    let amountDue;
    let masseuseFee;

    if (addOnKind === 'DURATION_UPGRADE') {
      if (serviceType !== parent.service_type) {
        return res.status(400).json({ error: 'A duration upgrade must keep the same service as the original' });
      }
      if (Number(duration) <= Number(parent.duration)) {
        return res.status(400).json({ error: 'A duration upgrade must be longer than the original duration' });
      }
      // The customer ends up with ONE session of the longer duration, so both the
      // charge and the commission are the difference against what the parent already
      // captured. Subtracting the amount actually paid (not the catalog price) is what
      // keeps a promotional original sale from being overcharged.
      masseuseName = parent.masseuse_name;
      amountDue = Math.max(0, quote.finalPrice - Number(parent.payment_amount));
      masseuseFee = Math.max(0, quote.masseuseFee - Number(parent.masseuse_fee));
    } else {
      // A second, separate service: full price and full commission, nothing subtracted.
      masseuseName = requestedMasseuseName || parent.masseuse_name;
      // A different masseuse must be a real active staff member. Without this the
      // row is still written and `UPDATE staff ... WHERE name = ?` silently matches
      // zero rows, losing the commission with no error anywhere (PTE-009).
      if (masseuseName !== parent.masseuse_name) {
        const performer = await database.get(
          'SELECT id FROM staff WHERE name = ? AND active = 1',
          [masseuseName]
        );
        if (!performer) {
          return res.status(400).json({ error: 'Selected staff member is not an active staff member' });
        }
      }
      amountDue = quote.finalPrice;
      masseuseFee = quote.masseuseFee;
    }

    const { startDateTime, endDateTime } = deriveAddOnWindow({
      parent,
      addOnKind,
      duration,
      startDateTime: requestedStart,
      endDateTime: requestedEnd,
    });

    const timestamp = new Date();
    const timestampIso = timestamp.toISOString();
    const transactionId = `TX-${timestamp.getTime()}-${crypto.randomBytes(3).toString('hex')}`;
    const businessDay = getBusinessDay(timestamp);

    await database.run('BEGIN IMMEDIATE TRANSACTION');
    dbTransactionStarted = true;

    await database.run(
      `INSERT INTO transactions (
        transaction_id, timestamp, date, masseuse_name, service_type,
        location, duration, payment_amount, payment_method, masseuse_fee,
        start_time, end_time, customer_contact, status, business_day,
        start_datetime, end_datetime, base_price, discount_amount,
        promotion_type, promotion_label,
        parent_transaction_id, add_on_kind, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId, timestampIso, timestampIso.split('T')[0], masseuseName, serviceType,
        // `payment_method` is NOT NULL, and a pending add-on genuinely has no method
        // yet — it is recorded empty and filled in when reception settles it.
        location, Number(duration), amountDue, paymentMethod || '', masseuseFee,
        startDateTime, endDateTime, customerContact, businessDay,
        startDateTime, endDateTime, quote.basePrice, quote.discountAmount,
        quote.promotionType, quote.promotionLabel,
        parentTransactionId, addOnKind, paymentStatus,
      ]
    );

    // A pending add-on is work done but money not yet received, so it must not
    // reach staff pay until it is settled (PTE-011 / AC-PTE-014).
    if (paymentStatus === 'PAID') {
      await database.run(
        'UPDATE staff SET total_fees_earned = total_fees_earned + ? WHERE name = ?',
        [masseuseFee, masseuseName]
      );
    }

    await database.run('COMMIT');
    dbTransactionStarted = false;

    const addOn = await database.get(
      'SELECT * FROM transactions WHERE transaction_id = ?',
      [transactionId]
    );

    return res.status(201).json({
      amount_due: amountDue,
      add_on: addOn,
      parent: await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [parentTransactionId]),
    });
  } catch (error) {
    if (dbTransactionStarted) {
      try { await database.run('ROLLBACK'); } catch (rollbackError) {
        console.error('Failed to roll back add-on creation:', rollbackError);
      }
    }
    console.error('Error creating transaction add-on:', error);
    return res.status(500).json({ error: 'Failed to create add-on' });
  }
});

/** Load an add-on row, or return the HTTP failure that should be sent instead. */
async function loadAddOn(transactionId) {
  const addOn = await database.get(
    'SELECT * FROM transactions WHERE transaction_id = ?',
    [transactionId]
  );
  if (!addOn) return { failure: { status: 404, error: 'Add-on not found' } };
  if (!addOn.parent_transaction_id) {
    return { failure: { status: 400, error: 'This transaction is not an add-on' } };
  }
  return { addOn };
}

// PTE-API-002 — settle a pending add-on.
// Rejecting an already-settled add-on is what stops a double submit booking the
// same money twice; the UI guard is not sufficient on its own.
router.post('/add-ons/:transactionId/settle', async (req, res) => {
  let dbTransactionStarted = false;
  try {
    const { payment_method: paymentMethod } = req.body;
    if (!paymentMethod) {
      return res.status(400).json({ error: 'payment_method is required to settle an add-on' });
    }

    const { addOn, failure } = await loadAddOn(req.params.transactionId);
    if (failure) return res.status(failure.status).json({ error: failure.error });

    if (addOn.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'A cancelled add-on cannot be settled' });
    }
    if (addOn.payment_status !== 'PENDING') {
      return res.status(409).json({ error: 'This add-on has already been settled' });
    }

    await database.run('BEGIN IMMEDIATE TRANSACTION');
    dbTransactionStarted = true;

    // Guarded UPDATE: the WHERE clause re-checks PENDING so two concurrent submits
    // cannot both pass the read above and both pay commission.
    const settled = await database.run(
      `UPDATE transactions
       SET payment_status = 'PAID', payment_method = ?, updated_at = CURRENT_TIMESTAMP
       WHERE transaction_id = ? AND payment_status = 'PENDING' AND status = 'ACTIVE'`,
      [paymentMethod, addOn.transaction_id]
    );

    if (!settled.changes) {
      await database.run('ROLLBACK');
      dbTransactionStarted = false;
      return res.status(409).json({ error: 'This add-on has already been settled' });
    }

    await database.run(
      'UPDATE staff SET total_fees_earned = total_fees_earned + ? WHERE name = ?',
      [addOn.masseuse_fee, addOn.masseuse_name]
    );

    await database.run('COMMIT');
    dbTransactionStarted = false;

    return res.json({
      add_on: await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [addOn.transaction_id]),
    });
  } catch (error) {
    if (dbTransactionStarted) {
      try { await database.run('ROLLBACK'); } catch (rollbackError) {
        console.error('Failed to roll back add-on settlement:', rollbackError);
      }
    }
    console.error('Error settling add-on:', error);
    return res.status(500).json({ error: 'Failed to settle add-on' });
  }
});

// PTE-API-003 — cancel an add-on.
// The staff member's occupied window returns to the parent's end plus the buffer
// automatically, because current-status selects the latest-ending ACTIVE row and
// this row stops being ACTIVE.
router.post('/add-ons/:transactionId/cancel', async (req, res) => {
  let dbTransactionStarted = false;
  try {
    const { addOn, failure } = await loadAddOn(req.params.transactionId);
    if (failure) return res.status(failure.status).json({ error: failure.error });

    if (addOn.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'This add-on has already been cancelled' });
    }

    await database.run('BEGIN IMMEDIATE TRANSACTION');
    dbTransactionStarted = true;

    const cancelled = await database.run(
      `UPDATE transactions
       SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP
       WHERE transaction_id = ? AND status = 'ACTIVE'`,
      [addOn.transaction_id]
    );

    if (!cancelled.changes) {
      await database.run('ROLLBACK');
      dbTransactionStarted = false;
      return res.status(409).json({ error: 'This add-on has already been cancelled' });
    }

    // Only money that was actually paid out needs reversing; a pending add-on
    // never reached staff pay in the first place.
    if (addOn.payment_status === 'PAID') {
      await database.run(
        'UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?',
        [addOn.masseuse_fee, addOn.masseuse_name]
      );
    }

    await database.run('COMMIT');
    dbTransactionStarted = false;

    return res.json({
      add_on: await database.get('SELECT * FROM transactions WHERE transaction_id = ?', [addOn.transaction_id]),
    });
  } catch (error) {
    if (dbTransactionStarted) {
      try { await database.run('ROLLBACK'); } catch (rollbackError) {
        console.error('Failed to roll back add-on cancellation:', rollbackError);
      }
    }
    console.error('Error cancelling add-on:', error);
    return res.status(500).json({ error: 'Failed to cancel add-on' });
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
    if ((!masseuseName && !originalTransactionId) || !serviceType || !location || !duration || !paymentMethod || !startTime || !endTime) {
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
      if (originalTransactionId) {
        // A correction stays a normal walk-in even when reception picks a non-next replacement.
        requestedStaffBooking = false;
      } else if (bookingId) {
        return res.status(400).json({ error: 'Immediate requested-staff booking cannot reuse another booking' });
      } else {
        requestedStaffBooking = false;
      }
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
    if (originalTransactionId) {
      const eligibleStaff = await getCorrectionEligibleStaff(businessDay, originalTransactionId, timestamp);
      if (!masseuseName) masseuseName = eligibleStaff[0]?.masseuse_name;
      if (!masseuseName || !eligibleStaff.some((staff) => staff.masseuse_name === masseuseName)) {
        return res.status(409).json({ error: 'Selected replacement staff member is not currently available' });
      }
    }
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

        await reverseActiveBookingCredit(originalTransactionId);

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
    const transaction = (await getCorrectionCandidates(getBusinessDay(new Date()), 1))[0];

    if (!transaction) {
      return res.status(404).json({ error: 'No recent transactions found to correct' });
    }

    res.json(transaction);
  } catch (error) {
    console.error('Error fetching latest transaction:', error);
    res.status(500).json({ error: 'Failed to fetch latest transaction' });
  }
});

// Get up to ten current-business-day transactions that can be corrected.
router.get('/correction-candidates', async (req, res) => {
  try {
    const transactions = await getCorrectionCandidates(getBusinessDay(new Date()), req.query.limit);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching correction candidates:', error);
    res.status(500).json({ error: 'Failed to fetch correction candidates' });
  }
});

router.post('/:transactionId/cancel', async (req, res) => {
  let dbTransactionStarted = false;
  try {
    const { transactionId } = req.params;
    const transaction = await database.get(
      `SELECT transaction_id, status, business_day, masseuse_name, masseuse_fee, booking_id
       FROM transactions
       WHERE transaction_id = ?`,
      [transactionId]
    );

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const currentBusinessDay = getBusinessDay(new Date());
    if (transaction.business_day !== currentBusinessDay) {
      return res.status(409).json({ error: 'Only current-business-day walk-ins can be cancelled' });
    }
    if (transaction.booking_id) {
      return res.status(409).json({ error: 'Booking-backed cancellation is not implemented yet' });
    }
    if (transaction.status !== 'ACTIVE') {
      return res.status(409).json({ error: 'Transaction is not eligible for cancellation' });
    }

    await database.run('BEGIN IMMEDIATE TRANSACTION');
    dbTransactionStarted = true;

    await database.run(
      'UPDATE staff SET total_fees_earned = total_fees_earned - ? WHERE name = ?',
      [transaction.masseuse_fee, transaction.masseuse_name]
    );
    await reverseActiveBookingCredit(transaction.transaction_id);
    const cancelResult = await database.run(
      `UPDATE transactions
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE transaction_id = ? AND status = 'ACTIVE'`,
      ['CANCELLED (Customer left before service)', transaction.transaction_id]
    );
    if (cancelResult.changes !== 1) {
      throw new Error('Cancellation update failed because the transaction was no longer active');
    }

    await database.run('COMMIT');
    dbTransactionStarted = false;

    const cancelledTransaction = await database.get(
      `SELECT t.*, COALESCE(bc.amount, 0) AS booking_credit_amount
       FROM transactions t
       LEFT JOIN booking_credits bc
         ON bc.transaction_id = t.transaction_id AND bc.status = 'ACTIVE'
       WHERE t.transaction_id = ?`,
      [transaction.transaction_id]
    );
    return res.json(cancelledTransaction);
  } catch (error) {
    if (dbTransactionStarted) {
      try {
        await database.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back transaction cancellation:', rollbackError);
      }
    }
    console.error('Error cancelling transaction:', error);
    return res.status(500).json({ error: 'Failed to cancel transaction' });
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
       WHERE date = ? AND ${countsAsLiveWork('')}`,
      [today]
    );

    // Get payment method breakdown
    const paymentBreakdown = await database.all(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(payment_amount) as revenue
       FROM transactions
       WHERE date = ? AND ${countsAsLiveWork('')}
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

// Exposed for test only. `getCorrectionEligibleStaff()` decides two things — the
// default replacement (`eligibleStaff[0]`) and the availability guard (`.some(...)`)
// at :650-655 — but only the guard is reachable over HTTP: `validateInput`
// (backend/server.js:86, backend/middleware/input-validation.js:105-108) rejects a
// POST /api/transactions carrying no `masseuse_name`, correction or not, so the
// default branch never runs and the workload ordering has no HTTP-visible effect.
// The workload filter is still wrong and still has to be right, so it is asserted
// directly. Attaching to the router leaves `module.exports = router` intact.
router.getCorrectionEligibleStaff = getCorrectionEligibleStaff;

module.exports = router;
