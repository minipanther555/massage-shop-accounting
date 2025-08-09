const express = require('express');
const router = express.Router();
const database = require('../models/database');

// Daily summary report
router.get('/daily/:date?', async (req, res) => {
  try {
    const date = req.params.date || new Date().toISOString().split('T')[0];
    
    // Transaction summary
    const transactionSummary = await database.get(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(payment_amount), 0) as total_revenue,
        COALESCE(SUM(masseuse_fee), 0) as total_fees
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'`,
      [date]
    );
    
    // Expense summary
    const expenseSummary = await database.get(
      `SELECT 
        COUNT(*) as expense_count,
        COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses 
       WHERE date = ?`,
      [date]
    );
    
    // Payment method breakdown
    const paymentBreakdown = await database.all(
      `SELECT 
        payment_method,
        COUNT(*) as count,
        SUM(payment_amount) as revenue
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'
       GROUP BY payment_method
       ORDER BY revenue DESC`,
      [date]
    );
    
    // Masseuse performance
    const masseusePerformance = await database.all(
      `SELECT 
        masseuse_name,
        COUNT(*) as massage_count,
        SUM(masseuse_fee) as total_fees,
        SUM(payment_amount) as total_revenue
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'
       GROUP BY masseuse_name
       ORDER BY total_fees DESC`,
      [date]
    );
    
    // Calculate net profit
    const netProfit = transactionSummary.total_revenue - transactionSummary.total_fees - expenseSummary.total_expenses;
    
    res.json({
      date,
      transaction_summary: transactionSummary,
      expense_summary: expenseSummary,
      payment_breakdown: paymentBreakdown,
      masseuse_performance: masseusePerformance,
      net_profit: netProfit
    });
  } catch (error) {
    console.error('Error generating daily report:', error);
    res.status(500).json({ error: 'Failed to generate daily report' });
  }
});

// Weekly report (for masseuse payments)
router.get('/weekly', async (req, res) => {
  try {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];
    
    const weeklyFees = await database.all(
      `SELECT 
        masseuse_name,
        COUNT(*) as weekly_massages,
        SUM(masseuse_fee) as weekly_fees
       FROM transactions 
       WHERE date >= ? AND date <= ? AND status IN ('ACTIVE', 'CORRECTED')
       GROUP BY masseuse_name
       ORDER BY weekly_fees DESC`,
      [weekStart, weekEnd]
    );
    
    res.json({
      week_start: weekStart,
      week_end: weekEnd,
      masseuse_fees: weeklyFees
    });
  } catch (error) {
    console.error('Error generating weekly report:', error);
    res.status(500).json({ error: 'Failed to generate weekly report' });
  }
});

// Monthly report
router.get('/monthly/:year?/:month?', async (req, res) => {
  try {
    const now = new Date();
    const year = req.params.year || now.getFullYear();
    const month = req.params.month || (now.getMonth() + 1);
    
    const monthStart = `${year}-${month.toString().padStart(2, '0')}-01`;
    const monthEnd = new Date(year, month, 0).toISOString().split('T')[0];
    
    // Monthly totals
    const monthlyTotals = await database.get(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(payment_amount), 0) as total_revenue,
        COALESCE(SUM(masseuse_fee), 0) as total_fees
       FROM transactions 
       WHERE date >= ? AND date <= ? AND status IN ('ACTIVE', 'CORRECTED')`,
      [monthStart, monthEnd]
    );
    
    // Monthly expenses
    const monthlyExpenses = await database.get(
      `SELECT 
        COUNT(*) as expense_count,
        COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses 
       WHERE date >= ? AND date <= ?`,
      [monthStart, monthEnd]
    );
    
    // Service type breakdown
    const serviceBreakdown = await database.all(
      `SELECT 
        service_type,
        COUNT(*) as count,
        SUM(payment_amount) as revenue
       FROM transactions 
       WHERE date >= ? AND date <= ? AND status IN ('ACTIVE', 'CORRECTED')
       GROUP BY service_type
       ORDER BY revenue DESC`,
      [monthStart, monthEnd]
    );
    
    res.json({
      month: `${year}-${month.toString().padStart(2, '0')}`,
      month_start: monthStart,
      month_end: monthEnd,
      monthly_totals: monthlyTotals,
      monthly_expenses: monthlyExpenses,
      service_breakdown: serviceBreakdown
    });
  } catch (error) {
    console.error('Error generating monthly report:', error);
    res.status(500).json({ error: 'Failed to generate monthly report' });
  }
});

// Today's summary endpoint (for frontend API client)
router.get('/summary/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const transactionSummary = await database.get(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(payment_amount), 0) as total_revenue,
        COALESCE(SUM(masseuse_fee), 0) as total_fees
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'`,
      [today]
    );
    
    res.json(transactionSummary);
  } catch (error) {
    console.error('Error fetching today summary:', error);
    res.status(500).json({ error: 'Failed to fetch today summary' });
  }
});

// End day operation (archive and reset)
router.post('/end-day', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate daily totals
    const dailyData = await database.get(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(payment_amount), 0) as total_revenue,
        COALESCE(SUM(masseuse_fee), 0) as total_fees
       FROM transactions 
       WHERE date = ? AND status = 'ACTIVE'`,
      [today]
    );
    
    const expenseData = await database.get(
      `SELECT COALESCE(SUM(amount), 0) as total_expenses FROM expenses WHERE date = ?`,
      [today]
    );
    
    // Insert into daily summaries
    await database.run(
      `INSERT OR REPLACE INTO daily_summaries 
       (date, total_revenue, total_fees, total_transactions, total_expenses) 
       VALUES (?, ?, ?, ?, ?)`,
      [today, dailyData.total_revenue, dailyData.total_fees, dailyData.total_transactions, expenseData.total_expenses]
    );
    
    // Archive old transactions (older than current month)
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    
    // Move old transactions to archive
    await database.run(
      `INSERT INTO archived_transactions 
       (original_transaction_id, transaction_id, timestamp, date, masseuse_name, service_type, 
        payment_amount, payment_method, masseuse_fee, start_time, end_time, customer_contact, status)
       SELECT id, transaction_id, timestamp, date, masseuse_name, service_type,
              payment_amount, payment_method, masseuse_fee, start_time, end_time, customer_contact, status
       FROM transactions 
       WHERE date < ?`,
      [currentMonthStart]
    );
    
    // Delete old transactions
    const archiveResult = await database.run(
      'DELETE FROM transactions WHERE date < ?',
      [currentMonthStart]
    );
    
    // Reset staff roster to Available
    await database.run(
      'UPDATE staff_roster SET status = ? WHERE status != ?',
      ['Available', 'Off']
    );
    
    res.json({
      message: 'Day ended successfully',
      archived_transactions: archiveResult.changes,
      daily_summary: {
        ...dailyData,
        total_expenses: expenseData.total_expenses
      }
    });
  } catch (error) {
    console.error('Error ending day:', error);
    res.status(500).json({ error: 'Failed to end day' });
  }
});

module.exports = router;
