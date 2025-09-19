/**
 * Production Diagnostic Patch
 * 
 * Apply this patch to your production server temporarily to diagnose 429 issues.
 * 
 * INSTRUCTIONS:
 * 1. Copy this file to your production server
 * 2. Apply the patch to your server.js
 * 3. Restart the server
 * 4. Run the diagnosis script
 * 5. Remove the patch after diagnosis
 */

// Add this to your server.js after the existing rate limiter setup:

// DIAGNOSTIC PATCH START
const { mkLimiter } = require('./rate-limit-diag');

// Override the existing rate limiter with diagnostic version
console.log('🔍 Applying rate limit diagnostic patch...');

// Remove existing rate limiter
// (Comment out or remove your existing app.use(pwtestAwareRateLimiter) line)

// Add diagnostic rate limiters
const staffRosterLimiter = mkLimiter('staff-roster', { 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30 // Higher limit for staff operations
});

const csrfLimiter = mkLimiter('csrf', { 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 60 // Higher limit for CSRF
});

const apiGlobalLimiter = mkLimiter('api-global', { 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10 // Lower limit for other API calls
});

// Apply limiters with PWTEST bypass
const pwtestAwareStaffLimiter = (req, res, next) => {
  if (req.isPwtest) {
    return next(); // Skip rate limiting for PWTEST
  }
  return staffRosterLimiter(req, res, next);
};

const pwtestAwareCsrfLimiter = (req, res, next) => {
  if (req.isPwtest) {
    return next(); // Skip rate limiting for PWTEST
  }
  return csrfLimiter(req, res, next);
};

const pwtestAwareApiLimiter = (req, res, next) => {
  if (req.isPwtest) {
    return next(); // Skip rate limiting for PWTEST
  }
  return apiGlobalLimiter(req, res, next);
};

// Apply the diagnostic limiters
app.use('/api/main/staff-roster', pwtestAwareStaffLimiter);
app.use('/api/main/csrf', pwtestAwareCsrfLimiter);
app.use('/api', pwtestAwareApiLimiter);

console.log('✅ Diagnostic rate limiters applied');
console.log('📊 Limiter configuration:');
console.log('  - /api/main/staff-roster: 30 requests/15min');
console.log('  - /api/main/csrf: 60 requests/15min');
console.log('  - /api/*: 10 requests/15min (global)');

// Add diagnostic endpoint
app.get('/api/diagnostic/rate-limit-status', (req, res) => {
  res.json({
    ip: req.ip,
    xForwardedFor: req.headers['x-forwarded-for'],
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString(),
    message: 'Rate limit diagnostic endpoint',
    trustProxy: app.get('trust proxy')
  });
});

console.log('✅ Diagnostic endpoint available at /api/diagnostic/rate-limit-status');
// DIAGNOSTIC PATCH END
