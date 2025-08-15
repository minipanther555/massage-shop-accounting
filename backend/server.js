const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const database = require('./models/database');
const { validateCSRFToken, addCSRFToken } = require('./middleware/csrf-protection');

// Route imports
const adminRoutes = require('./routes/admin');
const authRoutes = require('./routes/auth');
const expenseRoutes = require('./routes/expenses');
const paymentTypeRoutes = require('./routes/payment-types');
const reportRoutes = require('./routes/reports');
const serviceRoutes = require('./routes/services');
const staffRoutes = require('./routes/staff');
const transactionRoutes = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ exposedHeaders: ['X-CSRF-Token'] }));
app.use(express.json());
app.use(helmet({ contentSecurityPolicy: false }));
app.use(addCSRFToken);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/payment-types', paymentTypeRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/transactions', transactionRoutes);

// Initialize database and start server
async function startServer() {
  try {
    await database.connect();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
