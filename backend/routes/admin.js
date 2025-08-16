const express = require('express');
const router = express.Router();
const database = require('../models/database');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { addCSRFToken } = require('../middleware/csrf-protection');
const path = require('path');
const fs = require('fs');

// Apply authentication and manager authorization to all admin routes
router.use(authenticateToken);
router.use(authorizeRole('manager'));

// Serve the admin-staff.html page through the backend
// This ensures that authentication and CSRF middleware are applied
router.get('/staff-page', addCSRFToken, (req, res) => {
    console.log(`[ADMIN.JS STAFF-PAGE] Route handler started for ${req.originalUrl}.`);
    const filePath = path.join(__dirname, '..', '..', 'web-app', 'admin-staff.html');
    console.log(`[ADMIN.JS STAFF-PAGE] Reading file from path: ${filePath}`);
    
    // Read the HTML file, inject the CSRF token, and send it.
    fs.readFile(filePath, 'utf8', (err, data) => {
        console.log(`[ADMIN.JS STAFF-PAGE] fs.readFile callback initiated.`);
        if (err) {
            console.error('[ADMIN.JS STAFF-PAGE] Error reading admin-staff.html:', err);
            return res.status(500).send('Error loading the page.');
        }
        // ---> DIAGNOSTIC LOG <---
        console.log(`[ADMIN.JS STAFF-PAGE] CSRF token from res.locals: ${res.locals.csrfToken}`);
        if (typeof res.locals.csrfToken !== 'string' || res.locals.csrfToken.length < 10) {
            console.error(`[ADMIN.JS STAFF-PAGE] CRITICAL: Invalid CSRF token found in res.locals.`);
        }
        
        const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
        
        if (!modifiedHtml.includes(res.locals.csrfToken)) {
            console.error(`[ADMIN.JS STAFF-PAGE] CRITICAL: HTML modification failed. Token was not injected.`);
        } else {
            console.log(`[ADMIN.JS STAFF-PAGE] HTML modification successful. Sending to browser.`);
        }
        
        res.send(modifiedHtml);
    });
});

// Serve admin-services.html
router.get('/services-page', addCSRFToken, (req, res) => {
    const filePath = path.join(__dirname, '..', '..', 'web-app', 'admin-services.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading admin-services.html:', err);
            return res.status(500).send('Error loading the page.');
        }
        console.log(`[ADMIN.JS SERVICES-PAGE] CSRF token from res.locals: ${res.locals.csrfToken}`);
        const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
        res.send(modifiedHtml);
    });
});

// Serve admin-reports.html
router.get('/reports-page', addCSRFToken, (req, res) => {
    const filePath = path.join(__dirname, '..', '..', 'web-app', 'admin-reports.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading admin-reports.html:', err);
            return res.status(500).send('Error loading the page.');
        }
        console.log(`[ADMIN.JS REPORTS-PAGE] CSRF token from res.locals: ${res.locals.csrfToken}`);
        const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
        res.send(modifiedHtml);
    });
});

// Serve admin-payment-types.html
router.get('/payment-types-page', addCSRFToken, (req, res) => {
    const filePath = path.join(__dirname, '..', '..', 'web-app', 'admin-payment-types.html');
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading admin-payment-types.html:', err);
            return res.status(500).send('Error loading the page.');
        }
        console.log(`[ADMIN.JS PAYMENT-TYPES-PAGE] CSRF token from res.locals: ${res.locals.csrfToken}`);
        const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
        res.send(modifiedHtml);
    });
});


// =============================================================================
// STAFF ADMINISTRATION ENDPOINTS
// =============================================================================

// Get all staff with payment tracking and performance data
router.get('/staff', async (req, res) => {
    try {
        const staff = await database.all(`
            SELECT 
                sr.*,
                (sr.total_fees_earned - sr.total_fees_paid) as outstanding_balance,
                CASE 
                    WHEN sr.last_payment_date IS NULL THEN 'Never Paid'
                    WHEN sr.last_payment_date >= date('now', 'weekday 0', '-6 days') THEN 'Paid This Week'
                    WHEN sr.last_payment_date >= date('now', 'weekday 0', '-13 days') THEN 'Payment Due'
                    ELSE 'Overdue'
                END as payment_status,
                JULIANDAY('now') - JULIANDAY(sr.last_payment_date) as days_since_payment,
                date('now', 'weekday 0') as next_payment_due,
                (SELECT COUNT(*) FROM transactions t 
                 WHERE t.masseuse_name = sr.masseuse_name 
                 AND date(t.timestamp) = date('now') 
                 AND t.status = 'ACTIVE') as today_transactions,
                (SELECT COALESCE(SUM(t.masseuse_fee), 0) FROM transactions t 
                 WHERE t.masseuse_name = sr.masseuse_name 
                 AND date(t.timestamp) >= date('now', 'weekday 1', '-6 days')
                 AND t.status = 'ACTIVE') as this_week_fees,
                (SELECT COUNT(*) FROM transactions t 
                 WHERE t.masseuse_name = sr.masseuse_name 
                 AND date(t.timestamp) >= date('now', 'weekday 1', '-6 days')
                 AND t.status = 'ACTIVE') as this_week_massages
            FROM staff_roster sr 
            WHERE sr.masseuse_name IS NOT NULL AND sr.masseuse_name != ''
            ORDER BY outstanding_balance DESC
        `);

        // Calculate totals for summary
        const summary = {
            total_outstanding: staff.reduce((sum, s) => sum + (s.outstanding_balance || 0), 0),
            overdue_count: staff.filter(s => s.payment_status === 'Overdue').length,
            payment_due_count: staff.filter(s => s.payment_status === 'Payment Due').length,
            total_this_week_fees: staff.reduce((sum, s) => sum + (s.this_week_fees || 0), 0),
            next_payment_date: staff[0]?.next_payment_due
        };

        res.json({ staff, summary });
    } catch (error) {
        console.error('Error fetching staff data:', error);
        res.status(500).json({ error: 'Failed to fetch staff data' });
    }
});

