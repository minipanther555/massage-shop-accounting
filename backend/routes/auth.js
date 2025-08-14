const express = require('express');
const router = express.Router();
const { loginRateLimiter, resetRateLimits } = require('../middleware/rate-limiter');

// In-memory session store (for development - in production would use Redis/database)
const sessions = new Map();

// Enhanced user store with location-based access control
const users = [
  // Main Branch Users
  {
    id: 1,
    username: 'reception_main',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff - Main Branch',
    location_id: 1,
    location_name: 'Main Branch',
    permissions: ['view_staff', 'view_services', 'view_transactions', 'create_transactions', 'view_summary'],
    active: true
  },
  {
    id: 2,
    username: 'manager_main',
    password: 'manager456',
    role: 'manager',
    displayName: 'Manager - Main Branch',
    location_id: 1,
    location_name: 'Main Branch',
    permissions: ['*'], // All permissions for managers
    active: true
  },
  
  // Downtown Branch Users
  {
    id: 3,
    username: 'reception_downtown',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff - Downtown',
    location_id: 2,
    location_name: 'Downtown',
    permissions: ['view_staff', 'view_services', 'view_transactions', 'create_transactions', 'view_summary'],
    active: true
  },
  {
    id: 4,
    username: 'manager_downtown',
    password: 'manager456',
    role: 'manager',
    displayName: 'Manager - Downtown',
    location_id: 2,
    location_name: 'Downtown',
    permissions: ['*'], // All permissions for managers
    active: true
  },
  
  // Suburban Branch Users
  {
    id: 5,
    username: 'reception_suburban',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff - Suburban',
    location_id: 3,
    location_name: 'Suburban',
    permissions: ['view_staff', 'view_services', 'view_transactions', 'create_transactions', 'view_summary'],
    active: true
  },
  {
    id: 6,
    username: 'manager_suburban',
    password: 'manager456',
    role: 'manager',
    displayName: 'Manager - Suburban',
    location_id: 3,
    location_name: 'Suburban',
    permissions: ['*'], // All permissions for managers
    active: true
  },
  
  // Legacy users for backward compatibility (assigned to Main Branch)
  {
    id: 7,
    username: 'reception',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff',
    location_id: 1,
    location_name: 'Main Branch',
    permissions: ['view_staff', 'view_services', 'view_transactions', 'create_transactions', 'view_summary'],
    active: true
  },
  {
    id: 8,
    username: 'manager',
    password: 'manager456',
    role: 'manager',
    displayName: 'Management',
    location_id: 1,
    location_name: 'Main Branch',
    permissions: ['*'], // All permissions for managers
    active: true
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
      location_id: user.location_id,
      location_name: user.location_name,
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
        location_id: user.location_id,
        location_name: user.location_name,
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
        location_id: session.location_id,
        location_name: session.location_name,
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
      location_id: data.location_id,
      location_name: data.location_name,
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
        displayName: session.username,
        location_id: session.location_id,
        location_name: session.location_name,
        permissions: session.permissions
      }
    });
    
  } catch (error) {
    console.error('🚨 USER INFO ERROR:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Get all users endpoint (manager only - for user management)
router.get('/users', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(sessionId);
    
    if (!session || session.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }
    
    // Filter out sensitive information
    const userList = users.map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      displayName: user.displayName,
      location_id: user.location_id,
      location_name: user.location_name,
      active: user.active
    }));
    
    res.json({ users: userList });
    
  } catch (error) {
    console.error('🚨 USERS LIST ERROR:', error);
    res.status(500).json({ error: 'Failed to get users list' });
  }
});

// Get users by location endpoint (manager only)
router.get('/users/location/:locationId', async (req, res) => {
  try {
    const sessionId = req.headers.authorization?.replace('Bearer ', '');
    const session = sessions.get(sessionId);
    
    if (!session || session.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }
    
    const locationId = parseInt(req.params.locationId);
    
    // Filter users by location
    const locationUsers = users
      .filter(user => user.location_id === locationId && user.active)
      .map(user => ({
        id: user.id,
        username: user.username,
        role: user.role,
        displayName: user.displayName,
        location_id: user.location_id,
        location_name: user.location_name,
        active: user.active
      }));
    
    res.json({ users: locationUsers, location_id: locationId });
    
  } catch (error) {
    console.error('🚨 LOCATION USERS ERROR:', error);
    res.status(500).json({ error: 'Failed to get location users' });
  }
});

module.exports = { router, sessions };
