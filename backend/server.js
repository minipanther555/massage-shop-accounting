const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// EXTENSIVE STARTUP LOGGING - TESTING ALL HYPOTHESES
console.log('=== STARTUP DIAGNOSTIC LOGGING STARTED ===');
console.log('Timestamp:', new Date().toISOString());
console.log('Process ID:', process.pid);
console.log('User ID:', process.getuid());
console.log('Group ID:', process.getgid());
console.log('Current Working Directory:', process.cwd());
console.log('Node.js Version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);

// Test Hypothesis 1: File Permission/Path Issue
console.log('=== TESTING HYPOTHESIS 1: FILE PERMISSIONS ===');
try {
    const dbPath = path.join(__dirname, 'data', 'massage_shop.db');
    console.log('Database path:', dbPath);
    console.log('Database exists:', fs.existsSync(dbPath));
    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log('Database permissions:', stats.mode.toString(8));
        console.log('Database owner:', stats.uid);
        console.log('Database group:', stats.gid);
        console.log('Database readable:', fs.accessSync(dbPath, fs.constants.R_OK) ? 'YES' : 'NO');
        console.log('Database writable:', fs.accessSync(dbPath, fs.constants.W_OK) ? 'YES' : 'NO');
    }
    
    const configPath = path.join(__dirname, 'config', 'environment.js');
    console.log('Config path:', configPath);
    console.log('Config exists:', fs.existsSync(configPath));
    if (fs.existsSync(configPath)) {
        const stats = fs.statSync(configPath);
        console.log('Config permissions:', stats.mode.toString(8));
        console.log('Config readable:', fs.accessSync(configPath, fs.constants.R_OK) ? 'YES' : 'NO');
    }
    
    const logsDir = path.join(__dirname, 'logs');
    console.log('Logs directory:', logsDir);
    console.log('Logs directory exists:', fs.existsSync(logsDir));
    if (fs.existsSync(logsDir)) {
        const stats = fs.statSync(logsDir);
        console.log('Logs directory permissions:', stats.mode.toString(8));
        console.log('Logs directory writable:', fs.accessSync(logsDir, fs.constants.W_OK) ? 'YES' : 'NO');
    }
} catch (error) {
    console.log('ERROR testing file permissions:', error.message);
    console.log('ERROR stack:', error.stack);
}

// Test Hypothesis 2: Environment Variables
console.log('=== TESTING HYPOTHESIS 2: ENVIRONMENT VARIABLES ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DB_PATH:', process.env.DB_PATH);
console.log('LOG_LEVEL:', process.env.LOG_LEVEL);
console.log('All environment variables:', Object.keys(process.env).sort());

// Test Hypothesis 3: Working Directory Contents
console.log('=== TESTING HYPOTHESIS 3: WORKING DIRECTORY ===');
try {
    const currentDir = process.cwd();
    console.log('Current directory contents:');
    const files = fs.readdirSync(currentDir);
    files.forEach(file => {
        try {
            const filePath = path.join(currentDir, file);
            const stats = fs.statSync(filePath);
            console.log(`  ${file} - ${stats.isDirectory() ? 'DIR' : 'FILE'} - ${stats.mode.toString(8)}`);
        } catch (e) {
            console.log(`  ${file} - ERROR: ${e.message}`);
        }
    });
    
    console.log('Backend directory contents:');
    const backendDir = path.join(currentDir, 'backend');
    if (fs.existsSync(backendDir)) {
        const backendFiles = fs.readdirSync(backendDir);
        backendFiles.forEach(file => {
            try {
                const filePath = path.join(backendDir, file);
                const stats = fs.statSync(filePath);
                console.log(`  ${file} - ${stats.isDirectory() ? 'DIR' : 'FILE'} - ${stats.mode.toString(8)}`);
            } catch (e) {
                console.log(`  ${file} - ERROR: ${e.message}`);
            }
        });
    }
} catch (error) {
    console.log('ERROR testing working directory:', error.message);
    console.log('ERROR stack:', error.stack);
}

