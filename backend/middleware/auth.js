const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    
    // Get user from database to ensure they still exist and are active
    const userQuery = 'SELECT id, email, user_type, first_name, last_name, is_active FROM users WHERE id = ? AND is_active = TRUE';
    const userResult = await executeQuery(userQuery, [decoded.userId]);
    
    if (!userResult.success || userResult.data.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Add user info to request object
    req.user = userResult.data[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Check if user owns the resource or is admin
const requireOwnership = (resourceTable, resourceIdField = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Admin can access everything
      if (req.user.user_type === 'admin') {
        return next();
      }

      const resourceId = req.params[resourceIdField];
      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
      }

      // Check if user owns the resource
      const ownershipQuery = `SELECT id FROM ${resourceTable} WHERE ${resourceIdField} = ? AND user_id = ?`;
      const ownershipResult = await executeQuery(ownershipQuery, [resourceId, req.user.id]);

      if (!ownershipResult.success || ownershipResult.data.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You do not own this resource'
        });
      }

      next();
    } catch (error) {
      console.error('❌ Ownership check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking resource ownership'
      });
    }
  };
};

// Optional authentication (adds user info if token exists, but doesn't require it)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
      const userQuery = 'SELECT id, email, user_type, first_name, last_name FROM users WHERE id = ? AND is_active = TRUE';
      const userResult = await executeQuery(userQuery, [decoded.userId]);
      
      if (userResult.success && userResult.data.length > 0) {
        req.user = userResult.data[0];
      }
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user info
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireOwnership,
  optionalAuth
}; 