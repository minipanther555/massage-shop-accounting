/**
 * Environment Configuration System
 * 
 * This file manages different configuration settings for:
 * - Development (local testing)
 * - Production (VPS deployment)
 * - Testing (automated tests)
 * 
 * Why this matters:
 * - Different security levels for different environments
 * - Environment-specific database connections
 * - Different logging levels
 * - Environment-specific feature flags
 */

const path = require('path');

// Determine current environment
const NODE_ENV = process.env.NODE_ENV || 'development';

// Base configuration (common to all environments)
const baseConfig = {
  // Application settings
  app: {
    name: 'EIW Massage Shop Bookkeeping System',
    version: '1.0.0',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // Database settings
  database: {
    type: 'sqlite', // Could be 'postgresql' or 'mysql' in production
    filename: path.join(__dirname, '../data/massage_shop.db'),
    // Production database settings (when you move to PostgreSQL/MySQL)
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    username: process.env.DB_USERNAME || 'massage_shop',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'massage_shop'
  },
  
  // Security settings
  security: {
    // Session settings
    sessionSecret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    
    // Password settings
    passwordMinLength: 8,
    passwordMaxLength: 100,
    passwordRequireComplexity: false, // Keep simple for your users
    
    // Rate limiting
    loginAttempts: 5,
    loginWindowMs: 15 * 60 * 1000, // 15 minutes
    apiRequests: 100,
    apiWindowMs: 15 * 60 * 1000, // 15 minutes
    
    // CSRF protection
    csrfTokenExpiry: 24 * 60 * 60 * 1000, // 24 hours
    
    // Request limits
    maxBodySize: '1mb',
    maxUrlLength: 2048,
    maxHeadersSize: '16kb',
    requestTimeout: 30000 // 30 seconds
  },
  
  // Logging settings
  logging: {
    level: process.env.LOG_LEVEL || 'info', // error, warn, info, debug
    file: process.env.LOG_FILE || path.join(__dirname, '../logs/app.log'),
    maxSize: '10mb',
    maxFiles: 5,
    enableConsole: true,
    enableFile: false // Enable in production
  },
  
  // CORS settings
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true
  }
};

// Development environment configuration
const developmentConfig = {
  ...baseConfig,
  security: {
    ...baseConfig.security,
    // Relaxed security for development
    sessionSecret: 'dev-secret-key-not-for-production',
    passwordRequireComplexity: false,
    loginAttempts: 10, // More attempts for development
    apiRequests: 1000 // More API requests for development
  },
  logging: {
    ...baseConfig.logging,
    level: 'debug', // More verbose logging
    enableConsole: true,
    enableFile: false
  },
  cors: {
    ...baseConfig.cors,
    allowedOrigins: ['http://localhost:3000', 'http://localhost:8080', 'http://127.0.0.1:3000']
  }
};

// Production environment configuration
const productionConfig = {
  ...baseConfig,
  security: {
    ...baseConfig.security,
    // Strict security for production - validation happens later
    sessionSecret: process.env.SESSION_SECRET || 'placeholder-will-be-validated',
    passwordRequireComplexity: false, // Keep simple for your users
    loginAttempts: 5, // Fewer attempts for production
    apiRequests: 100, // Fewer API requests for production
    requestTimeout: 15000 // 15 seconds (faster timeout in production)
  },
  logging: {
    ...baseConfig.logging,
    level: 'info', // Less verbose logging
    enableConsole: false, // No console logging in production
    enableFile: true, // File logging in production
    file: '/var/log/massage-shop/app.log' // Production log location
  },
  cors: {
    ...baseConfig.cors,
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['https://yourdomain.com', 'https://www.yourdomain.com'] // Production domains
  }
};

// Testing environment configuration
const testingConfig = {
  ...baseConfig,
  database: {
    ...baseConfig.database,
    filename: ':memory:', // In-memory database for tests
    host: 'localhost',
    port: 5432,
    username: 'test_user',
    password: 'test_password',
    database: 'massage_shop_test'
  },
  security: {
    ...baseConfig.security,
    sessionSecret: 'test-secret-key',
    loginAttempts: 100, // Many attempts for testing
    apiRequests: 10000 // Many API requests for testing
  },
  logging: {
    ...baseConfig.logging,
    level: 'error', // Minimal logging for tests
    enableConsole: false,
    enableFile: false
  }
};

// Export configuration based on environment
let config;
switch (NODE_ENV) {
  case 'production':
    config = productionConfig;
    console.log('🏭 PRODUCTION: Using production configuration');
    
    // Validate production configuration ONLY when production is selected
    const requiredEnvVars = ['SESSION_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ PRODUCTION ERROR: Missing required environment variables:', missingVars);
      console.error('Please set these variables before starting the production server');
      process.exit(1);
    }
    
    // Validate session secret is properly set
    if (!process.env.SESSION_SECRET) {
      console.error('❌ PRODUCTION ERROR: SESSION_SECRET environment variable is required');
      process.exit(1);
    }
    
    // Update the config with the validated session secret
    config.security.sessionSecret = process.env.SESSION_SECRET;
    break;
    
  case 'testing':
    config = testingConfig;
    console.log('🧪 TESTING: Using testing configuration');
    break;
    
  case 'development':
  default:
    config = developmentConfig;
    console.log('🔧 DEVELOPMENT: Using development configuration');
    break;
}

module.exports = config;