// Add new staff member
router.post('/staff', async (req, res) => {
    try {
        const { masseuse_name, hire_date, notes } = req.body;

        if (!masseuse_name) {
            return res.status(400).json({ error: 'Masseuse name is required' });
        }

        // Find next available position
        const lastPosition = await database.get(
            'SELECT MAX(position) as max_pos FROM staff_roster'
        );
        const nextPosition = (lastPosition.max_pos || 0) + 1;

        const result = await database.run(`
            INSERT INTO staff_roster 
            (position, masseuse_name, status, hire_date, notes, total_fees_earned, total_fees_paid) 
            VALUES (?, ?, 'Available', ?, ?, 0, 0)
        `, [nextPosition, masseuse_name, hire_date || null, notes || null]);

        const newStaff = await database.get(
            'SELECT * FROM staff_roster WHERE id = ?',
            [result.id]
        );

        res.status(201).json(newStaff);
    } catch (error) {
        console.error('Error adding staff:', error);
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(400).json({ error: 'Staff member already exists' });
        } else {
            res.status(500).json({ error: 'Failed to add staff member' });
        }
    }
});

// Update staff member details
router.put('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { masseuse_name, hire_date, notes } = req.body;

        await database.run(`
            UPDATE staff_roster 
            SET masseuse_name = ?, hire_date = ?, notes = ?, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [masseuse_name, hire_date || null, notes || null, id]);

        const updatedStaff = await database.get(
            'SELECT * FROM staff_roster WHERE id = ?',
            [id]
        );

        if (!updatedStaff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        res.json(updatedStaff);
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Failed to update staff member' });
    }
});

// Remove staff member (soft delete)
router.delete('/staff/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if staff has outstanding fees
        const staff = await database.get(
            'SELECT *, (total_fees_earned - total_fees_paid) as outstanding FROM staff_roster WHERE id = ?',
            [id]
        );

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        if (staff.outstanding > 0) {
            return res.status(400).json({ 
                error: `Cannot remove staff with outstanding fees: ฿${staff.outstanding.toFixed(2)}` 
            });
        }

        // Clear the position (soft delete)
        await database.run(`
            UPDATE staff_roster 
            SET masseuse_name = '', status = null, last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [id]);

        res.json({ message: 'Staff member removed successfully' });
    } catch (error) {
        console.error('Error removing staff:', error);
        res.status(500).json({ error: 'Failed to remove staff member' });
    }
});

// =============================================================================
// PAYMENT MANAGEMENT ENDPOINTS  
// =============================================================================

// Get payment history for a staff member
router.get('/staff/:id/payments', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get staff details
        const staff = await database.get(
            'SELECT masseuse_name FROM staff_roster WHERE id = ?',
            [id]
        );

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        // Get payment history
        const payments = await database.all(`
            SELECT * FROM staff_payments 
            WHERE masseuse_name = ? 
            ORDER BY payment_date DESC
        `, [staff.masseuse_name]);

        res.json(payments);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
});

// Record a payment to staff member
router.post('/staff/:id/payments', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, payment_type, fees_period_start, fees_period_end, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Valid payment amount is required' });
        }

        if (!payment_type || !['regular', 'advance'].includes(payment_type)) {
            return res.status(400).json({ error: 'Payment type must be "regular" or "advance"' });
        }

        // Get staff details
        const staff = await database.get(
            'SELECT * FROM staff_roster WHERE id = ?',
            [id]
        );

        if (!staff) {
            return res.status(404).json({ error: 'Staff member not found' });
        }

        const today = new Date().toISOString().split('T')[0];

        // Record payment
        await database.run(`
            INSERT INTO staff_payments 
            (masseuse_name, payment_date, amount, payment_type, fees_period_start, fees_period_end, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [staff.masseuse_name, today, amount, payment_type, fees_period_start || null, fees_period_end || null, notes || null]);

        // Update staff totals
        await database.run(`
            UPDATE staff_roster 
            SET total_fees_paid = total_fees_paid + ?,
                last_payment_date = ?,
                last_payment_amount = ?,
                last_payment_type = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [amount, today, amount, payment_type, id]);

        // Get updated staff data
        const updatedStaff = await database.get(
            'SELECT *, (total_fees_earned - total_fees_paid) as outstanding_balance FROM staff_roster WHERE id = ?',
            [id]
        );

        res.status(201).json({
            message: 'Payment recorded successfully',
            staff: updatedStaff,
            new_outstanding: updatedStaff.outstanding_balance
        });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

