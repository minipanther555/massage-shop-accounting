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
    
    // Validate status
    const validStatuses = ['Available', 'Busy', 'Break', 'Off', 'Next'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
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
    // Find next available masseuse
    const nextMasseuse = await database.get(
      `SELECT * FROM staff_roster 
       WHERE masseuse_name != '' 
       AND status IN ('Available', 'Next') 
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
