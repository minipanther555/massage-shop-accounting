/**
 * Rate Limit Diagnostic Middleware
 * 
 * This is a temporary diagnostic patch to identify the root cause of 429s in production.
 * Deploy this, run the diagnosis, then remove it.
 */

const rateLimit = require('express-rate-limit');

function mkLimiter(name, opts = {}) {
  const limiter = rateLimit({
    windowMs: 60_000, // 1 minute for testing
    max: 10, // Low limit to trigger 429s quickly
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Log the key being used for debugging
      const key = req.ip;
      console.log(`[RL-KEY] ${name}: ip=${req.ip}, xff=${req.headers['x-forwarded-for']}, key=${key}`);
      return key;
    },
    ...opts,
  });
  
  return (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      if (res.statusCode === 429) {
        console.warn('[RL-429]', {
          name,
          ip: req.ip,
          xff: req.headers['x-forwarded-for'],
          path: req.originalUrl,
          method: req.method,
          ua: req.get('user-agent') || '',
          ts: new Date().toISOString(),
          duration: `${duration}ms`
        });
      } else {
        // Log successful requests too for debugging
        console.log(`[RL-SUCCESS] ${name}: ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
      }
    });
    
    limiter(req, res, next);
  };
}

module.exports = {
  mkLimiter,
  
  // Diagnostic setup function
  setupDiagnostics: (app) => {
    console.log('🔍 Setting up rate limit diagnostics...');
    
    // Ensure trust proxy is set correctly
    app.set('trust proxy', 1);
    console.log('✅ Trust proxy set to 1');
    
    // Create scoped limiters for different endpoints
    const staffRosterLimiter = mkLimiter('staff-roster', { max: 30 });
    const csrfLimiter = mkLimiter('csrf', { max: 60 });
    const apiGlobalLimiter = mkLimiter('api-global', { max: 10 });
    
    // Apply limiters
    app.use('/api/main/staff-roster', staffRosterLimiter);
    app.use('/api/main/csrf', csrfLimiter);
    app.use('/api', apiGlobalLimiter);
    
    console.log('✅ Rate limit diagnostics configured');
    console.log('📊 Limiter configuration:');
    console.log('  - /api/main/staff-roster: 30 requests/min');
    console.log('  - /api/main/csrf: 60 requests/min');
    console.log('  - /api/*: 10 requests/min (global)');
    
    // Add a diagnostic endpoint
    app.get('/api/diagnostic/rate-limit-status', (req, res) => {
      res.json({
        ip: req.ip,
        xForwardedFor: req.headers['x-forwarded-for'],
        userAgent: req.get('user-agent'),
        timestamp: new Date().toISOString(),
        message: 'Rate limit diagnostic endpoint'
      });
    });
    
    console.log('✅ Diagnostic endpoint available at /api/diagnostic/rate-limit-status');
  }
};
