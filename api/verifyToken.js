// api/verifyToken.js
// Vercel serverless function – verifies a password reset JWT
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ valid: false, error: 'Token is required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ valid: true, userId: decoded.userId });
  } catch (e) {
    const message = e.name === 'TokenExpiredError'
      ? 'This reset link has expired. Please request a new one.'
      : 'Invalid reset token.';
    return res.status(401).json({ valid: false, error: message });
  }
}
