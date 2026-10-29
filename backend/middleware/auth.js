const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../security');

async function authenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'Account no longer exists.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Your session is invalid or has expired. Please sign in again.' });
  }
}

async function optionalAuthenticate(req, res, next) {
  const authorization = req.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(payload.sub) || undefined;
  } catch {
    req.user = undefined;
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Administrator access required.' });
  next();
}

module.exports = { authenticate, optionalAuthenticate, requireAdmin };
