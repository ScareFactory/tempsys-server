// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Liest JWT aus Authorization: Bearer <token>
 * und setzt req.user = { companyId, username, role, ... }
 */
function authMiddleware(req, res, next) {
  try {
    const h = req.headers['authorization'] || '';
    const m = h.match(/^Bearer (.+)$/i);
    if (!m) return res.status(401).json({ error: 'missing bearer token' });

    const token = m[1];
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('JWT_SECRET not set');
      return res.status(500).json({ error: 'server misconfigured' });
    }

    const payload = jwt.verify(token, secret);
    req.user = payload; // erwartet: { companyId, username, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

/**
 * Erlaubt nur Admin
 */
function requireAdmin(req, res, next) {
  if (!req.user?.role) return res.status(401).json({ error: 'unauthorized' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' });
  next();
}

/**
 * Erlaubt Admin oder CompanyAdmin
 */
function requireCompanyAdmin(req, res, next) {
  if (!req.user?.role) return res.status(401).json({ error: 'unauthorized' });
  if (req.user.role === 'admin' || req.user.role === 'companyAdmin') return next();
  return res.status(403).json({ error: 'forbidden' });
}

/**
 * Generische Rollenprüfung
 * usage: requireRole('admin') oder requireRole(['admin','companyAdmin'])
 */
function requireRole(roles) {
  const allow = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user?.role) return res.status(401).json({ error: 'unauthorized' });
    if (!allow.includes(req.user.role)) return res.status(403).json({ error: 'forbidden' });
    next();
  };
}

module.exports = {
  authMiddleware,
  requireAdmin,
  requireCompanyAdmin,
  requireRole,
};
