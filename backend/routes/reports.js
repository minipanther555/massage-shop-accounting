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
      [today]
    );
    
    res.json({
      ...transactionSummary,
      payment_breakdown: paymentBreakdown
    });
  } catch (error) {
    console.error('Error fetching today summary:', error);
    res.status(500).json({ error: 'Failed to fetch today summary' });
  }
});

// Financial reports endpoint for admin dashboard
router.get('/financial', async (req, res) => {
  try {
    const { from_date, to_date, staff_member, service_type, location } = req.query;
    
    // Build WHERE clause based on filters
    let whereClause = "WHERE t.status IN ('ACTIVE', 'CORRECTED')";
    let params = [];
    
    if (from_date && to_date) {
      whereClause += " AND t.date >= ? AND t.date <= ?";
      params.push(from_date, to_date);
    }
    
    if (staff_member && staff_member !== 'all') {
      whereClause += " AND t.masseuse_name = ?";
      params.push(staff_member);
    }
    
    if (service_type && service_type !== 'all') {
      whereClause += " AND t.service_type = ?";
      params.push(service_type);
    }
    
    // Get transaction summary
    const transactionSummary = await database.get(
      `SELECT 
        COUNT(*) as transaction_count,
        COALESCE(SUM(t.payment_amount), 0) as total_revenue,
        COALESCE(SUM(t.masseuse_fee), 0) as total_fees
       FROM transactions t
       ${whereClause}`,
      params
    );
    
    // Get expense summary for the same period
    let expenseWhereClause = "WHERE 1=1";
    let expenseParams = [];
    
    if (from_date && to_date) {
      expenseWhereClause += " AND date >= ? AND date <= ?";
      expenseParams.push(from_date, to_date);
    }
    
    const expenseSummary = await database.get(
      `SELECT 
        COUNT(*) as expense_count,
        COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses 
       ${expenseWhereClause}`,
      expenseParams
    );
    
    // Get payment method breakdown (like daily summary page)
    const paymentBreakdown = await database.all(
      `SELECT 
        t.payment_method,
        COUNT(*) as count,
        SUM(t.payment_amount) as revenue
       FROM transactions t
       ${whereClause}
       GROUP BY t.payment_method
       ORDER BY revenue DESC`,
      params
    );
    
    // Get location breakdown (In-Shop vs Outcall) - nice to have
    let locationBreakdown = [];
    if (location && location !== 'all') {
      // If specific location requested, filter by it
      whereClause += " AND s.location = ?";
      params.push(location);
    }
    
    try {
      locationBreakdown = await database.all(
        `SELECT 
          s.location,
          COUNT(*) as count,
          SUM(t.payment_amount) as revenue
         FROM transactions t
         JOIN services s ON t.service_type = s.service_name
         ${whereClause}
         GROUP BY s.location
         ORDER BY revenue DESC`,
        params
      );
    } catch (locationError) {
      // If location join fails, just skip it - it's a nice to have
      console.log('Location breakdown not available:', locationError.message);
      locationBreakdown = [];
    }
    
    // Calculate net profit
    const netProfit = transactionSummary.total_revenue - transactionSummary.total_fees - expenseSummary.total_expenses;
    
    // Calculate additional metrics
    const profitMargin = transactionSummary.total_revenue > 0 ? 
      Number(((netProfit / transactionSummary.total_revenue) * 100).toFixed(1)) : 0;
    
    // Get service breakdown
    const serviceBreakdown = await database.all(
      `SELECT 
        t.service_type as serviceName,
        COUNT(*) as transactions,
        SUM(t.payment_amount) as revenue
       FROM transactions t
       ${whereClause}
       GROUP BY t.service_type
       ORDER BY revenue DESC`,
      params
    );
    
    res.json({
      summary: {
        total_revenue: transactionSummary.total_revenue,
        total_transactions: transactionSummary.transaction_count,
        average_transaction: transactionSummary.transaction_count > 0 ? 
          Number((transactionSummary.total_revenue / transactionSummary.transaction_count).toFixed(2)) : 0,
        total_masseuse_fees: transactionSummary.total_fees,
        total_expenses: expenseSummary.total_expenses,
        net_profit: netProfit,
        profit_margin: profitMargin,
        // Add missing properties that frontend expects
        serviceRevenue: transactionSummary.total_revenue, // All revenue is service revenue for now
        otherRevenue: 0, // No other revenue sources currently
        totalFees: transactionSummary.total_fees,
        otherCosts: expenseSummary.total_expenses,
        totalCosts: transactionSummary.total_fees + expenseSummary.total_expenses,
        netProfit: netProfit // Add camelCase version
      },
      serviceBreakdown: serviceBreakdown,
      dateRange: {
        from: from_date,
        to: to_date
      },
      breakdowns: {
        by_payment_method: paymentBreakdown,
        by_location: locationBreakdown
      },
      expenses: expenseSummary,
      filters: {
        from_date,
        to_date,
        staff_member,
        service_type,
        location
      }
    });
  } catch (error) {
    console.error('Error generating financial report:', error);
    res.status(500).json({ error: 'Failed to generate financial report' });
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
    
    // Clear today's transactions (now that they're saved to daily_summaries)
    const clearedTransactions = await database.run(
      'DELETE FROM transactions WHERE date = ?',
      [today]
    );
    
    // Clear today's expenses 
    const clearedExpenses = await database.run(
      'DELETE FROM expenses WHERE date = ?',
      [today]
    );
    
    // Reset staff roster to Available
    await database.run(
      'UPDATE staff_roster SET status = ? WHERE status != ?',
      ['Available', 'Off']
    );
    
    res.json({
      message: 'Day ended successfully',
      cleared_transactions: clearedTransactions.changes,
      cleared_expenses: clearedExpenses.changes,
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

// Get all staff members for filtering
router.get('/staff', async (req, res) => {
  try {
    const staff = await database.all(
      `SELECT DISTINCT masseuse_name 
       FROM transactions 
       WHERE masseuse_name IS NOT NULL AND masseuse_name != ''
       ORDER BY masseuse_name`
    );
    
    res.json(staff.map(s => s.masseuse_name));
  } catch (error) {
    console.error('Error fetching staff list:', error);
    res.status(500).json({ error: 'Failed to fetch staff list' });
  }
});

// Get all service types for filtering
router.get('/service-types', async (req, res) => {
  try {
    const serviceTypes = await database.all(
      `SELECT DISTINCT service_type 
       FROM transactions 
       WHERE service_type IS NOT NULL AND service_type != ''
       ORDER BY service_type`
    );
    
    res.json(serviceTypes.map(s => s.service_type));
  } catch (error) {
    console.error('Error fetching service types:', error);
    res.status(500).json({ error: 'Failed to fetch service types' });
  }
});

// Get all locations for filtering
router.get('/locations', async (req, res) => {
  try {
    const locations = await database.all(
      `SELECT DISTINCT location 
       FROM services 
       WHERE location IS NOT NULL AND location != ''
       ORDER BY location`
    );
    
    res.json(locations.map(l => l.location));
  } catch (error) {
    console.error('Error fetching locations:', error);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

module.exports = router;
