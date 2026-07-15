const express = require('express');

const database = require('../models/database');
const {
  BOOKING_BUFFER_MINUTES,
  calculateScheduledEnd,
  canFinishBeforeBooking,
  createBookingId,
  hasBookingConflict,
  normalizeBookingStart,
  parseTimestamp
} = require('../services/booking-service');

const router = express.Router();

router.get('/upcoming', async (req, res) => {
  try {
    const bookings = await database.all(
      `SELECT * FROM bookings
       WHERE status = 'BOOKED' AND datetime(scheduled_end) >= datetime(?)
       ORDER BY scheduled_start ASC`,
      [new Date().toISOString()]
    );
    return res.json(bookings);
  } catch (error) {
    console.error('Failed to load upcoming bookings:', error);
    return res.status(500).json({ error: 'Failed to load upcoming bookings' });
  }
});

router.get('/availability', async (req, res) => {
  try {
    const { masseuse_name: masseuseName, massage_end: massageEnd } = req.query;
    if (!masseuseName || !massageEnd) {
      return res.status(400).json({ error: 'masseuse_name and massage_end are required' });
    }

    parseTimestamp(massageEnd, 'massage_end');
    const nextBooking = await database.get(
      `SELECT booking_id, scheduled_start, scheduled_end
       FROM bookings
       WHERE status = 'BOOKED'
         AND requested_masseuse_name = ?
         AND datetime(scheduled_start) >= datetime(?)
       ORDER BY scheduled_start ASC
       LIMIT 1`,
      [masseuseName, new Date().toISOString()]
    );

    return res.json({
      available: !nextBooking || canFinishBeforeBooking(massageEnd, nextBooking.scheduled_start),
      buffer_minutes: BOOKING_BUFFER_MINUTES,
      next_booking: nextBooking || null
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:bookingId', async (req, res) => {
  try {
    const booking = await database.get(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [req.params.bookingId]
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    return res.json(booking);
  } catch (error) {
    console.error('Failed to load booking:', error);
    return res.status(500).json({ error: 'Failed to load booking' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      scheduled_start: scheduledStart,
      service_type: serviceType,
      location,
      duration,
      requested_masseuse_name: requestedMasseuseName = null,
      customer_contact: customerContact = ''
    } = req.body;

    if (!scheduledStart || !serviceType || !location || !duration) {
      return res.status(400).json({
        error: 'scheduled_start, service_type, location, and duration are required'
      });
    }

    if (String(customerContact).length > 100) {
      return res.status(400).json({ error: 'customer_contact must be 100 characters or fewer' });
    }

    const normalizedStart = normalizeBookingStart(scheduledStart);

    const service = await database.get(
      `SELECT id FROM services
       WHERE service_name = ? AND duration_minutes = ? AND location = ? AND active = true`,
      [serviceType, Number(duration), location]
    );
    if (!service) return res.status(400).json({ error: 'Selected service is not available' });

    if (requestedMasseuseName) {
      const staff = await database.get(
        'SELECT id FROM staff WHERE name = ? AND active = true',
        [requestedMasseuseName]
      );
      if (!staff) return res.status(400).json({ error: 'Requested staff member is not active' });
    }

    const scheduledEnd = calculateScheduledEnd(normalizedStart, Number(duration));
    if (requestedMasseuseName) {
      const existingBookings = await database.all(
        `SELECT scheduled_start, scheduled_end
         FROM bookings
         WHERE requested_masseuse_name = ? AND status = 'BOOKED'`,
        [requestedMasseuseName]
      );
      if (hasBookingConflict(normalizedStart, scheduledEnd, existingBookings)) {
        return res.status(409).json({
          error: 'Requested staff member does not have the required 15-minute gap'
        });
      }
    }

    const bookingId = createBookingId();
    const result = await database.run(
      `INSERT INTO bookings (
        booking_id, scheduled_start, scheduled_end, service_type, location,
        duration, requested_masseuse_name, customer_contact, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'BOOKED')`,
      [
        bookingId,
        normalizedStart,
        scheduledEnd,
        serviceType,
        location,
        Number(duration),
        requestedMasseuseName || null,
        customerContact
      ]
    );

    const booking = await database.get('SELECT * FROM bookings WHERE id = ?', [result.id]);
    return res.status(201).json({
      ...booking,
      booking_credit_eligible: Boolean(requestedMasseuseName)
    });
  } catch (error) {
    console.error('Failed to create booking:', error);
    return res.status(400).json({ error: error.message || 'Failed to create booking' });
  }
});

router.post('/:bookingId/status', async (req, res) => {
  const allowedStatuses = new Set(['CANCELLED', 'NO_SHOW']);
  const { status } = req.body;
  if (!allowedStatuses.has(status)) {
    return res.status(400).json({ error: 'Status must be CANCELLED or NO_SHOW' });
  }

  try {
    const result = await database.run(
      `UPDATE bookings
       SET status = ?, cancelled_at = CURRENT_TIMESTAMP
       WHERE booking_id = ? AND status = 'BOOKED'`,
      [status, req.params.bookingId]
    );
    if (!result.changes) return res.status(409).json({ error: 'Booking is not active' });
    return res.json(await database.get(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [req.params.bookingId]
    ));
  } catch (error) {
    console.error('Failed to update booking:', error);
    return res.status(500).json({ error: 'Failed to update booking' });
  }
});

module.exports = router;
