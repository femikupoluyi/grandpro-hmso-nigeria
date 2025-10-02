const jwt = require('jsonwebtoken');

// Simple authentication middleware (would be more robust in production)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // For development, allow requests without token
    if (process.env.NODE_ENV === 'development') {
      req.user = { id: 1, role: 'admin', hospitalId: 1 }; // Mock user
      return next();
    }
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
    req.user = verified;
    next();
  } catch (error) {
    // For development, allow with mock user even if token is invalid
    if (process.env.NODE_ENV === 'development') {
      req.user = { id: 1, role: 'admin', hospitalId: 1 }; // Mock user
      return next();
    }
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Role-based authorization middleware
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // In development, admin bypasses all role checks
    if (process.env.NODE_ENV === 'development' && req.user.role === 'admin') {
      return next();
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

// Generate JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    hospitalId: user.hospital_id,
    name: user.name
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET || 'development-secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'development-secret');
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  generateToken,
  verifyToken
};
