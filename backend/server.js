const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import our custom security middleware
const securityHeaders = require('./middleware/security-headers');
const { validateInput } = require('./middleware/input-validation');
const { validateCSRFToken, addCSRFToken } = require('./middleware/csrf-protection');
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

// Security middleware - simplified for development
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }));
  console.log('🛡️ Security headers enabled for production');
} else {
  // Minimal security for development
  app.use(helmet({ contentSecurityPolicy: false }));
  console.log('🔓 Security headers relaxed for development');
}

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

// Apply our custom security middleware
app.use(requestLogger);           // Log all requests for monitoring
app.use(requestTimeout(30000));   // 30 second timeout for requests
app.use(requestSizeLimits);       // Check request size limits
app.use(securityHeaders);         // Add security headers
app.use(validateInput);           // Validate and sanitize input
app.use(addCSRFToken);           // Add CSRF tokens to responses

// --- DIAGNOSTIC LOGGING ---
app.use((req, res, next) => {
    console.log(`[SERVER.JS ENTRY] Request received for: ${req.method} ${req.originalUrl}`);
    next();
});

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
app.use('/api/transactions', validateCSRFToken, require('./routes/transactions'));
app.use('/api/staff', validateCSRFToken, require('./routes/staff'));
app.use('/api/services', validateCSRFToken, require('./routes/services'));
app.use('/api/expenses', validateCSRFToken, require('./routes/expenses'));
app.use('/api/reports', validateCSRFToken, require('./routes/reports'));

// --- DIAGNOSTIC LOGGING ---
app.use('/api/admin', (req, res, next) => {
    console.log(`[SERVER.JS ADMIN ROUTE] Request is being routed to admin.js for: ${req.method} ${req.originalUrl}`);
    next();
}, validateCSRFToken, require('./routes/admin')); // Manager-only admin routes

app.use('/api/payment-types', validateCSRFToken, require('./routes/payment-types')); // Payment types CRUD management

// Enhanced error handling middleware
app.use(errorHandler);

// 404 handler for unmatched routes
app.use('*', notFoundHandler);

// Initialize database and start server
async function startServer() {
  try {
    await database.connect();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`🚀 Massage Shop POS Backend running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await database.close();
  process.exit(0);
});

// Start the server
startServer();