// Get all outstanding fees summary
router.get('/staff/outstanding-fees', async (req, res) => {
    try {
        const outstandingFees = await database.all(`
            SELECT 
                sr.id,
                sr.masseuse_name,
                sr.total_fees_earned,
                sr.total_fees_paid,
                (sr.total_fees_earned - sr.total_fees_paid) as outstanding_balance,
                sr.last_payment_date,
                sr.last_payment_type,
                CASE 
                    WHEN sr.last_payment_date IS NULL THEN 'Never Paid'
                    WHEN sr.last_payment_date >= date('now', 'weekday 0', '-6 days') THEN 'Paid This Week'
                    WHEN sr.last_payment_date >= date('now', 'weekday 0', '-13 days') THEN 'Payment Due'
                    ELSE 'Overdue'
                END as payment_status
            FROM staff_roster sr 
            WHERE sr.masseuse_name IS NOT NULL 
            AND sr.masseuse_name != ''
            AND (sr.total_fees_earned - sr.total_fees_paid) > 0
            ORDER BY outstanding_balance DESC
        `);

        const totalOutstanding = outstandingFees.reduce((sum, staff) => sum + staff.outstanding_balance, 0);

        res.json({
            outstanding_fees: outstandingFees,
            total_outstanding: totalOutstanding,
            staff_count: outstandingFees.length
        });
    } catch (error) {
        console.error('Error fetching outstanding fees:', error);
        res.status(500).json({ error: 'Failed to fetch outstanding fees' });
    }
});

// =============================================================================
// STAFF PERFORMANCE ENDPOINTS
// =============================================================================

// Get staff performance analytics
router.get('/staff/performance', async (req, res) => {
    try {
        const { period = 'week' } = req.query; // week, month, year

        let dateFilter = '';
        switch (period) {
            case 'week':
                dateFilter = "date(t.timestamp) >= date('now', 'weekday 1', '-6 days')";
                break;
            case 'month':
                dateFilter = "date(t.timestamp) >= date('now', 'start of month')";
                break;
            case 'year':
                dateFilter = "date(t.timestamp) >= date('now', 'start of year')";
                break;
            default:
                dateFilter = "date(t.timestamp) >= date('now', 'weekday 1', '-6 days')";
        }

        const performance = await database.all(`
            SELECT 
                t.masseuse_name,
                COUNT(*) as massage_count,
                SUM(t.masseuse_fee) as total_fees_earned,
                SUM(t.payment_amount) as total_revenue_generated,
                AVG(t.masseuse_fee) as avg_fee_per_massage,
                AVG(t.payment_amount) as avg_revenue_per_massage,
                MIN(date(t.timestamp)) as first_massage_date,
                MAX(date(t.timestamp)) as last_massage_date
            FROM transactions t
            WHERE ${dateFilter} AND t.status = 'ACTIVE'
            GROUP BY t.masseuse_name
            ORDER BY total_fees_earned DESC
        `);

        res.json({ performance, period });
    } catch (error) {
        console.error('Error fetching staff performance:', error);
        res.status(500).json({ error: 'Failed to fetch staff performance' });
    }
});

// Get staff rankings
router.get('/staff/rankings', async (req, res) => {
    try {
        const rankings = await database.all(`
            SELECT 
                sr.masseuse_name,
                COUNT(t.id) as total_massages,
                COALESCE(SUM(t.masseuse_fee), 0) as total_earnings,
                COALESCE(AVG(t.masseuse_fee), 0) as avg_fee,
                (SELECT COUNT(*) FROM transactions t2 
                 WHERE t2.masseuse_name = sr.masseuse_name 
                 AND date(t2.timestamp) >= date('now', 'weekday 1', '-6 days')
                 AND t2.status = 'ACTIVE') as this_week_count,
                (sr.total_fees_earned - sr.total_fees_paid) as outstanding_fees
            FROM staff_roster sr
            LEFT JOIN transactions t ON t.masseuse_name = sr.masseuse_name AND t.status = 'ACTIVE'
            WHERE sr.masseuse_name IS NOT NULL AND sr.masseuse_name != ''
            GROUP BY sr.masseuse_name
            ORDER BY total_earnings DESC
        `);

        res.json(rankings);
    } catch (error) {
        console.error('Error fetching staff rankings:', error);
        res.status(500).json({ error: 'Failed to fetch staff rankings' });
    }
});

module.exports = router;
