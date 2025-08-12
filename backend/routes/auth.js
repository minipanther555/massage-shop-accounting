const express = require('express');
const router = express.Router();
const { loginRateLimiter, resetRateLimits } = require('../middleware/rate-limiter');

// In-memory session store (for development - in production would use Redis/database)
const sessions = new Map();

// Enhanced user store with simple passwords
const users = [
  {
    id: 1,
    username: 'reception',
    password: 'reception123', // Simple password for reception staff
    role: 'reception',
    displayName: 'Reception Staff',
    permissions: ['view_staff', 'view_services', 'view_transactions', 'create_transactions', 'view_summary']
  },
  {
    id: 2,
    username: 'manager', 
    password: 'manager456', // Simple password for management
    role: 'manager',
    displayName: 'Management',
    permissions: ['*'] // All permissions for managers
  }
];

// Generate simple session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Login endpoint with rate limiting
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('🔐 LOGIN ATTEMPT:', { username, passwordProvided: password ? 'Yes' : 'No' });
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      console.log('❌ LOGIN FAILED: User not found');
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password
    if (user.password !== password) {
      console.log('❌ LOGIN FAILED: Password mismatch for user:', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Create session
    const sessionId = generateSessionId();
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      permissions: user.permissions,
      loginTime: new Date(),
      lastActivity: new Date(),
      ipAddress: req.ip
    };
    
    sessions.set(sessionId, sessionData);
    
    console.log('✅ LOGIN SUCCESS:', { username, role: user.role, sessionId, ip: req.ip });
    
    // Return session info
    res.json({
      success: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        permissions: user.permissions
      }
    });
    
  } catch (error) {
    console.error('🚨 LOGIN ERROR:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Development endpoint to reset rate limits (REMOVE IN PRODUCTION!)
router.post('/reset-rate-limit', (req, res) => {
  resetRateLimits(req, res);
});

// Check session endpoint
router.get('/session', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (!sessionId) {
      return res.status(401).json({ error: 'No session provided' });
    }
    
    const session = sessions.get(sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Update last activity
    session.lastActivity = new Date();
    sessions.set(sessionId, session);
    
    res.json({
      valid: true,
      user: {
        id: session.userId,
        username: session.username,
        role: session.role,
        displayName: session.displayName,
        permissions: session.permissions
      },
      loginTime: session.loginTime,
      lastActivity: session.lastActivity
    });
    
  } catch (error) {
    console.error('🚨 SESSION CHECK ERROR:', error);
    res.status(500).json({ error: 'Session check failed' });
  }
});

// Logout endpoint
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    
    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      console.log('👋 LOGOUT:', { username: session.username, sessionId });
      sessions.delete(sessionId);
    }
    
    res.json({ success: true, message: 'Logged out successfully' });
    
  } catch (error) {
    console.error('🚨 LOGOUT ERROR:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get all active sessions (manager only - for debugging)
router.get('/sessions', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(sessionId);
    
    if (!session || session.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }
    
    const activeSessions = Array.from(sessions.entries()).map(([id, data]) => ({
      sessionId: id,
      username: data.username,
      role: data.role,
      displayName: data.displayName,
      loginTime: data.loginTime,
      lastActivity: data.lastActivity,
      ipAddress: data.ipAddress
    }));
    
    res.json({ sessions: activeSessions });
    
  } catch (error) {
    console.error('🚨 SESSIONS LIST ERROR:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

// Change password endpoint (for users to change their own password)
router.post('/change-password', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }
    
    // Find user
    const user = users.find(u => u.id === session.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    if (user.password !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password
    user.password = newPassword;
    
    console.log('🔑 PASSWORD CHANGED:', { username: user.username, role: user.role });
    
    res.json({ success: true, message: 'Password changed successfully' });
    
  } catch (error) {
    console.error('🚨 PASSWORD CHANGE ERROR:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

// Get user info endpoint
router.get('/user-info', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(sessionId);
    
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    res.json({
      user: {
        id: session.userId,
        username: session.username,
        role: session.role,
        displayName: session.displayName,
        permissions: session.permissions
      }
    });
    
  } catch (error) {
    console.error('🚨 USER INFO ERROR:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

module.exports = { router, sessions };
