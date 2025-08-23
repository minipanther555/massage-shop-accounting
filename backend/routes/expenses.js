const express = require('express');

const router = express.Router();
const database = require('../models/database');

// Get expenses by date
router.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const expenses = await database.all(
      'SELECT * FROM expenses WHERE date = ? ORDER BY timestamp DESC',
      [targetDate]
    );

    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Add new expense
router.post('/', async (req, res) => {
  try {
    const { description, amount, date } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: 'Missing required fields: description, amount' });
    }

    const expenseDate = date || new Date().toISOString().split('T')[0];

    const result = await database.run(
      'INSERT INTO expenses (date, description, amount) VALUES (?, ?, ?)',
      [expenseDate, description, amount]
    );

    const newExpense = await database.get(
      'SELECT * FROM expenses WHERE id = ?',
      [result.id]
    );

    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Get daily expense summary
router.get('/summary/today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const summary = await database.get(
      `SELECT 
        COUNT(*) as expense_count,
        COALESCE(SUM(amount), 0) as total_expenses
       FROM expenses 
       WHERE date = ?`,
      [today]
    );

    res.json(summary);
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await database.run(
      'DELETE FROM expenses WHERE id = ?',
      [id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

module.exports = router;
