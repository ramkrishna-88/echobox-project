const crypto = require('crypto');
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production.');
}

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set; development sessions will expire when the backend restarts.');
}

function createAccessToken(user) {
  return jwt.sign({}, JWT_SECRET, { subject: user._id.toString(), expiresIn: '7d' });
}

module.exports = { JWT_SECRET, createAccessToken };
