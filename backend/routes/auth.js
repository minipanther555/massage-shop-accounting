const express = require('express');
const router = express.Router();

// In-memory session store (for development - in production would use Redis/database)
const sessions = new Map();

// Simple user store (in production would be in database)
const users = [
  {
    id: 1,
    username: 'reception',
    password: '', // Empty password as requested
    role: 'reception'
  },
  {
    id: 2,
    username: 'manager', 
    password: '', // Empty password as requested
    role: 'manager'
  }
];

// Generate simple session ID
function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password = '' } = req.body;
    
    console.log('🔐 LOGIN ATTEMPT:', { username, passwordProvided: password !== '' });
    
    // Validate required fields
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      console.log('❌ LOGIN FAILED: User not found');
      return res.status(401).json({ error: 'Invalid username' });
    }
    
    // Check password (empty passwords allowed initially)
    if (user.password !== password) {
      console.log('❌ LOGIN FAILED: Password mismatch');
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    // Create session
    const sessionId = generateSessionId();
    const sessionData = {
      userId: user.id,
      username: user.username,
      role: user.role,
      loginTime: new Date(),
      lastActivity: new Date()
    };
    
    sessions.set(sessionId, sessionData);
    
    console.log('✅ LOGIN SUCCESS:', { username, role: user.role, sessionId });
    
    // Return session info
    res.json({
      success: true,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('🚨 LOGIN ERROR:', error);
    res.status(500).json({ error: 'Login failed' });
  }
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
        role: session.role
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
      loginTime: data.loginTime,
      lastActivity: data.lastActivity
    }));
    
    res.json({ sessions: activeSessions });
    
  } catch (error) {
    console.error('🚨 SESSIONS LIST ERROR:', error);
    res.status(500).json({ error: 'Failed to get sessions' });
  }
});

module.exports = router;
