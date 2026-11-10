// api/updatePassword.js
// Vercel serverless function – updates a user's password after reset
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const sql = databaseUrl ? neon(databaseUrl) : null;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token, newPassword } = req.body || {};
  const nextPassword = String(newPassword || '');
  if (!token || !nextPassword) return res.status(400).json({ error: 'Token and new password are required' });
  if (nextPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    if (!sql) throw new Error('DATABASE_URL is not configured');
    // Verify the JWT
    const decoded = jwt.verify(token, getRequiredEnv('JWT_SECRET'));
    if (decoded?.purpose !== 'password_reset') {
      return res.status(401).json({ error: 'Invalid reset token.' });
    }

    // Hash and update
    const hashed = await bcrypt.hash(nextPassword, 12);
    const result = await sql`
      UPDATE users SET password = ${hashed} WHERE id = ${decoded.userId} RETURNING id
    `;

    if (!result.length) return res.status(404).json({ error: 'User not found' });

    // A reset should invalidate sessions established with the old password.
    try {
      await sql`DELETE FROM user_sessions WHERE user_id = ${decoded.userId}`;
    } catch (sessionError) {
      console.warn('Could not revoke sessions after password reset:', sessionError?.message || sessionError);
    }

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
