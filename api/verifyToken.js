// api/verifyToken.js
// Vercel serverless function – verifies a password reset JWT
import 'dotenv/config';
import jwt from 'jsonwebtoken';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, error: 'Token is required' });

  try {
    const decoded = jwt.verify(token, getRequiredEnv('JWT_SECRET'));
    if (decoded?.purpose !== 'password_reset') {
      return res.status(401).json({ valid: false, error: 'Invalid reset token.' });
    }
    return res.json({ valid: true, userId: decoded.userId });
  } catch (e) {
    const message = e.name === 'TokenExpiredError'
      ? 'This reset link has expired. Please request a new one.'
      : 'Invalid reset token.';
    return res.status(401).json({ valid: false, error: message });
  }
}
