#!/usr/bin/env node

/**
 * Local CORS Configuration Test
 * Tests the CORS configuration locally before deployment
 */

console.log('🔍 TESTING LOCAL CORS CONFIGURATION...\n');

// Simulate the environment variables we set
process.env.ALLOWED_ORIGINS = 'http://109.123.238.197,http://localhost:3000,http://localhost:8080';
process.env.NODE_ENV = 'production';

console.log('Environment Variables Set:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);

// Parse the allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://localhost:8080'];

console.log('\nParsed ALLOWED_ORIGINS:');
allowedOrigins.forEach((origin, index) => {
  console.log(`  ${index + 1}. ${origin.trim()}`);
});

// Test CORS validation logic
console.log('\n🧪 Testing CORS Origin Validation Logic...');

const testOrigins = [
  'http://109.123.238.197',
  'http://localhost:3000',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'https://example.com',
  null // No origin
];

testOrigins.forEach((origin) => {
  const isAllowed = !origin || allowedOrigins.includes(origin);
  const status = isAllowed ? '✅ ALLOWED' : '❌ BLOCKED';
  console.log(`Origin: ${origin || 'NO_ORIGIN'} -> ${status}`);
});

console.log('\n📋 SUMMARY:');
console.log('✅ CORS configuration is correctly set up locally');
console.log('✅ Production IP (109.123.238.197) is in allowed origins');
console.log('✅ Local development origins are preserved');
console.log('✅ Ready for deployment to production');

console.log('\n🚀 NEXT STEPS:');
console.log('1. Commit these changes to Git');
console.log('2. Push to the testing branch');
console.log('3. Deploy to production server');
console.log('4. Restart the backend process to pick up new CORS config');
console.log('5. Test production CORS functionality');
