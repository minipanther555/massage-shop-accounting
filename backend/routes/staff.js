const express = require('express');

const router = express.Router();
const database = require('../models/database');
const { BOOKING_BUFFER_MINUTES } = require('../services/booking-service');
const { getBusinessDayParts, getNextBusinessDay } = require('../utils/business-day');

function getActor(req) {
  return req.user?.id || req.user?.username || 'system';
}

async function ensureBusinessDay(businessDay) {
  await database.run(
    `INSERT OR IGNORE INTO business_days (business_day, status)
     VALUES (?, 'open')`,
    [businessDay]
  );
}

async function getCurrentBusinessDay(req) {
  const now = req.query?.at ? new Date(req.query.at) : new Date();
  const parts = getBusinessDayParts(now);
  await ensureBusinessDay(parts.currentBusinessDay);
  return parts;
}

async function getActiveTodayStaff(businessDay) {
  return database.all(
    `SELECT
       ts.id,
       ts.position,
       ts.display_name AS masseuse_name,
       ts.queue_status AS status,
       NULL AS busy_until,
       COALESCE((
         SELECT COUNT(*)
         FROM transactions t
         WHERE t.business_day = ts.business_day
           AND t.masseuse_name = ts.display_name
           AND t.status = 'ACTIVE'
       ), 0) AS today_massages,
       ts.added_at AS last_updated,
       ts.staff_id,
       ts.business_day
     FROM today_staff ts
     WHERE ts.business_day = ?
       AND ts.removed_at IS NULL
     ORDER BY ts.position ASC`,
    [businessDay]
  );
}

async function getStaffByIdOrName({ staffId, displayName }) {
  if (staffId) {
    return database.get('SELECT id, name FROM staff WHERE id = ? AND active = 1', [staffId]);
  }
  return database.get('SELECT id, name FROM staff WHERE name = ? AND active = 1', [displayName]);
}

async function setPlanningStatus(businessDay, staffId, status, actor) {
  await database.run(
    `INSERT INTO today_staff_planning (business_day, staff_id, planning_status, updated_by_user_id, updated_at)
     VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
     ON CONFLICT(business_day, staff_id)
     DO UPDATE SET planning_status = excluded.planning_status,
                   updated_by_user_id = excluded.updated_by_user_id,
                   updated_at = CURRENT_TIMESTAMP`,
    [businessDay, staffId, status, actor]
  );
}

