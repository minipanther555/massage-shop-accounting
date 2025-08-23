/**
 * Request Limits and Error Handling Middleware
 *
 * This middleware protects against:
 * - Memory exhaustion attacks (sending massive requests)
 * - Denial of Service (DoS) attacks
 * - Resource abuse
 * - Information leakage through error messages
 */

const express = require('express');

/**
 * Request size limiting middleware
 *
 * Why this matters:
 * - Attackers can send massive amounts of data to crash your server
 * - Large requests consume memory and CPU resources
 * - Can lead to denial of service attacks
 */
function requestSizeLimits(req, res, next) {
  console.log('📏 LIMITS: Checking request size limits');

  // Set maximum request sizes
  const maxBodySize = 1024 * 1024; // 1MB for JSON/URL-encoded data
  const maxUrlLength = 2048; // 2KB for URL length
  const maxHeadersSize = 16 * 1024; // 16KB for headers

  // Check URL length
  if (req.url.length > maxUrlLength) {
    console.log('❌ LIMITS: URL too long:', req.url.length, 'characters');
    return res.status(414).json({
      error: 'Request URL too long',
      maxLength: '2KB'
    });
  }

  // Check headers size
  const headersSize = JSON.stringify(req.headers).length;
  if (headersSize > maxHeadersSize) {
    console.log('❌ LIMITS: Headers too large:', headersSize, 'bytes');
    return res.status(431).json({
      error: 'Request headers too large',
      maxSize: '16KB'
    });
  }

  // For POST/PUT requests, check content-length header
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentLength = parseInt(req.headers['content-length'] || '0');

    if (contentLength > maxBodySize) {
      console.log('❌ LIMITS: Request body too large:', contentLength, 'bytes');
      return res.status(413).json({
        error: 'Request body too large',
        maxSize: '1MB'
      });
    }
  }

  console.log('✅ LIMITS: Request size within limits');
  next();
}

/**
 * Enhanced error handling middleware
 *
 * Why this matters:
 * - Prevents information leakage (don't show system details to users)
 * - Provides consistent error responses
 * - Logs errors for debugging and security monitoring
 * - Gives users helpful error messages
 */
function errorHandler(err, req, res, next) {
  console.error('🚨 ERROR HANDLER:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Don't leak sensitive information in production
  const isProduction = process.env.NODE_ENV === 'production';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: isProduction ? 'Please check your input data' : err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required',
      details: 'Please log in to access this resource'
    });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      error: 'Access denied',
      details: 'You do not have permission to access this resource'
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      error: 'Resource not found',
      details: 'The requested resource could not be found'
    });
  }

  if (err.name === 'RateLimitError') {
    return res.status(429).json({
      error: 'Too many requests',
      details: 'Please slow down and try again later'
    });
  }

  // Handle database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    return res.status(400).json({
      error: 'Data constraint violation',
      details: isProduction ? 'Please check your input data' : err.message
    });
  }

  if (err.code === 'SQLITE_BUSY') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      details: 'Database is busy, please try again'
    });
  }

  // Generic error response
  const statusCode = err.statusCode || 500;
  const message = isProduction ? 'Internal server error' : err.message;

  res.status(statusCode).json({
    error: 'Something went wrong',
    details: message,
    ...(isProduction && { requestId: generateRequestId() })
  });
}

/**
 * Generate unique request ID for error tracking
 */
function generateRequestId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * 404 handler for unmatched routes
 *
 * Why this matters:
 * - Prevents attackers from discovering valid endpoints
 * - Provides consistent error responses
 * - Logs attempted access to non-existent routes
 */
function notFoundHandler(req, res) {
  console.log('❌ 404: Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(404).json({
    error: 'Route not found',
    details: 'The requested endpoint does not exist'
  });
}

/**
 * Request timeout middleware
 *
 * Why this matters:
 * - Prevents long-running requests from blocking the server
 * - Protects against slow-loris attacks (keeping connections open)
 * - Ensures responsive server performance
 */
function requestTimeout(timeoutMs = 30000) { // 30 seconds default
  return (req, res, next) => {
    const timer = setTimeout(() => {
      console.log('⏰ TIMEOUT: Request timed out:', req.url);
      res.status(408).json({
        error: 'Request timeout',
        details: 'Request took too long to process'
      });
    }, timeoutMs);

    // Clear timeout when request completes
    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
}

/**
 * Request logging middleware
 *
 * Why this matters:
 * - Track all requests for security monitoring
 * - Identify suspicious patterns
 * - Debug issues more effectively
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Log request start
  console.log('📥 REQUEST:', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Log response when it completes
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log('📤 RESPONSE:', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  });

  next();
}

module.exports = {
  requestSizeLimits,
  errorHandler,
  notFoundHandler,
  requestTimeout,
  requestLogger
};
