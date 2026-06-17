// api/updatePassword.js
// Vercel serverless function – updates a user's password after reset
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.VITE_DATABASE_URL);

// Same hash used in the client (src/api/db.js) so passwords stay compatible
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return 'hash_' + Math.abs(hash).toString(36);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'Token and new password are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    // Verify the JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Hash and update
    const hashed = simpleHash(newPassword);
    const result = await sql`
      UPDATE users SET password = ${hashed} WHERE id = ${decoded.userId} RETURNING id
    `;

    if (!result.length) return res.status(404).json({ error: 'User not found' });

    return res.json({ success: true });
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Reset link has expired. Please request a new one.' });
    }
    if (e.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid reset token.' });
    }
    console.error('updatePassword error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
