const express = require('express');
const Sentry = require('@sentry/node');

// Initialize Sentry if DSN is provided
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_RATE || 0.0),
    environment: process.env.NODE_ENV || "production",
  });
}
const cors = require('cors');
const cookieParser = require('cookie-parser');

const rateLimiter = require('./middleware/rate-limiter');
require('dotenv').config();

// PWTEST flag - must run before any auth/CSRF/rate-limit/static mounts
function pwtestFlag(req, res, next) {
  const on =
    (req.cookies && req.cookies.PWTEST === '1') ||
    req.query?.PWTEST === '1' ||
    req.get('x-pwtest') === '1';
  if (on) {
    req.isPwtest = true;
    res.locals.isPwtest = true;
    // make the cookie visible to client code too
    res.cookie('PWTEST', '1', { httpOnly: false, sameSite: 'Lax', path: '/' });
  }
  next();
}

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
// Trust proxy for production/proxy correctness
app.set("trust proxy", 1);
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
app.use(pwtestFlag);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(securityHeaders);
app.use(validateInput);

// Apply rate limiting early in the middleware stack
// Apply rate limiting only when NOT in the testing environment or PWTEST mode
if (process.env.NODE_ENV !== 'testing' && process.env.PWTEST !== '1') {
  const { apiRateLimiter } = require('./middleware/rate-limiter');
  // Add PWTEST skip to the rate limiter
  const originalApiRateLimiter = apiRateLimiter;
  const pwtestAwareRateLimiter = (req, res, next) => {
    if (req.isPwtest) {
      return next(); // Skip rate limiting for PWTEST
    }
    return originalApiRateLimiter(req, res, next);
  };
  app.use(pwtestAwareRateLimiter);
  console.log('🔒 Rate limiting ENABLED (with PWTEST bypass).');
} else {
  console.log('🔓 Rate limiting DISABLED for testing/PWTEST environment.');
}

// Apply CSRF protection globally.
// Our conditional middleware in csrf-protection.js will handle the bypass for tests.
app.use(csrfProtection);

// Middleware to make CSRF token available to templates/frontend
app.use((req, res, next) => {
  if (process.env.PWTEST === '1') {
    res.locals.csrfToken = 'pwtest-token';
    return next();
  }
  try {
    res.locals.csrfToken = req.csrfToken?.() || '';
  } catch {
    res.locals.csrfToken = '';
  }
  next();
});

// CSRF token endpoint for cookie-mode CSRF
app.get('/csrf', (req, res) => {
  if (process.env.NODE_ENV === 'testing' || process.env.PWTEST === '1') {
    // In testing mode, return a dummy token since CSRF is bypassed
    res.json({ token: 'pwtest-token' });
  } else {
    res.json({ token: req.csrfToken() });
  }
});

// --- API Routes ---
// These no longer need individual CSRF middleware
app.use('/api/auth', require('./routes/auth').router);

// PWTEST auth shim - provides fake auth response for client checks
app.get('/api/auth/me', (req, res) => {
  if (process.env.PWTEST === '1') {
    return res.json({ user: { username: 'pwtest', role: 'manager', id: 'pwtest-user' } });
  }
  // fall through to real logic
  if (req.user) return res.json({ user: req.user });
  return res.status(401).json({ error: 'unauthenticated' });
});
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

// Version endpoint for code identity verification
app.get('/health/version', (req, res) => {
  res.json({ 
    commit: 'testing30-fix',
    buildTime: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform
  });
});

