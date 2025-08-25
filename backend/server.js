require('./instrument.js');

const express = require('express');
const Sentry = require('@sentry/node');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import our custom security middleware
const securityHeaders = require('./middleware/security-headers');
const { validateInput } = require('./middleware/input-validation');
const csrf = require('./middleware/csrf-protection'); // Import the csrf module
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

// Rate limiting - only in production
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
  console.log('🛡️ Rate limiting enabled for production');
} else {
  console.log('🔓 Rate limiting disabled for development');
}

// Body parsing middleware with reasonable limits
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for security
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Cookie parsing middleware
app.use(cookieParser());

// --- Static File Serving ---
// Serve the web-app directory as a static folder.
// This must come BEFORE any of our API routes.
app.use(express.static('web-app'));

// Apply our custom security middleware
app.use(requestLogger); // Log all requests for monitoring
app.use(requestTimeout(30000)); // 30 second timeout for requests
app.use(requestSizeLimits); // Check request size limits
app.use(securityHeaders); // Add security headers
app.use(validateInput); // Validate and sanitize input
// Note: CSRF tokens are added per-route, not globally

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes with CSRF protection
app.use('/api/auth', require('./routes/auth').router); // No CSRF for login

// Conditionally apply CSRF protection based on environment
const csrfMiddleware = process.env.NODE_ENV === 'testing' ? (req, res, next) => next() : csrf.validateCSRFToken;

app.use('/api/transactions', csrfMiddleware, require('./routes/transactions'));
app.use('/api/staff', csrfMiddleware, require('./routes/staff'));
app.use('/api/services', csrfMiddleware, require('./routes/services'));
app.use('/api/expenses', csrfMiddleware, require('./routes/expenses'));
app.use('/api/reports', csrfMiddleware, require('./routes/reports'));

// Main application routes with authentication and CSRF token injection (accessible to both reception and manager)
app.use('/api/main', require('./routes/main'));

// --- DIAGNOSTIC LOGGING ---
app.use('/api/admin', (req, res, next) => {
  next();
}, csrfMiddleware, require('./routes/admin')); // Manager-only admin routes

app.use('/api/payment-types', csrfMiddleware, require('./routes/payment-types')); // Payment types CRUD management



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
    
    // Start CSRF cleanup only when server starts
    csrf.startCleanupInterval();

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

function closeServer() {
  return new Promise((resolve) => {
    if (server) {
      server.close(async () => {
        await database.close();
        // Stop CSRF cleanup when server stops
        csrf.stopCleanupInterval();
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
