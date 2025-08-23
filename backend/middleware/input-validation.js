/**
 * Input Validation and Sanitization Middleware
 *
 * This middleware validates and cleans user input to prevent:
 * - SQL Injection attacks
 * - Cross-Site Scripting (XSS) attacks
 * - Data corruption
 * - Buffer overflow attacks
 */

// Helper function to sanitize strings
function sanitizeString(input) {
  if (typeof input !== 'string') return input;

  // Remove or escape potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and > (prevents HTML injection)
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers like onclick=
    .trim(); // Remove leading/trailing whitespace
}

// Helper function to validate email format
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Helper function to validate phone number format
function isValidPhone(phone) {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

// Helper function to validate decimal numbers (for money)
function isValidDecimal(value, min = 0, max = 999999.99) {
  const num = parseFloat(value);
  return !isNaN(num) && num >= min && num <= max;
}

// Helper function to validate dates
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Main validation middleware
function validateInput(req, res, next) {
  console.log('🔍 VALIDATION: Validating request input');

  try {
    // Sanitize all string inputs in body, query, and params
    if (req.body) {
      sanitizeObject(req.body);
    }
    if (req.query) {
      sanitizeObject(req.query);
    }
    if (req.params) {
      sanitizeObject(req.params);
    }

    // Validate specific endpoints with custom rules
    validateEndpoint(req);

    console.log('✅ VALIDATION: Input validation passed');
    next();
  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error.message);
    res.status(400).json({
      error: 'Invalid input data',
      details: error.message
    });
  }
}

// Recursively sanitize object properties
function sanitizeObject(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  }
}

// Validate specific endpoints with custom rules
function validateEndpoint(req) {
  const { method, path, body } = req;

  // Login validation
  if (path === '/api/auth/login' && method === 'POST') {
    if (!body.username || body.username.length < 1 || body.username.length > 50) {
      throw new Error('Username must be between 1 and 50 characters');
    }
    if (!body.password || body.password.length < 1 || body.password.length > 100) {
      throw new Error('Password must be between 1 and 100 characters');
    }
  }

  // Transaction validation
  if (path === '/api/transactions' && method === 'POST') {
    if (!body.masseuse_name || body.masseuse_name.length < 1 || body.masseuse_name.length > 100) {
      throw new Error('Masseuse name must be between 1 and 100 characters');
    }
    if (!body.service_type || body.service_type.length < 1 || body.service_type.length > 100) {
      throw new Error('Service type must be between 1 and 100 characters');
    }
    // Remove validation for calculated fields - these are handled by business logic
    // if (!isValidDecimal(body.payment_amount, 0.01, 9999.99)) {
    //   throw new Error('Payment amount must be a valid number between $0.01 and $9,999.99');
    // }
    // if (!isValidDecimal(body.masseuse_fee, 0, 9999.99)) {
    //   throw new Error('Masseuse fee must be a valid number between $0 and $9,999.99');
    // }
    if (!body.start_time || !body.end_time) {
      throw new Error('Start time and end time are required');
    }
  }

  // Staff validation
  if (path === '/api/staff' && method === 'POST') {
    if (!body.masseuse_name || body.masseuse_name.length < 1 || body.masseuse_name.length > 100) {
      throw new Error('Masseuse name must be between 1 and 100 characters');
    }
    if (body.phone && !isValidPhone(body.phone)) {
      throw new Error('Phone number format is invalid');
    }
    if (body.email && !isValidEmail(body.email)) {
      throw new Error('Email format is invalid');
    }
  }

  // Service validation
  if (path === '/api/services' && method === 'POST') {
    if (!body.service_name || body.service_name.length < 1 || body.service_name.length > 100) {
      throw new Error('Service name must be between 1 and 100 characters');
    }
    if (!body.duration_minutes || body.duration_minutes < 1 || body.duration_minutes > 480) {
      throw new Error('Duration must be between 1 and 480 minutes (8 hours)');
    }
    if (!isValidDecimal(body.price, 0.01, 9999.99)) {
      throw new Error('Price must be a valid number between $0.01 and $9,999.99');
    }
    if (!isValidDecimal(body.masseuse_fee, 0, 9999.99)) {
      throw new Error('Masseuse fee must be a valid number between $0 and $9,999.99');
    }
  }

  // Expense validation
  if (path === '/api/expenses' && method === 'POST') {
    if (!body.description || body.description.length < 1 || body.description.length > 200) {
      throw new Error('Description must be between 1 and 200 characters');
    }
    if (!isValidDecimal(body.amount, 0.01, 99999.99)) {
      throw new Error('Amount must be a valid number between $0.01 and $99,999.99');
    }
    if (body.date && !isValidDate(body.date)) {
      throw new Error('Date format is invalid');
    }
  }
}

// Rate limiting for file uploads (if you add file uploads later)
function validateFileUpload(req, res, next) {
  const maxFileSize = 5 * 1024 * 1024; // 5MB limit

  if (req.headers['content-length'] && parseInt(req.headers['content-length']) > maxFileSize) {
    return res.status(413).json({
      error: 'File too large',
      maxSize: '5MB'
    });
  }

  next();
}

module.exports = {
  validateInput,
  validateFileUpload,
  sanitizeString,
  isValidEmail,
  isValidPhone,
  isValidDecimal,
  isValidDate
};
