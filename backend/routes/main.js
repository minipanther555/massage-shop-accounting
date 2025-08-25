const express = require('express');

const router = express.Router();
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all main routes (both reception and manager can access)
router.use(authenticateToken);

// Serve staff.html with CSRF protection
router.get('/staff-roster', (req, res) => {
  // Set cache-busting headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const filePath = path.join(__dirname, '..', '..', 'web-app', 'staff.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading staff.html:', err);
      return res.status(500).send('Error loading the page.');
    }
    console.log(`[MAIN.JS STAFF-ROSTER] CSRF token from res.locals: ${res.locals.csrfToken}`);
    const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
    res.send(modifiedHtml);
  });
});

// Serve transaction.html with CSRF protection
router.get('/transaction', (req, res) => {
  // Set cache-busting headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const filePath = path.join(__dirname, '..', '..', 'web-app', 'transaction.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading transaction.html:', err);
      return res.status(500).send('Error loading the page.');
    }
    console.log(`[MAIN.JS TRANSACTION] CSRF token from res.locals: ${res.locals.csrfToken}`);
    const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
    res.send(modifiedHtml);
  });
});

// Serve summary.html with CSRF protection
router.get('/summary', (req, res) => {
  // Set cache-busting headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const filePath = path.join(__dirname, '..', '..', 'web-app', 'summary.html');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading summary.html:', err);
      return res.status(500).send('Error loading the page.');
    }
    console.log(`[MAIN.JS SUMMARY] CSRF token from res.locals: ${res.locals.csrfToken}`);
    const modifiedHtml = data.replace('{{ an_actual_token }}', res.locals.csrfToken);
    res.send(modifiedHtml);
  });
});

module.exports = router;
