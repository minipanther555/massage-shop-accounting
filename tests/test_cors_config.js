#!/usr/bin/env node

/**
 * Test CORS Configuration Loading
 * Verifies that the CORS configuration is being loaded correctly
 */

require('dotenv').config();

console.log('🔍 TESTING CORS CONFIGURATION LOADING...\n');

console.log('Environment Variables:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`ALLOWED_ORIGINS: ${process.env.ALLOWED_ORIGINS}`);
console.log(`PORT: ${process.env.PORT}`);

console.log('\nParsed ALLOWED_ORIGINS:');
if (process.env.ALLOWED_ORIGINS) {
    const origins = process.env.ALLOWED_ORIGINS.split(',');
    origins.forEach((origin, index) => {
        console.log(`  ${index + 1}. ${origin.trim()}`);
    });
} else {
    console.log('  ❌ ALLOWED_ORIGINS not set');
}

console.log('\nTesting CORS package configuration...');

// Test the CORS package configuration
const cors = require('cors');

const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8080'];

console.log('CORS allowedOrigins:', allowedOrigins);

const corsOptions = {
    origin: function (origin, callback) {
        console.log(`\nCORS check for origin: ${origin}`);
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            console.log('  ✅ Allowing request with no origin');
            return callback(null, true);
        }
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            console.log(`  ✅ Origin ${origin} is allowed`);
            return callback(null, true);
        } else {
            console.log(`  ❌ Origin ${origin} is NOT allowed`);
            console.log(`  Allowed origins: ${allowedOrigins.join(', ')}`);
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

console.log('\nCORS Options:', JSON.stringify(corsOptions, null, 2));

// Test specific origins
const testOrigins = [
    'http://109.123.238.197',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://example.com',
    null // No origin
];

console.log('\n🧪 Testing CORS origin validation...');
testOrigins.forEach(origin => {
    try {
        corsOptions.origin(origin, (error, allowed) => {
            if (error) {
                console.log(`Origin: ${origin || 'NO_ORIGIN'} -> ❌ BLOCKED: ${error.message}`);
            } else {
                console.log(`Origin: ${origin || 'NO_ORIGIN'} -> ✅ ALLOWED`);
            }
        });
    } catch (error) {
        console.log(`Origin: ${origin || 'NO_ORIGIN'} -> ❌ ERROR: ${error.message}`);
    }
});
