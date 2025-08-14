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
        location_id: session.location_id,
        location_name: session.location_name,
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

/**
 * Location-based access control middleware
 * Ensures users can only access data from their assigned location
 */
function requireLocationAccess(req, res, next) {
    if (!req.user) {
        console.log('❌ AUTH: No user data in request');
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Managers can access all locations
    if (req.user.role === 'manager') {
        console.log(`✅ AUTH: Manager access granted for all locations: ${req.user.username}`);
        return next();
    }
    
    // Reception users can only access their assigned location
    const requestedLocationId = req.body.location_id || req.query.location_id || req.params.location_id;
    
    if (!requestedLocationId) {
        console.log('❌ AUTH: No location specified in request');
        return res.status(400).json({ error: 'Location ID required' });
    }
    
    if (parseInt(requestedLocationId) !== req.user.location_id) {
        console.log(`❌ AUTH: Location access denied. User location: ${req.user.location_id}, Requested: ${requestedLocationId}`);
        return res.status(403).json({ error: 'Access denied to this location' });
    }
    
    console.log(`✅ AUTH: Location access granted for user: ${req.user.username} to location: ${requestedLocationId}`);
    next();
}

/**
 * Manager with location restriction middleware
 * Ensures managers can only access their assigned location (unless they have cross-location permissions)
 */
function requireManagerLocationAccess(req, res, next) {
    if (!req.user) {
        console.log('❌ AUTH: No user data in request');
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (req.user.role !== 'manager') {
        console.log(`❌ AUTH: Manager role required. User role: ${req.user.role}`);
        return res.status(403).json({ error: 'Manager access required' });
    }
    
    // For now, managers are restricted to their assigned location
    // This can be enhanced later with cross-location permissions
    const requestedLocationId = req.body.location_id || req.query.location_id || req.params.location_id;
    
    if (!requestedLocationId) {
        console.log('❌ AUTH: No location specified in request');
        return res.status(400).json({ error: 'Location ID required' });
    }
    
    if (parseInt(requestedLocationId) !== req.user.location_id) {
        console.log(`❌ AUTH: Location access denied. Manager location: ${req.user.location_id}, Requested: ${requestedLocationId}`);
        return res.status(403).json({ error: 'Access denied to this location' });
    }
    
    console.log(`✅ AUTH: Manager location access granted: ${req.user.username} to location: ${requestedLocationId}`);
    next();
}

module.exports = {
    authenticateToken,
    authorizeRole,
    authorizePermission,
    requireManagerAuth,
    requireReceptionOrManager,
    requireLocationAccess,
    requireManagerLocationAccess
};
