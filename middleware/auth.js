/**
 * JWT Authentication Middleware.
 * Protects routes that require login.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'bnm-supplement-control-secret-key-change-in-production';

function generateToken(userId, username) {
  return jwt.sign({ user_id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Express middleware: require valid JWT in Authorization header.
 * Attaches decoded user to req.user.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Provide Bearer token.' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Optional auth: attaches user if token present, but doesn't reject.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), JWT_SECRET);
    } catch { /* ignore invalid tokens */ }
  }
  next();
}

module.exports = { generateToken, verifyToken, requireAuth, optionalAuth, JWT_SECRET };