// Test Hypothesis 4: Node.js Modules
console.log('=== TESTING HYPOTHESIS 4: NODE.JS MODULES ===');
try {
    console.log('Express version:', require('express/package.json').version);
    console.log('CORS version:', require('cors/package.json').version);
    console.log('Helmet version:', require('helmet/package.json').version);
    console.log('SQLite3 available:', typeof require('sqlite3') !== 'undefined');
    console.log('Path module available:', typeof path !== 'undefined');
    console.log('FS module available:', typeof fs !== 'undefined');
} catch (error) {
    console.log('ERROR testing Node.js modules:', error.message);
    console.log('ERROR stack:', error.stack);
}

// Test Hypothesis 5: Database State
console.log('=== TESTING HYPOTHESIS 5: DATABASE STATE ===');
try {
    const dbPath = path.join(__dirname, 'data', 'massage_shop.db');
    if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log('Database size:', stats.size, 'bytes');
        console.log('Database last modified:', stats.mtime);
        console.log('Database last accessed:', stats.atime);
        
        // Try to read first few bytes to check if locked
        const fd = fs.openSync(dbPath, 'r');
        const buffer = Buffer.alloc(16);
        const bytesRead = fs.readSync(fd, buffer, 0, 16, 0);
        fs.closeSync(fd);
        console.log('Database header bytes:', buffer.toString('hex'));
        console.log('Database readable (not locked): YES');
    } else {
        console.log('Database file does not exist');
    }
} catch (error) {
    console.log('ERROR testing database state:', error.message);
    console.log('ERROR stack:', error.stack);
}

console.log('=== STARTUP DIAGNOSTIC LOGGING COMPLETED ===');
console.log('Now attempting to start Express server...');

console.log('=== LOADING ENVIRONMENT CONFIG ===');
require('dotenv').config();
console.log('Environment config loaded');

console.log('=== LOADING DATABASE MODULE ===');
const database = require('./models/database');
console.log('Database module loaded successfully');

console.log('=== LOADING MIDDLEWARE MODULES ===');
const { validateCSRFToken, addCSRFToken } = require('./middleware/csrf-protection');
console.log('CSRF middleware loaded successfully');

console.log('=== LOADING ROUTE MODULES ===');

// Declare route variables in outer scope
let adminRoutes, authRoutes, expenseRoutes, paymentTypeRoutes, reportRoutes, serviceRoutes, staffRoutes, transactionRoutes;

