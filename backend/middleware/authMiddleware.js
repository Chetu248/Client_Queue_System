/**
 * JWT Authentication Middleware
 * Verifies Bearer tokens on protected routes.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'queuecure26-dev-secret-CHANGE-IN-PROD';

/** Attach decoded user to req.user; reject with 401/403 on failure */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Access denied — no token provided.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Invalid token.' });
  }
};

/** Optional: role-based guard — use after authenticateToken */
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ error: `Access denied — requires role: ${roles.join(' or ')}.` });
  }
  next();
};

module.exports = { authenticateToken, requireRole };
