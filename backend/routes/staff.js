const express = require('express');
const router = express.Router();
const database = require('../models/database');

// Helper function to reset expired busy statuses
async function resetExpiredBusyStatuses() {
  try {
    console.log('🔄 Checking for expired busy statuses...');
    
    // Get current time in HH:MM format
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    console.log(`🕐 Current time: ${currentTime}`);
    
    // Find all staff with busy status that should be expired
    const busyStaff = await database.all(
      `SELECT * FROM staff_roster 
       WHERE status LIKE 'Busy until %' 
       AND masseuse_name != ''`
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
              
              normalizedBusyTime = hours.toString().padStart(2, '0') + ':' + minutes;
              console.log(`🔄 Converted ${busyUntilTime} to ${normalizedBusyTime}`);
            }
          }
          
          // Compare times
          const isExpired = normalizedBusyTime < currentTime;
          console.log(`⏰ Time comparison: ${normalizedBusyTime} < ${currentTime} = ${isExpired}`);
          
          if (isExpired) {
            console.log(`🔄 Resetting expired status for ${staff.masseuse_name}`);
            
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
            console.log(`✅ Reset ${staff.masseuse_name} status from "${staff.status}" to NULL`);
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
    
    // First, reset any expired busy statuses
    const resetCount = await resetExpiredBusyStatuses();
    if (resetCount > 0) {
      console.log(`🔄 Reset ${resetCount} expired statuses before returning roster`);
    }
    
    // Now fetch the updated roster
    const roster = await database.all(
      'SELECT * FROM staff_roster ORDER BY position ASC'
    );
    
    console.log(`📋 Retrieved ${roster.length} staff members from roster`);
    
    // Update today's massage counts
    const today = new Date().toISOString().split('T')[0];
    for (let staff of roster) {
      if (staff.masseuse_name) {
        const { count } = await database.get(
          'SELECT COUNT(*) as count FROM transactions WHERE masseuse_name = ? AND date = ? AND status = "ACTIVE"',
          [staff.masseuse_name, today]
        ) || { count: 0 };
        staff.today_massages = count;
      }
    }
    
    console.log('✅ Staff roster fetched and processed successfully');
    res.json(roster);
  } catch (error) {
    console.error('❌ Error fetching staff roster:', error);
    res.status(500).json({ error: 'Failed to fetch staff roster' });
  }
});

// Update staff member
router.put('/roster/:position', async (req, res) => {
  try {
    const { position } = req.params;
    const { masseuse_name, status } = req.body;
    
    // Validate status - only Next and Busy until [time] allowed
    if (status && !status.startsWith('Busy until ') && status !== 'Next') {
      return res.status(400).json({ error: 'Invalid status. Only "Next" or "Busy until [time]" allowed' });
    }
    
    const updates = [];
    const params = [];
    
    if (masseuse_name !== undefined) {
      updates.push('masseuse_name = ?');
      params.push(masseuse_name);
    }
    
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push('last_updated = CURRENT_TIMESTAMP');
    params.push(position);
    
    await database.run(
      `UPDATE staff_roster SET ${updates.join(', ')} WHERE position = ?`,
      params
    );
    
    // Get updated record
    const updated = await database.get(
      'SELECT * FROM staff_roster WHERE position = ?',
      [position]
    );
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({ error: 'Failed to update staff' });
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
  try {
    const { currentMasseuse } = req.body;
    
    // Find current next in line person
    const currentNext = await database.get(
      'SELECT * FROM staff_roster WHERE status = "Next" ORDER BY position ASC LIMIT 1'
    );
    
    if (currentNext && currentNext.masseuse_name === currentMasseuse) {
      // Clear current next status
      await database.run(
        'UPDATE staff_roster SET status = NULL WHERE status = "Next"'
      );
      
      // Find next person in roster order after current position (not busy)
      const nextInLine = await database.get(
        `SELECT * FROM staff_roster 
         WHERE position > ? AND masseuse_name != '' 
         AND (status IS NULL OR status NOT LIKE 'Busy until %')
         ORDER BY position ASC LIMIT 1`,
        [currentNext.position]
      );
      
      if (!nextInLine) {
        // If no one after current position, loop back to first available
        const firstAvailable = await database.get(
          `SELECT * FROM staff_roster 
           WHERE masseuse_name != '' 
           AND (status IS NULL OR status NOT LIKE 'Busy until %')
           ORDER BY position ASC LIMIT 1`
        );
        
        if (firstAvailable) {
          await database.run(
            'UPDATE staff_roster SET status = "Next", last_updated = CURRENT_TIMESTAMP WHERE position = ?',
            [firstAvailable.position]
          );
          
          res.json({
            message: 'Queue advanced',
            previousNext: currentMasseuse,
            newNext: firstAvailable.masseuse_name
          });
        } else {
          res.json({ message: 'No available staff to advance to' });
        }
      } else {
        // Set next person as "Next"
        await database.run(
          'UPDATE staff_roster SET status = "Next", last_updated = CURRENT_TIMESTAMP WHERE position = ?',
          [nextInLine.position]
        );
        
        res.json({
          message: 'Queue advanced',
          previousNext: currentMasseuse,
          newNext: nextInLine.masseuse_name
        });
      }
    } else {
      res.json({ message: 'Manual selection - queue not advanced' });
    }
  } catch (error) {
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
      newStatus: newStatus
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
      resetCount: resetCount,
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
    
    // Get all staff names from the master staff table
    const allStaff = await database.all(
      'SELECT id, name FROM staff WHERE active = TRUE ORDER BY name ASC'
    );
    
    // Extract just the names for the dropdown
    const staffNames = allStaff.map(staff => staff.name);
    
    console.log(`📋 Retrieved ${staffNames.length} staff names:`, staffNames);
    
    res.json(staffNames);
  } catch (error) {
    console.error('❌ Error fetching all staff names:', error);
    res.status(500).json({ error: 'Failed to fetch all staff names' });
  }
});

module.exports = router;
