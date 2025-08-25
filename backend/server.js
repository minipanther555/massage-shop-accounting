require('./instrument.js');

const express = require('express');
const Sentry = require('@sentry/node');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const rateLimiter = require('./middleware/rate-limiter');
require('dotenv').config();

// Import our custom security middleware
const securityHeaders = require('./middleware/security-headers');
const { validateInput } = require('./middleware/input-validation');
const { csrfProtection } = require('./middleware/csrf-protection');
const {
  requestSizeLimits,
  errorHandler,
  notFoundHandler,
  requestTimeout,
  requestLogger
} = require('./middleware/request-limits');

const database = require('./models/database');

const app = express();
const PORT = process.env.PORT || 3000;
let server;
let isServerStarted = false; // Singleton flag

// All middleware and routes must be defined BEFORE the Sentry error handler.

// Security middleware handled by custom security-headers.js

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8080'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Apply general middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(securityHeaders);
app.use(validateInput);

// Apply CSRF protection globally.
// Our conditional middleware in csrf-protection.js will handle the bypass for tests.
app.use(csrfProtection);

// Middleware to make CSRF token available to templates/frontend
app.use((req, res, next) => {
  if (req.csrfToken) {
    res.locals.csrfToken = req.csrfToken();
  }
  next();
});

// --- API Routes ---
// These no longer need individual CSRF middleware
app.use('/api/auth', require('./routes/auth').router);
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/services', require('./routes/services'));
app.use('/api/payment-types', require('./routes/payment-types'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/main', require('./routes/main'));
app.use('/api/expenses', require('./routes/expenses'));

// Generic error handler for CSRF token errors
app.use((err, req, res, next) => {
  if (err.code !== 'EBADCSRFTOKEN') {
    return next(err);
  }
  res.status(403).json({ error: 'Invalid CSRF token.' });
});

// --- Static File Serving ---
// Serve the web-app directory as a static folder.
// This must come BEFORE any of our API routes.
app.use(express.static('web-app'));

// Apply rate limiting only when NOT in the testing environment
if (process.env.NODE_ENV !== 'testing') {
  app.use(rateLimiter);
  console.log('🔒 Rate limiting ENABLED.');
} else {
  console.log('🔓 Rate limiting DISABLED for testing environment.');
}

// --- DIAGNOSTIC LOGGING ---
app.use('/api/admin', (req, res, next) => {
  next();
}, require('./routes/admin')); // Manager-only admin routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Sentry: The error handler must be before any other error middleware and after all controllers.
// This single line replaces the old requestHandler, tracingHandler, and errorHandler.
Sentry.setupExpressErrorHandler(app);

// Enhanced error handling middleware
app.use(errorHandler);

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

async function startServer() {
  if (isServerStarted) return server; // If already started, just return the instance

  try {
    await database.connect();
    console.log('Database initialized successfully');
    
    return new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`🚀 Massage Shop POS Backend running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('✅✅✅ SERVER IS FULLY INITIALIZED AND READY TO ACCEPT REQUESTS ✅✅✅');
        isServerStarted = true; // Set the flag once started
        resolve(server);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

async function closeServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(async () => {
        await database.close();
        console.log('Server and database connection closed.');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

// Start the server automatically only if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, closeServer };
