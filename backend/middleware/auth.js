const express = require('express');

// Import the sessions store from auth routes
// In a real app, this would be a shared session store (Redis, database, etc.)
const { sessions } = require('../routes/auth');

/**
 * Authentication middleware that extracts session from Authorization header
 * and populates req.user with user data
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
        console.log('❌ AUTH: No token provided');
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Look up session
    const session = sessions.get(token);
    if (!session) {
        console.log('❌ AUTH: Invalid token:', token);
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Update last activity
    session.lastActivity = new Date();
    sessions.set(token, session);
    
    // Populate req.user with enhanced information
    req.user = {
        id: session.userId,
        username: session.username,
        role: session.role,
        displayName: session.displayName,
        permissions: session.permissions
    };
    
    console.log('✅ AUTH: User authenticated:', { username: req.user.username, role: req.user.role, permissions: req.user.permissions });
    next();
}

/**
 * Authorization middleware that checks if user has required role
 */
function authorizeRole(requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            console.log('❌ AUTH: No user data in request');
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (req.user.role !== requiredRole) {
            console.log(`❌ AUTH: Insufficient permissions. Required: ${requiredRole}, User: ${req.user.role}`);
            return res.status(403).json({ error: `${requiredRole} access required` });
        }
        
        console.log(`✅ AUTH: Role authorized: ${req.user.role}`);
        next();
    };
}

/**
 * Permission-based authorization middleware
 * Checks if user has specific permission or wildcard access
 */
function authorizePermission(requiredPermission) {
    return (req, res, next) => {
        if (!req.user) {
            console.log('❌ AUTH: No user data in request');
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        // Check if user has wildcard permissions (managers)
        if (req.user.permissions.includes('*')) {
            console.log(`✅ AUTH: Wildcard permission granted for user: ${req.user.username}`);
            return next();
        }
        
        // Check if user has specific permission
        if (req.user.permissions.includes(requiredPermission)) {
            console.log(`✅ AUTH: Permission granted: ${requiredPermission} for user: ${req.user.username}`);
            return next();
        }
        
        console.log(`❌ AUTH: Insufficient permissions. Required: ${requiredPermission}, User permissions: ${req.user.permissions}`);
        return res.status(403).json({ error: `Permission denied: ${requiredPermission} required` });
    };
}

/**
 * Manager-only access middleware
 * Shorthand for authorizeRole('manager')
 */
function requireManagerAuth(req, res, next) {
    return authorizeRole('manager')(req, res, next);
}

/**
 * Reception or Manager access middleware
 * Allows both reception and manager roles
 */
function requireReceptionOrManager(req, res, next) {
    if (!req.user) {
        console.log('❌ AUTH: No user data in request');
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role === 'reception' || req.user.role === 'manager') {
        console.log(`✅ AUTH: Access granted for ${req.user.role} user: ${req.user.username}`);
        return next();
    }
    
    console.log(`❌ AUTH: Insufficient permissions. User role: ${req.user.role}`);
    return res.status(403).json({ error: 'Reception or Manager access required' });
}

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizePermission,
    requireManagerAuth,
    requireReceptionOrManager
};
