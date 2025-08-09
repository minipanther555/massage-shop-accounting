const express = require('express');
const router = express.Router();
const database = require('../models/database');

// Get all staff roster
router.get('/roster', async (req, res) => {
  try {
    const roster = await database.all(
      'SELECT * FROM staff_roster ORDER BY position ASC'
    );
    
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
    
    res.json(roster);
  } catch (error) {
    console.error('Error fetching staff roster:', error);
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
    
    // Find the masseuse in roster
    const masseuse = await database.get(
      'SELECT * FROM staff_roster WHERE masseuse_name = ?',
      [masseuseName]
    );
    
    if (!masseuse) {
      return res.status(404).json({ error: 'Masseuse not found' });
    }
    
    // Set status to busy with end time
    await database.run(
      'UPDATE staff_roster SET status = ?, busy_until = ?, last_updated = CURRENT_TIMESTAMP WHERE position = ?',
      [`Busy until ${endTime}`, endTime, masseuse.position]
    );
    
    res.json({
      message: 'Masseuse marked as busy',
      masseuse: masseuseName,
      busyUntil: endTime
    });
  } catch (error) {
    console.error('Error setting masseuse busy:', error);
    res.status(500).json({ error: 'Failed to set masseuse busy' });
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

module.exports = router;