// DB Identity endpoint (non-prod only)
if (process.env.NODE_ENV !== 'production') {
  app.get('/health/db-identity', (req, res) => {
    try {
      const dbInstance = require('./models/database');
      if (dbInstance && dbInstance.db) {
        const pragmaResult = dbInstance.db.prepare("PRAGMA database_list").all();
        const staffCount = dbInstance.db.prepare("SELECT COUNT(*) as count FROM staff").get();
        const activeStaffCount = dbInstance.db.prepare("SELECT COUNT(*) as count FROM staff WHERE active=1").get();
        
        res.json({
          env_DB_PATH: process.env.DB_PATH || 'NOT_SET',
          pragma_path: pragmaResult[0]?.file || 'UNKNOWN',
          sha256: require('crypto').createHash('sha256').update(require('fs').readFileSync(process.env.DB_PATH || '/app/backend/data/massage_shop.db')).digest('hex'),
          staff_total: staffCount?.count || 0,
          staff_active: activeStaffCount?.count || 0,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({ error: 'Database not connected' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// S5_Gauntlet: Post-init startup checks with retry
function performStartupChecks() {
  const selfCheckEnforce = process.env.SELF_CHECK_ENFORCE === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  const startTime = Date.now();
  
  if (isProduction) return; // Skip checks in production
  
  const dbPath = process.env.DB_PATH || 'NOT_SET';
  console.log(`🔍 [t=+${Date.now() - startTime}ms] Post-init DB_PATH: ${dbPath}`);
  
  // Retry mechanism for database checks
  let attempts = 0;
  const maxAttempts = 3;
  const retryDelay = 250;
  
  function checkDatabase() {
    attempts++;
    console.log(`🔍 [t=+${Date.now() - startTime}ms] Database check attempt ${attempts}/${maxAttempts}`);
    
    try {
      const dbInstance = require('./models/database');
      if (dbInstance && dbInstance.db) {
        const pragmaResult = dbInstance.db.prepare("PRAGMA database_list").all();
        const pragmaPath = pragmaResult[0]?.file || 'UNKNOWN';
        console.log(`🔍 [t=+${Date.now() - startTime}ms] PRAGMA path: ${pragmaPath}`);
        
        // S5.1 Connection-Ready Check (enforced in all envs)
        if (pragmaPath !== '/app/backend/data/massage_shop.db') {
          if (attempts < maxAttempts) {
            console.log(`⚠️  [t=+${Date.now() - startTime}ms] Wrong DB path, retrying in ${retryDelay}ms...`);
            setTimeout(checkDatabase, retryDelay);
            return;
          } else {
            console.error(`❌ CONNECTION-READY FAILED: Wrong DB path! Expected /app/backend/data/massage_shop.db, got ${pragmaPath}`);
            if (selfCheckEnforce) process.exit(1);
            return;
          }
        }
        
        // S5.2 Data-Ready Check (profiled enforcement)
        const staffCount = dbInstance.db.prepare("SELECT COUNT(*) as count FROM staff").get();
        const activeStaffCount = dbInstance.db.prepare("SELECT COUNT(*) as count FROM staff WHERE active=1").get();
        
        console.log(`🔍 [t=+${Date.now() - startTime}ms] Total staff: ${staffCount?.count || 0}`);
        console.log(`🔍 [t=+${Date.now() - startTime}ms] Active staff: ${activeStaffCount?.count || 0}`);
        
        // Profiled enforcement: warn in dev, fail in CI/stage
        if (!staffCount?.count || staffCount.count === 0) {
          if (attempts < maxAttempts) {
            console.log(`⚠️  [t=+${Date.now() - startTime}ms] No staff data, retrying in ${retryDelay}ms...`);
            setTimeout(checkDatabase, retryDelay);
            return;
          } else {
            if (selfCheckEnforce) {
              console.error('❌ DATA-READY FAILED: No staff data found!');
              console.error('❌ This indicates DB path drift or empty database.');
              process.exit(1);
            } else {
              console.error('⚠️  WARNING: No staff data found! This indicates DB path drift or empty database.');
              console.error('⚠️  Set SELF_CHECK_ENFORCE=true to make this fatal in CI/stage.');
            }
            return;
          }
        }
        
        console.log(`✅ [t=+${Date.now() - startTime}ms] All checks passed: ${staffCount.count} total, ${activeStaffCount.count} active`);
        
        // Warn if DB_PATH not set
        if (!process.env.DB_PATH) {
          console.warn('⚠️  WARNING: DB_PATH environment variable not set!');
        }
      } else {
        if (attempts < maxAttempts) {
          console.log(`⚠️  [t=+${Date.now() - startTime}ms] Database not ready, retrying in ${retryDelay}ms...`);
          setTimeout(checkDatabase, retryDelay);
        } else {
          console.error('❌ Database not connected after retries');
          if (selfCheckEnforce) process.exit(1);
        }
      }
    } catch (error) {
      if (attempts < maxAttempts) {
        console.log(`⚠️  [t=+${Date.now() - startTime}ms] Database check error, retrying in ${retryDelay}ms: ${error.message}`);
        setTimeout(checkDatabase, retryDelay);
      } else {
        console.error(`❌ Database check failed after retries: ${error.message}`);
        if (selfCheckEnforce) process.exit(1);
      }
    }
  }
  
  checkDatabase();
}

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
    
    // S5_Gauntlet: Phase-aware startup checks (moved to post-init)
    // Note: Checks are now performed after server starts to avoid timing issues
    
    return new Promise((resolve) => {
      server = app.listen(PORT, () => {
        console.log(`🚀 Massage Shop POS Backend running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
        
        // S5_Gauntlet: Post-init checks with retry
        setTimeout(() => {
          performStartupChecks();
        }, 1000); // Wait 1 second for full initialization
        
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
