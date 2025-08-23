/**
 * Production Logging System
 *
 * This logger handles different log levels and can write to:
 * - Console (development)
 * - Files (production)
 * - Both (if needed)
 *
 * Why proper logging matters in production:
 * - Track system performance and errors
 * - Monitor security events (failed logins, suspicious requests)
 * - Debug issues without console access
 * - Comply with business audit requirements
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/environment');

// Create logs directory if it doesn't exist
const logsDir = path.dirname(config.logging.file);
if (!fs.existsSync(logsDir)) {
  try {
    fs.mkdirSync(logsDir, { recursive: true });
    console.log('📁 LOGGER: Created logs directory:', logsDir);
  } catch (error) {
    console.error('❌ LOGGER: Failed to create logs directory:', error.message);
  }
}

/**
 * Log levels and their numeric values
 * Higher numbers = more important
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Get current log level numeric value
 */
function getCurrentLogLevel() {
  return LOG_LEVELS[config.logging.level] || LOG_LEVELS.info;
}

/**
 * Format log message with timestamp and metadata
 */
function formatLogMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...meta
  };

  return JSON.stringify(logEntry);
}

/**
 * Write log entry to file
 */
function writeToFile(logEntry) {
  if (!config.logging.enableFile) return;

  try {
    // Add newline for file writing
    fs.appendFileSync(config.logging.file, `${logEntry}\n`);
  } catch (error) {
    console.error('❌ LOGGER: Failed to write to log file:', error.message);
  }
}

/**
 * Write log entry to console
 */
function writeToConsole(logEntry) {
  if (!config.logging.enableConsole) return;

  const {
    timestamp, level, message, ...meta
  } = JSON.parse(logEntry);

  // Color coding for console output
  const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m', // Yellow
    INFO: '\x1b[36m', // Cyan
    DEBUG: '\x1b[35m' // Magenta
  };

  const reset = '\x1b[0m';
  const color = colors[level] || '';

  console.log(`${color}[${level}]${reset} ${timestamp} - ${message}`);

  // Log additional metadata if present
  if (Object.keys(meta).length > 0) {
    console.log(`${color}  └─${reset}`, meta);
  }
}

/**
 * Main logging function
 */
function log(level, message, meta = {}) {
  // Check if we should log this level
  if (LOG_LEVELS[level] > getCurrentLogLevel()) {
    return;
  }

  const logEntry = formatLogMessage(level, message, meta);

  // Write to appropriate outputs
  writeToFile(logEntry);
  writeToConsole(logEntry);
}

/**
 * Log rotation - prevent log files from getting too large
 */
function rotateLogs() {
  if (!config.logging.enableFile) return;

  try {
    const stats = fs.statSync(config.logging.file);
    const fileSizeInMB = stats.size / (1024 * 1024);

    if (fileSizeInMB > parseInt(config.logging.maxSize)) {
      // Create backup with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `${config.logging.file}.${timestamp}`;

      fs.renameSync(config.logging.file, backupFile);
      console.log('🔄 LOGGER: Rotated log file to:', backupFile);

      // Clean up old backup files
      cleanupOldLogs();
    }
  } catch (error) {
    // File might not exist yet, that's okay
  }
}

/**
 * Clean up old log files
 */
function cleanupOldLogs() {
  if (!config.logging.enableFile) return;

  try {
    const logsDir = path.dirname(config.logging.file);
    const files = fs.readdirSync(logsDir);

    // Find log backup files
    const logFiles = files.filter((file) => file.startsWith(path.basename(config.logging.file))
      && file.includes('.'));

    // Sort by modification time (oldest first)
    const sortedFiles = logFiles
      .map((file) => ({
        name: file,
        path: path.join(logsDir, file),
        mtime: fs.statSync(path.join(logsDir, file)).mtime
      }))
      .sort((a, b) => a.mtime - b.mtime);

    // Keep only the most recent files
    const maxFiles = config.logging.maxFiles || 5;
    if (sortedFiles.length > maxFiles) {
      const filesToDelete = sortedFiles.slice(0, sortedFiles.length - maxFiles);

      filesToDelete.forEach((file) => {
        fs.unlinkSync(file.path);
        console.log('🗑️ LOGGER: Deleted old log file:', file.name);
      });
    }
  } catch (error) {
    console.error('❌ LOGGER: Failed to cleanup old logs:', error.message);
  }
}

/**
 * Convenience methods for different log levels
 */
const logger = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta),

  // Special logging for security events
  security: (event, meta) => {
    log('info', `SECURITY: ${event}`, { ...meta, type: 'security' });
  },

  // Special logging for business events
  business: (event, meta) => {
    log('info', `BUSINESS: ${event}`, { ...meta, type: 'business' });
  },

  // Special logging for system events
  system: (event, meta) => {
    log('info', `SYSTEM: ${event}`, { ...meta, type: 'system' });
  }
};

// Rotate logs every hour
setInterval(rotateLogs, 60 * 60 * 1000);

// Initial log rotation check
rotateLogs();

module.exports = logger;