async function auditPlanningAction(businessDay, staffId, action, actor, details = {}) {
  await database.run(
    `INSERT INTO today_staff_audit_log (business_day, staff_id, action, actor_user_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [businessDay, staffId || null, action, actor, JSON.stringify(details)]
  );
}

async function addStaffToToday({ businessDay, staffId, displayName, actor }) {
  const staff = await getStaffByIdOrName({ staffId, displayName });
  if (!staff) {
    const error = new Error('Staff member not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = await database.get(
    `SELECT id FROM today_staff
     WHERE business_day = ? AND staff_id = ? AND removed_at IS NULL`,
    [businessDay, staff.id]
  );

  if (!existing) {
    const { next_position: nextPosition } = await database.get(
      `SELECT COALESCE(MAX(position), 0) + 1 AS next_position
       FROM today_staff
       WHERE business_day = ? AND removed_at IS NULL`,
      [businessDay]
    );
    await database.run(
      `INSERT INTO today_staff (business_day, staff_id, display_name, position, queue_status)
       VALUES (?, ?, ?, ?, NULL)`,
      [businessDay, staff.id, staff.name, nextPosition]
    );
  }

  await setPlanningStatus(businessDay, staff.id, 'added_to_today_staff', actor);
  await auditPlanningAction(businessDay, staff.id, 'add_to_today_staff', actor);
  return getActiveTodayStaff(businessDay);
}

async function compactPositions(businessDay) {
  const rows = await database.all(
    `SELECT id FROM today_staff
     WHERE business_day = ? AND removed_at IS NULL
     ORDER BY position ASC, id ASC`,
    [businessDay]
  );

  for (let index = 0; index < rows.length; index += 1) {
    await database.run('UPDATE today_staff SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [index + 1, rows[index].id]);
  }
}

async function resetIfStale(now = new Date(), actor = 'system') {
  const parts = getBusinessDayParts(now);
  const previousDay = parts.previousBusinessDay;
  const previousOpen = await database.get(
    `SELECT business_day FROM business_days
     WHERE business_day = ? AND status = 'open'`,
    [previousDay]
  );

  if (!previousOpen) return { reset: false, business_day: parts.currentBusinessDay };

  await database.run(
    `UPDATE today_staff
     SET removed_at = COALESCE(removed_at, CURRENT_TIMESTAMP),
         removed_reason = COALESCE(removed_reason, 'scheduled_reset'),
         updated_at = CURRENT_TIMESTAMP
     WHERE business_day = ? AND removed_at IS NULL`,
    [previousDay]
  );
  await database.run(
    `UPDATE bookings
     SET status = 'NO_SHOW', cancelled_at = COALESCE(cancelled_at, CURRENT_TIMESTAMP)
     WHERE status = 'BOOKED' AND substr(scheduled_start, 1, 10) = ?`,
    [previousDay]
  );
  await database.run(
    `UPDATE business_days
     SET status = 'reset', reset_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE business_day = ?`,
    [previousDay]
  );
  await ensureBusinessDay(parts.currentBusinessDay);
  await auditPlanningAction(previousDay, null, 'scheduled_visible_reset', actor, { next_business_day: parts.currentBusinessDay });
  return { reset: true, business_day: parts.currentBusinessDay, reset_business_day: previousDay };
}

// Helper function to parse time string to minutes since midnight
function parseTimeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatBangkokTime(timestamp) {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(timestamp));
}

function addMinutes(timestamp, minutes) {
  return new Date(Date.parse(timestamp) + (Number(minutes || 0) * 60000));
}

function minutesUntil(fromTimestamp, toTimestamp) {
  return Math.max(0, Math.ceil((Date.parse(toTimestamp) - Date.parse(fromTimestamp)) / 60000));
}

async function getActiveTransactionByStaff(businessDay) {
  const rows = await database.all(
    `SELECT
       transaction_id,
       masseuse_name,
       timestamp,
       start_datetime,
       end_datetime,
       duration,
       end_time,
       service_type
     FROM transactions
     WHERE business_day = ?
       AND status = 'ACTIVE'
     ORDER BY timestamp DESC`,
    [businessDay]
  );

  const byStaff = new Map();
  rows.forEach((row) => {
    const start = row.start_datetime || row.timestamp;
    const end = row.end_datetime ? new Date(row.end_datetime) : addMinutes(row.timestamp, row.duration);
    const existing = byStaff.get(row.masseuse_name);
    if (!existing || Date.parse(end) > Date.parse(existing.busyEnd)) {
      byStaff.set(row.masseuse_name, { ...row, busyStart: start, busyEnd: end.toISOString() });
    }
  });
  return byStaff;
}

async function getNextBookingByStaff(businessDay) {
  const rows = await database.all(
    `SELECT
       booking_id,
       scheduled_start,
       scheduled_end,
       requested_masseuse_name,
       service_type,
       duration
     FROM bookings
     WHERE status = 'BOOKED'
       AND requested_masseuse_name IS NOT NULL
       AND requested_masseuse_name != ''
       AND substr(scheduled_start, 1, 10) = ?
     ORDER BY scheduled_start ASC`,
    [businessDay]
  );

  const byStaff = new Map();
  rows.forEach((row) => {
    if (!byStaff.has(row.requested_masseuse_name)) {
      byStaff.set(row.requested_masseuse_name, row);
    }
  });
  return byStaff;
}

function buildStatusRow({ staff, nowIso, activeTransaction, nextBooking }) {
  const busyUntilIso = activeTransaction && Date.parse(activeTransaction.busyEnd) > Date.parse(nowIso)
    ? activeTransaction.busyEnd
    : null;
  const busyStartedIso = busyUntilIso ? activeTransaction.busyStart : null;
  const freeAtIso = busyUntilIso
    ? new Date(Date.parse(busyUntilIso) + BOOKING_BUFFER_MINUTES * 60000).toISOString()
    : null;
  const remainingMinutes = busyUntilIso ? minutesUntil(nowIso, busyUntilIso) : 0;
  const bookingStart = nextBooking?.scheduled_start || null;
  const usableMinutesBeforeBooking = bookingStart
    ? Math.max(0, minutesUntil(nowIso, bookingStart) - BOOKING_BUFFER_MINUTES)
    : null;

  let currentState = 'available';
  if (busyUntilIso) {
    currentState = 'busy';
  } else if (usableMinutesBeforeBooking !== null && usableMinutesBeforeBooking < 60) {
    currentState = 'booking_buffer';
  }

  return {
    staff_id: staff.staff_id,
    today_staff_id: staff.id,
    position: staff.position,
    masseuse_name: staff.masseuse_name,
    queue_status: staff.status || null,
    current_state: currentState,
    busy_started: busyStartedIso ? formatBangkokTime(busyStartedIso) : null,
    busy_started_iso: busyStartedIso,
    busy_until: busyUntilIso ? formatBangkokTime(busyUntilIso) : null,
    busy_until_iso: busyUntilIso,
    free_at: freeAtIso ? formatBangkokTime(freeAtIso) : null,
    free_at_iso: freeAtIso,
    remaining_minutes: remainingMinutes,
    today_massages: staff.today_massages || 0,
    assigned_today: (staff.today_massages || 0) + (nextBooking ? 1 : 0),
    next_booking: nextBooking ? {
      booking_id: nextBooking.booking_id,
      scheduled_start: nextBooking.scheduled_start,
      scheduled_end: nextBooking.scheduled_end,
      service_type: nextBooking.service_type,
      duration: nextBooking.duration
    } : null,
    usable_minutes_before_booking: usableMinutesBeforeBooking
  };
}

function markWalkInPriority(statusRows) {
  const eligibleRows = statusRows
    .filter((row) => row.current_state === 'available')
    .sort((a, b) => {
      const workloadDifference = (a.assigned_today || 0) - (b.assigned_today || 0);
      if (workloadDifference !== 0) return workloadDifference;
      return (a.position || 999999) - (b.position || 999999);
    });
  const nextName = eligibleRows[0]?.masseuse_name || null;
  return statusRows.map((row) => ({
    ...row,
    walk_in_priority: Boolean(nextName && row.masseuse_name === nextName)
  }));
}

// Helper function to reset expired busy statuses
async function resetExpiredBusyStatuses() {
  try {
    console.log('🔄 Checking for expired busy statuses...');

    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    console.log(`🕐 Current time: ${currentTime}`);

    // Find all staff with busy status that should be expired
    const busyStaff = await database.all(
      `SELECT * FROM staff_roster 
       WHERE status LIKE 'Busy until %' 
       AND (masseuse_name IS NOT NULL AND masseuse_name != '')`
    );

    console.log(`🔍 Found ${busyStaff.length} staff with busy status`);

    let resetCount = 0;
    for (const staff of busyStaff) {
      if (staff.status && staff.status.startsWith('Busy until ')) {
        // Extract time from status (e.g., "Busy until 15:30" -> "15:30")
        const timeMatch = staff.status.match(/Busy until (.+)/);
        if (timeMatch) {
          const busyUntilTime = timeMatch[1];
          console.log(`🔍 Checking ${staff.masseuse_name}: busy until ${busyUntilTime}`);

          // Convert times to comparable format (HH:MM)
          let normalizedBusyTime = busyUntilTime;

          // Handle different time formats
          if (busyUntilTime.includes('PM') || busyUntilTime.includes('AM')) {
            // Convert "8:34 PM" format to "20:34" format
            const timeParts = busyUntilTime.match(/(\d+):(\d+)\s*(AM|PM)/);
            if (timeParts) {
              let hours = parseInt(timeParts[1]);
              const minutes = timeParts[2];
              const period = timeParts[3];

              if (period === 'PM' && hours !== 12) {
                hours += 12;
              } else if (period === 'AM' && hours === 12) {
                hours = 0;
              }

              normalizedBusyTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
              console.log(`🔄 Converted ${busyUntilTime} to ${normalizedBusyTime}`);
            }
          }

          // Compare times - FIXED: Use numeric comparison instead of string comparison
          const busyMinutes = parseTimeToMinutes(normalizedBusyTime);
          const currentMinutes = parseTimeToMinutes(currentTime);
          const isExpired = busyMinutes <= currentMinutes;
          console.log(`⏰ Time comparison: ${normalizedBusyTime} (${busyMinutes} min) <= ${currentTime} (${currentMinutes} min) = ${isExpired}`);

          if (isExpired) {
            console.log(`🔄 Resetting expired status for ${staff.masseuse_name || 'unnamed staff'}`);

            // Reset to default status (null) and clear busy_until
            await database.run(
              `UPDATE staff_roster 
               SET status = NULL, 
                   busy_until = NULL, 
                   last_updated = CURRENT_TIMESTAMP 
               WHERE position = ?`,
              [staff.position]
            );

            resetCount++;
            console.log(`✅ Reset ${staff.masseuse_name || 'unnamed staff'} status from "${staff.status}" to NULL`);
          }
        }
      }
    }

    if (resetCount > 0) {
      console.log(`🎉 Reset ${resetCount} expired busy statuses`);
    } else {
      console.log('✅ No expired busy statuses found');
    }

    return resetCount;
  } catch (error) {
    console.error('❌ Error resetting expired busy statuses:', error);
    return 0;
  }
}

// Get all staff roster
router.get('/roster', async (req, res) => {
  try {
    console.log('📋 Fetching staff roster...');
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    await resetIfStale(req.query?.at ? new Date(req.query.at) : new Date(), getActor(req));

    // First, reset any expired busy statuses
    const resetCount = await resetExpiredBusyStatuses();
    if (resetCount > 0) {
      console.log(`🔄 Reset ${resetCount} expired statuses before returning roster`);
    }

    const roster = await getActiveTodayStaff(currentBusinessDay);

    console.log(`📋 Retrieved ${roster.length} staff members from roster`);

    console.log('✅ Staff roster fetched and processed successfully');
    res.json(roster);
  } catch (error) {
    console.error('❌ Error fetching staff roster:', error);
    res.status(500).json({ error: 'Failed to fetch staff roster' });
  }
});

router.get('/current-status', async (req, res) => {
  try {
    const now = req.query?.at ? new Date(req.query.at) : new Date();
    if (Number.isNaN(now.getTime())) {
      return res.status(400).json({ error: 'Invalid at timestamp' });
    }
    const nowIso = now.toISOString();
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const todayStaff = await getActiveTodayStaff(currentBusinessDay);
    const activeByStaff = await getActiveTransactionByStaff(currentBusinessDay);
    const bookingByStaff = await getNextBookingByStaff(currentBusinessDay);
    const statusRows = todayStaff.map((staff) => buildStatusRow({
      staff,
      nowIso,
      activeTransaction: activeByStaff.get(staff.masseuse_name),
      nextBooking: bookingByStaff.get(staff.masseuse_name)
    }));
    const priorityRows = markWalkInPriority(statusRows);
    const statusPriority = { busy: 0, booking_buffer: 1, available: 2 };
    priorityRows.sort((a, b) => {
      const stateDifference = (statusPriority[a.current_state] ?? 9) - (statusPriority[b.current_state] ?? 9);
      if (stateDifference !== 0) return stateDifference;
      if (a.current_state === 'busy') return (a.remaining_minutes || 0) - (b.remaining_minutes || 0);
      if (a.next_booking && b.next_booking) return Date.parse(a.next_booking.scheduled_start) - Date.parse(b.next_booking.scheduled_start);
      if (a.next_booking) return -1;
      if (b.next_booking) return 1;
      return a.masseuse_name.localeCompare(b.masseuse_name, 'th');
    });

    res.json({
      business_day: currentBusinessDay,
      generated_at: nowIso,
      buffer_minutes: BOOKING_BUFFER_MINUTES,
      staff: priorityRows
    });
  } catch (error) {
    console.error('❌ Error fetching current shop status:', error);
    res.status(500).json({ error: 'Failed to fetch current shop status' });
  }
});

// Update staff member
router.put('/roster/:position', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const { masseuse_name: masseuseName, staff_id: staffId } = req.body;

    if (!masseuseName && !staffId) {
      return res.status(400).json({ error: 'masseuse_name or staff_id is required' });
    }

    await addStaffToToday({
      businessDay: currentBusinessDay,
      staffId,
      displayName: masseuseName,
      actor: getActor(req)
    });

    const result = await database.get(
      `SELECT * FROM (
         SELECT
           ts.id,
           ts.position,
           ts.display_name AS masseuse_name,
           ts.queue_status AS status,
           NULL AS busy_until,
           0 AS today_massages,
           ts.added_at AS last_updated,
           ts.staff_id,
           ts.business_day
         FROM today_staff ts
         WHERE ts.business_day = ? AND ts.removed_at IS NULL
       ) WHERE masseuse_name = ?`,
      [currentBusinessDay, masseuseName]
    );

    res.json(result);
  } catch (error) {
    console.error('Error updating/creating staff:', error);
    res.status(500).json({ error: 'Failed to update/create staff' });
  }
});

// Remove staff member from roster
router.delete('/roster/:position', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const { position } = req.params;

    const row = await database.get(
      `SELECT staff_id FROM today_staff
       WHERE business_day = ? AND position = ? AND removed_at IS NULL`,
      [currentBusinessDay, position]
    );

    await database.run(
      `UPDATE today_staff
       SET removed_at = CURRENT_TIMESTAMP, removed_reason = 'manual_remove', updated_at = CURRENT_TIMESTAMP
       WHERE business_day = ? AND position = ? AND removed_at IS NULL`,
      [currentBusinessDay, position]
    );
    if (row) {
      await setPlanningStatus(currentBusinessDay, row.staff_id, 'available_to_add', getActor(req));
      await auditPlanningAction(currentBusinessDay, row.staff_id, 'remove_from_today_staff', getActor(req), { position });
    }
    await compactPositions(currentBusinessDay);

    res.json({ message: 'Staff member removed and roster re-indexed' });
  } catch (error) {
    console.error('Error removing staff from roster:', error);
    res.status(500).json({ error: 'Failed to remove staff from roster' });
  }
});

// Clear all staff from roster
router.delete('/roster', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    await database.run(
      `UPDATE today_staff
       SET removed_at = CURRENT_TIMESTAMP, removed_reason = 'manual_clear', updated_at = CURRENT_TIMESTAMP
       WHERE business_day = ? AND removed_at IS NULL`,
      [currentBusinessDay]
    );
    await auditPlanningAction(currentBusinessDay, null, 'clear_visible_today_staff', getActor(req));
    res.json({ message: 'Today Staff visible list cleared successfully', business_day: currentBusinessDay });
  } catch (error) {
    console.error('Error clearing roster:', error);
    res.status(500).json({ error: 'Failed to clear roster' });
  }
});

// Serve next customer (automatic assignment)
router.post('/serve-next', async (req, res) => {
  try {
    // Find next available masseuse (only Next status)
    const nextMasseuse = await database.get(
      `SELECT * FROM staff_roster 
       WHERE masseuse_name != '' 
       AND status = 'Next'
       ORDER BY position ASC 
       LIMIT 1`
    );

    if (!nextMasseuse) {
      return res.status(404).json({ error: 'No masseuse available' });
    }

    // Set current busy masseuse to break
    await database.run(
      'UPDATE staff_roster SET status = ? WHERE status = ?',
      ['Break', 'Busy']
    );

    // Set next masseuse to busy
    await database.run(
      'UPDATE staff_roster SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE position = ?',
      ['Busy', nextMasseuse.position]
    );

    res.json({
      message: 'Next customer assigned',
      masseuse: nextMasseuse.masseuse_name,
      position: nextMasseuse.position
    });
  } catch (error) {
    console.error('Error serving next customer:', error);
    res.status(500).json({ error: 'Failed to serve next customer' });
  }
});

// Advance queue (set next person in line)
router.post('/advance-queue', async (req, res) => {
  let dbTransactionStarted = false;
  try {
    const { currentMasseuse } = req.body;
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const todayStaff = await getActiveTodayStaff(currentBusinessDay);
    const currentNext = todayStaff[0];

    if (!currentNext) {
      res.json({ message: 'No Today Staff to advance', today_staff: [] });
      return;
    }

    if (currentNext.masseuse_name !== currentMasseuse) {
      res.json({
        message: 'Manual selection - Today Staff queue not advanced',
        previousNext: currentNext.masseuse_name,
        selectedMasseuse: currentMasseuse,
        today_staff: todayStaff
      });
      return;
    }

    res.json({
      message: 'Today Staff order retained; workload determines the next walk-in',
      previousNext: currentMasseuse,
      newNext: todayStaff[0]?.masseuse_name || null,
      today_staff: todayStaff
    });
  } catch (error) {
    if (dbTransactionStarted) {
      try {
        await database.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('Failed to roll back queue advance:', rollbackError);
      }
    }
    console.error('Error advancing queue:', error);
    res.status(500).json({ error: 'Failed to advance queue' });
  }
});

// Set masseuse as busy until end time
router.post('/set-busy', async (req, res) => {
  try {
    const { masseuseName, endTime } = req.body;

    console.log(`🔒 Setting ${masseuseName} as busy until ${endTime}`);

    // Find the masseuse in roster
    const masseuse = await database.get(
      'SELECT * FROM staff_roster WHERE masseuse_name = ?',
      [masseuseName]
    );

    if (!masseuse) {
      console.log(`❌ Masseuse ${masseuseName} not found in roster`);
      return res.status(404).json({ error: 'Masseuse not found' });
    }

    console.log(`🔍 Found masseuse ${masseuseName} at position ${masseuse.position}`);
    console.log(`📝 Previous status: ${masseuse.status || 'NULL'}`);
    console.log(`📝 Previous busy_until: ${masseuse.busy_until || 'NULL'}`);

    // Set status to busy with end time
    const newStatus = `Busy until ${endTime}`;
    await database.run(
      'UPDATE staff_roster SET status = ?, busy_until = ?, last_updated = CURRENT_TIMESTAMP WHERE position = ?',
      [newStatus, endTime, masseuse.position]
    );

    console.log(`✅ Updated ${masseuseName} status to: ${newStatus}`);
    console.log(`✅ Set busy_until to: ${endTime}`);

    res.json({
      message: 'Masseuse marked as busy',
      masseuse: masseuseName,
      busyUntil: endTime,
      newStatus
    });
  } catch (error) {
    console.error('❌ Error setting masseuse busy:', error);
    res.status(500).json({ error: 'Failed to set masseuse busy' });
  }
});

// Manual status reset endpoint (for testing and manual cleanup)
router.post('/reset-expired-statuses', async (req, res) => {
  try {
    console.log('🔄 Manual status reset triggered');

    const resetCount = await resetExpiredBusyStatuses();

    res.json({
      message: 'Status reset completed',
      resetCount,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error in manual status reset:', error);
    res.status(500).json({ error: 'Failed to reset expired statuses' });
  }
});

// Get today's masseuse performance
router.get('/performance/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const performance = await database.all(
      `SELECT 
        masseuse_name,
        COUNT(*) as massage_count,
        SUM(masseuse_fee) as total_fees,
        SUM(payment_amount) as total_revenue
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'
       GROUP BY masseuse_name
       ORDER BY total_fees DESC`,
      [today]
    );

    res.json(performance);
  } catch (error) {
    console.error('Error fetching staff performance:', error);
    res.status(500).json({ error: 'Failed to fetch staff performance' });
  }
});

// Get all staff names (for dropdown population)
router.get('/allstaff', async (req, res) => {
  try {
    console.log('📋 Fetching all staff names...');

    // Get all staff names from the master staff table (no active filter)
    const allStaff = await database.all(
      'SELECT id, name FROM staff ORDER BY name COLLATE NOCASE ASC'
    );

    // Extract just the names for the dropdown
    const staffNames = allStaff.map((staff) => staff.name);

    console.log(`📋 Retrieved ${staffNames.length} staff names:`, staffNames);

    res.json(staffNames);
  } catch (error) {
    console.error('❌ Error fetching all staff names:', error);
    res.status(500).json({ error: 'Failed to fetch all staff names' });
  }
});

router.get('/today/helper', async (req, res) => {
  try {
    const { currentBusinessDay, previousBusinessDay } = await getCurrentBusinessDay(req);
    const rows = await database.all(
      `SELECT
         s.id AS staff_id,
         s.name AS display_name,
         ? AS previous_business_day,
         COALESCE(SUM(CASE
           WHEN t.status = 'ACTIVE' THEN t.masseuse_fee
           ELSE 0
         END), 0) AS previous_day_commission,
         COALESCE(p.planning_status, 'available_to_add') AS today_planning_status,
         CASE WHEN active_ts.id IS NULL AND COALESCE(p.planning_status, 'available_to_add') != 'day_off_today' THEN 1 ELSE 0 END AS can_add_to_today_staff
       FROM staff s
       LEFT JOIN transactions t
         ON t.masseuse_name = s.name
        AND t.business_day = ?
       LEFT JOIN today_staff_planning p
         ON p.staff_id = s.id
        AND p.business_day = ?
       LEFT JOIN today_staff active_ts
         ON active_ts.staff_id = s.id
        AND active_ts.business_day = ?
        AND active_ts.removed_at IS NULL
       WHERE s.active = 1
       GROUP BY s.id, s.name, p.planning_status, active_ts.id
       ORDER BY previous_day_commission ASC, s.name COLLATE NOCASE ASC`,
      [previousBusinessDay, previousBusinessDay, currentBusinessDay, currentBusinessDay]
    );

    res.json({
      business_day: currentBusinessDay,
      previous_business_day: previousBusinessDay,
      rows: rows.map((row) => ({
        ...row,
        previous_day_commission: Number(row.previous_day_commission || 0),
        was_day_off_yesterday: Number(row.previous_day_commission || 0) === 0,
        can_add_to_today_staff: Boolean(row.can_add_to_today_staff)
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching Today Staff helper:', error);
    res.status(500).json({ error: 'Failed to fetch Today Staff helper data' });
  }
});

router.get('/today/state', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const todayStaff = await getActiveTodayStaff(currentBusinessDay);
    const planning = await database.all(
      `SELECT
         p.staff_id,
         s.name AS display_name,
         p.planning_status,
         p.updated_at
       FROM today_staff_planning p
       JOIN staff s ON s.id = p.staff_id
       WHERE p.business_day = ?
       ORDER BY s.name COLLATE NOCASE ASC`,
      [currentBusinessDay]
    );
    const addedIds = new Set(todayStaff.map((row) => row.staff_id));
    const dropdownStaff = await database.all(
      `SELECT s.id AS staff_id, s.name AS display_name
       FROM staff s
       WHERE s.active = 1
       ORDER BY s.name COLLATE NOCASE ASC`
    );

    res.json({
      business_day: currentBusinessDay,
      today_staff: todayStaff,
      planning,
      day_off_today: planning.filter((row) => row.planning_status === 'day_off_today'),
      dropdown_staff: dropdownStaff.filter((row) => !addedIds.has(row.staff_id))
    });
  } catch (error) {
    console.error('❌ Error fetching Today Staff state:', error);
    res.status(500).json({ error: 'Failed to fetch Today Staff state' });
  }
});

router.post('/today/add', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const todayStaff = await addStaffToToday({
      businessDay: currentBusinessDay,
      staffId: req.body.staff_id,
      displayName: req.body.display_name || req.body.masseuse_name,
      actor: getActor(req)
    });
    res.status(201).json({ business_day: currentBusinessDay, today_staff: todayStaff });
  } catch (error) {
    console.error('❌ Error adding Today Staff:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to add Today Staff' });
  }
});

router.post('/today/day-off', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const staff = await getStaffByIdOrName({ staffId: req.body.staff_id, displayName: req.body.display_name || req.body.masseuse_name });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    await database.run(
      `UPDATE today_staff
       SET removed_at = CURRENT_TIMESTAMP, removed_reason = 'day_off_today', updated_at = CURRENT_TIMESTAMP
       WHERE business_day = ? AND staff_id = ? AND removed_at IS NULL`,
      [currentBusinessDay, staff.id]
    );
    await compactPositions(currentBusinessDay);
    await setPlanningStatus(currentBusinessDay, staff.id, 'day_off_today', getActor(req));
    await auditPlanningAction(currentBusinessDay, staff.id, 'mark_day_off_today', getActor(req));
    res.json({ business_day: currentBusinessDay, staff_id: staff.id, planning_status: 'day_off_today' });
  } catch (error) {
    console.error('❌ Error marking day off today:', error);
    res.status(500).json({ error: 'Failed to mark day off today' });
  }
});

router.post('/today/restore', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const staff = await getStaffByIdOrName({ staffId: req.body.staff_id, displayName: req.body.display_name || req.body.masseuse_name });
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    await setPlanningStatus(currentBusinessDay, staff.id, 'available_to_add', getActor(req));
    await auditPlanningAction(currentBusinessDay, staff.id, 'restore_day_off_today', getActor(req));
    res.json({ business_day: currentBusinessDay, staff_id: staff.id, planning_status: 'available_to_add' });
  } catch (error) {
    console.error('❌ Error restoring day off today:', error);
    res.status(500).json({ error: 'Failed to restore day off today' });
  }
});

router.put('/today/reorder', async (req, res) => {
  try {
    const { currentBusinessDay } = await getCurrentBusinessDay(req);
    const orderedStaffIds = Array.isArray(req.body.ordered_staff_ids) ? req.body.ordered_staff_ids : [];
    if (orderedStaffIds.length === 0) {
      return res.status(400).json({ error: 'ordered_staff_ids is required' });
    }

    for (let index = 0; index < orderedStaffIds.length; index += 1) {
      await database.run(
        `UPDATE today_staff
         SET position = ?, updated_at = CURRENT_TIMESTAMP
         WHERE business_day = ? AND staff_id = ? AND removed_at IS NULL`,
        [index + 1, currentBusinessDay, orderedStaffIds[index]]
      );
    }
    await auditPlanningAction(currentBusinessDay, null, 'reorder_today_staff', getActor(req), { ordered_staff_ids: orderedStaffIds });
    res.json({ business_day: currentBusinessDay, today_staff: await getActiveTodayStaff(currentBusinessDay) });
  } catch (error) {
    console.error('❌ Error reordering Today Staff:', error);
    res.status(500).json({ error: 'Failed to reorder Today Staff' });
  }
});

router.post('/today/reset-check', async (req, res) => {
  try {
    const now = req.body?.at ? new Date(req.body.at) : new Date();
    const result = await resetIfStale(now, getActor(req));
    await ensureBusinessDay(result.business_day || getNextBusinessDay(result.reset_business_day));
    res.json(result);
  } catch (error) {
    console.error('❌ Error running Today Staff reset check:', error);
    res.status(500).json({ error: 'Failed to run Today Staff reset check' });
  }
});


// Get staff counts for parity checks
router.get('/counts', async (req, res) => {
  try {
    console.log('📊 Fetching staff counts...');

    const [[{cnt: total}], [{cnt: roster}]] = await Promise.all([
      database.all(`SELECT COUNT(*) AS cnt FROM staff`),
      database.all(`SELECT COUNT(*) AS cnt FROM roster WHERE date = DATE('now')`)
    ]);

    const counts = { 
      total, 
      roster, 
      availableTotal: total - roster 
    };

    console.log(`📊 Staff counts:`, counts);

    res.json(counts);
  } catch (error) {
    console.error('❌ Error fetching staff counts:', error);
    res.status(500).json({ error: 'Failed to fetch staff counts' });
  }
});

module.exports = router;