console.log('Loading admin routes...');
try {
    adminRoutes = require('./routes/admin');
    console.log('Admin routes loaded successfully');
} catch (error) {
    console.error('ERROR loading admin routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading auth routes...');
try {
    authRoutes = require('./routes/auth');
    console.log('Auth routes loaded successfully');
} catch (error) {
    console.error('ERROR loading auth routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading expense routes...');
try {
    expenseRoutes = require('./routes/expenses');
    console.log('Expense routes loaded successfully');
} catch (error) {
    console.error('ERROR loading expense routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading payment type routes...');
try {
    paymentTypeRoutes = require('./routes/payment-types');
    console.log('Payment type routes loaded successfully');
} catch (error) {
    console.error('ERROR loading payment type routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading report routes...');
try {
    reportRoutes = require('./routes/reports');
    console.log('Report routes loaded successfully');
} catch (error) {
    console.error('ERROR loading report routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading service routes...');
try {
    serviceRoutes = require('./routes/services');
    console.log('Service routes loaded successfully');
} catch (error) {
    console.error('ERROR loading service routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading staff routes...');
try {
    staffRoutes = require('./routes/staff');
    console.log('Staff routes loaded successfully');
} catch (error) {
    console.error('ERROR loading staff routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Loading transaction routes...');
try {
    transactionRoutes = require('./routes/transactions');
    console.log('Transaction routes loaded successfully');
} catch (error) {
    console.error('ERROR loading transaction routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('=== CREATING EXPRESS APP ===');
const app = express();
console.log('Express app created successfully');

const PORT = process.env.PORT || 3000;
console.log('Port configured:', PORT);

console.log('=== SETTING UP MIDDLEWARE ===');
console.log('Setting up CORS...');
try {
    app.use(cors({ exposedHeaders: ['X-CSRF-Token'] }));
    console.log('CORS middleware added successfully');
} catch (error) {
    console.error('ERROR setting up CORS:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Setting up JSON parser...');
try {
    app.use(express.json());
    console.log('JSON parser middleware added successfully');
} catch (error) {
    console.error('ERROR setting up JSON parser:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Setting up Helmet...');
try {
    app.use(helmet({ contentSecurityPolicy: false }));
    console.log('Helmet middleware added successfully');
} catch (error) {
    console.error('ERROR setting up Helmet:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Setting up CSRF token...');
try {
    app.use(addCSRFToken);
    console.log('CSRF token middleware added successfully');
} catch (error) {
    console.error('ERROR setting up CSRF token:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

// Add request logging middleware for Hypothesis 4 testing
app.use((req, res, next) => {
  console.log('🔍 [HYPOTHESIS TEST] Incoming request received');
  console.log('🔍 [HYPOTHESIS TEST] Request URL:', req.url);
  console.log('🔍 [HYPOTHESIS TEST] Request method:', req.method);
  console.log('🔍 [HYPOTHESIS TEST] Request headers:', req.headers);
  console.log('🔍 [HYPOTHESIS TEST] Request IP:', req.ip);
  console.log('🔍 [HYPOTHESIS TEST] Request hostname:', req.hostname);
  console.log('🔍 [HYPOTHESIS TEST] Request protocol:', req.protocol);
  console.log('🔍 [HYPOTHESIS TEST] Request path:', req.path);
  console.log('🔍 [HYPOTHESIS TEST] Request query:', req.query);
  console.log('🔍 [HYPOTHESIS TEST] Request body:', req.body);
  console.log('🔍 [HYPOTHESIS TEST] Request origin:', req.get('Origin'));
  console.log('🔍 [HYPOTHESIS TEST] Request referer:', req.get('Referer'));
  console.log('🔍 [HYPOTHESIS TEST] Request user-agent:', req.get('User-Agent'));
  next();
});

console.log('=== SETTING UP STATIC FILE SERVING ===');
try {
    // Serve static files from the web-app directory
    app.use(express.static(path.join(__dirname, '..', 'web-app'), {
        setHeaders: (res, path) => {
            if (path.endsWith('.js') || path.endsWith('.css')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }
    }));
    console.log('Static file serving middleware added successfully');
    console.log('Serving frontend files from:', path.join(__dirname, '..', 'web-app'));
} catch (error) {
    console.error('ERROR setting up static file serving:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('=== SETTING UP ROUTES ===');
// Health check endpoint
try {
    app.get('/health', (req, res) => {
      console.log('Health check endpoint hit');
      res.json({ status: 'OK' });
    });
    console.log('Health check route added successfully');
} catch (error) {
    console.error('ERROR setting up health check route:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

// API routes
console.log('Adding auth routes...');
try {
    app.use('/api/auth', authRoutes);
    console.log('Auth routes added successfully');
} catch (error) {
    console.error('ERROR adding auth routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding admin routes...');
try {
    app.use('/api/admin', adminRoutes);
    console.log('Admin routes added successfully');
} catch (error) {
    console.error('ERROR adding admin routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding expense routes...');
try {
    app.use('/api/expenses', expenseRoutes);
    console.log('Expense routes added successfully');
} catch (error) {
    console.error('ERROR adding expense routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding payment type routes...');
try {
    app.use('/api/payment-types', paymentTypeRoutes);
    console.log('Payment type routes added successfully');
} catch (error) {
    console.error('ERROR adding payment type routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding report routes...');
try {
    app.use('/api/reports', reportRoutes);
    console.log('Report routes added successfully');
} catch (error) {
    console.error('ERROR adding report routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding service routes...');
try {
    app.use('/api/services', serviceRoutes);
    console.log('Service routes added successfully');
} catch (error) {
    console.error('ERROR adding service routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding staff routes...');
try {
    app.use('/api/staff', staffRoutes);
    console.log('Staff routes added successfully');
} catch (error) {
    console.error('ERROR adding staff routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('Adding transaction routes...');
try {
    app.use('/api/transactions', transactionRoutes);
    console.log('Transaction routes added successfully');
} catch (error) {
    console.error('ERROR adding transaction routes:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('=== SETTING UP FRONTEND ROUTING ===');
try {
    // Catch-all route for SPA - serve index.html for any non-API routes
    app.get('*', (req, res) => {
        // Don't serve HTML for API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        // Serve index.html for all other routes (SPA routing)
        const indexPath = path.join(__dirname, '..', 'web-app', 'index.html');
        console.log('Serving frontend route:', req.path, '->', indexPath);
        res.sendFile(indexPath);
    });
    console.log('Frontend SPA routing middleware added successfully');
} catch (error) {
    console.error('ERROR setting up frontend routing:', error.message);
    console.error('ERROR stack:', error.stack);
    throw error;
}

console.log('=== ALL ROUTES AND MIDDLEWARE SETUP COMPLETED ===');

// Initialize database and start server
async function startServer() {
  console.log('=== STARTING SERVER FUNCTION ===');
  try {
    console.log('Attempting to connect to database...');
    try {
        await database.connect();
        console.log('Database connected successfully');
    } catch (dbError) {
        console.error('=== DATABASE CONNECTION ERROR ===');
        console.error('Database error type:', dbError.constructor.name);
        console.error('Database error message:', dbError.message);
        console.error('Database error code:', dbError.code);
        console.error('Database error stack:', dbError.stack);
        throw dbError;
    }
    
    console.log('=== ATTEMPTING TO BIND TO PORT ===');
    console.log('Port to bind:', PORT);
    console.log('Current process user:', process.getuid());
    console.log('Current process group:', process.getgid());
    console.log('About to call app.listen()...');
    
    try {
        app.listen(PORT, () => {
          console.log(`🚀 Server running on port ${PORT}`);
          console.log('=== SERVER STARTUP COMPLETED SUCCESSFULLY ===');
        });
        
        console.log('app.listen() called successfully, waiting for callback...');
    } catch (listenError) {
        console.error('=== PORT BINDING ERROR ===');
        console.error('Listen error type:', listenError.constructor.name);
        console.error('Listen error message:', listenError.message);
        console.error('Listen error code:', listenError.code);
        console.error('Listen error stack:', listenError.stack);
        throw listenError;
    }
  } catch (error) {
    console.error('=== CRITICAL ERROR IN STARTUP ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

console.log('=== CALLING START SERVER FUNCTION ===');
startServer();
console.log('startServer() function called, exiting main execution context');

// Add process error handlers to catch any unhandled errors
console.log('=== SETTING UP PROCESS ERROR HANDLERS ===');
process.on('uncaughtException', (error) => {
    console.error('=== UNCAUGHT EXCEPTION ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Process will exit due to uncaught exception');
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('=== UNHANDLED PROMISE REJECTION ===');
    console.error('Reason:', reason);
    console.error('Promise:', promise);
    console.error('Process will exit due to unhandled promise rejection');
    process.exit(1);
});

process.on('exit', (code) => {
    console.log('=== PROCESS EXITING ===');
    console.log('Exit code:', code);
});

console.log('=== ALL ERROR HANDLERS SETUP COMPLETED ===');
console.log('=== READY TO START SERVER ===');
