const express = require('express');

const router = express.Router();
const { loginRateLimiter, resetRateLimits } = require('../middleware/rate-limiter');

// In-memory session store (for development - in production would use Redis/database)
const sessions = new Map();

const receptionPermissions = ['view_staff', 'view_services', 'view_transactions', 'create_transactions', 'view_summary'];
const branches = [
  { key: 'top_thai_49', location_id: 49, location_name: 'Top Thai 49' },
  { key: 'top_thai_43', location_id: 43, location_name: 'Top Thai 43' },
  { key: 'top_thai_33', location_id: 33, location_name: 'Top Thai 33' },
  { key: 'top_thai_thonglor_9', location_id: 9, location_name: 'Top Thai Thonglor 9' }
];

function createBranchUsers() {
  return branches.flatMap((branch, index) => {
    const baseId = (index * 2) + 1;
    return [
      {
        id: baseId,
        username: `reception_${branch.key}`,
        password: 'reception123',
        role: 'reception',
        displayName: `Reception Staff - ${branch.location_name}`,
        location_id: branch.location_id,
        location_name: branch.location_name,
        permissions: receptionPermissions,
        active: true
      },
      {
        id: baseId + 1,
        username: `manager_${branch.key}`,
        password: 'manager456',
        role: 'manager',
        displayName: `Manager - ${branch.location_name}`,
        location_id: branch.location_id,
        location_name: branch.location_name,
        permissions: ['*'],
        active: true
      }
    ];
  });
}

// Enhanced user store with location-based access control
const users = [
  ...createBranchUsers(),

  // Main Branch Users
  {
    id: 101,
    username: 'reception_main',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff - Main Branch',
    location_id: 1,
    location_name: 'Main Branch',
    permissions: receptionPermissions,
    active: true
  },
  {
    id: 102,
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
    id: 103,
    username: 'reception_downtown',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff - Downtown',
    location_id: 2,
    location_name: 'Downtown',
    permissions: receptionPermissions,
    active: true
  },
  {
    id: 104,
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
    id: 105,
    username: 'reception_suburban',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff - Suburban',
    location_id: 3,
    location_name: 'Suburban',
    permissions: receptionPermissions,
    active: true
  },
  {
    id: 106,
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
    id: 107,
    username: 'reception',
    password: 'reception123',
    role: 'reception',
    displayName: 'Reception Staff',
    location_id: 1,
    location_name: 'Main Branch',
    permissions: receptionPermissions,
    active: true
  },
  {
    id: 108,
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
    const user = users.find((u) => u.username === username);
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

    console.log('✅ LOGIN SUCCESS:', {
      username, role: user.role, sessionId, ip: req.ip
    });

    // Set secure session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
      sameSite: 'strict',
      maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    });

    // Return user info (without sessionId)
    res.json({
      success: true,
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
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Rate limit reset not allowed in production' });
  }

  resetRateLimits(req, res);
});

// Check session endpoint
router.get('/session', async (req, res) => {
  try {
    const { sessionId } = req.cookies;

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
    const { sessionId } = req.cookies;

    if (sessionId && sessions.has(sessionId)) {
      const session = sessions.get(sessionId);
      console.log('👋 LOGOUT:', { username: session.username, sessionId });
      sessions.delete(sessionId);
    }

    // Clear the session cookie
    res.clearCookie('sessionId');

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('🚨 LOGOUT ERROR:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get all active sessions (manager only - for debugging)
router.get('/sessions', async (req, res) => {
  try {
    const { sessionId } = req.cookies;
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
    const { sessionId } = req.cookies;
    const session = sessions.get(sessionId);

    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Find user
    const user = users.find((u) => u.id === session.userId);
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
    const { sessionId } = req.cookies;
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
    const { sessionId } = req.cookies;
    const session = sessions.get(sessionId);

    if (!session || session.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    // Filter out sensitive information
    const userList = users.map((user) => ({
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
    const { sessionId } = req.cookies;
    const session = sessions.get(sessionId);

    if (!session || session.role !== 'manager') {
      return res.status(403).json({ error: 'Manager access required' });
    }

    const locationId = parseInt(req.params.locationId);

    // Filter users by location
    const locationUsers = users
      .filter((user) => user.location_id === locationId && user.active)
      .map((user) => ({
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
