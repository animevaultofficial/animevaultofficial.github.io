// api/resetPassword.js
// Vercel serverless function – handles password-reset request
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.VITE_DATABASE_URL);
const GENERIC_RESET_RESPONSE = { success: true };

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}

function getResetBaseUrl() {
  const configuredUrl = process.env.RESET_URL || 'https://animevaultofficial.fun';
  const parsed = new URL(configuredUrl);
  if (parsed.protocol !== 'https:' && process.env.NODE_ENV === 'production') {
    throw new Error('RESET_URL must use HTTPS in production');
  }
  return parsed.origin;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await sql`SELECT id, username FROM users WHERE username = ${email}`;
    if (!result.length) return res.json(GENERIC_RESET_RESPONSE);

    const user = result[0];
    const token = jwt.sign({ userId: user.id, purpose: 'password_reset' }, getRequiredEnv('JWT_SECRET'), { expiresIn: '1h' });
    const resetLink = `${getResetBaseUrl()}/set-new-password?token=${encodeURIComponent(token)}`;

    sgMail.setApiKey(getRequiredEnv('SENDGRID_API_KEY'));
    await sgMail.send({
      to: email,
      from: process.env.SENDGRID_FROM || 'no-reply@animevault.com',
      subject: 'AnimeVault Password Reset',
      html: `<p>Hello ${escapeHtml(user.username)},</p><p>Click <a href="${escapeHtml(resetLink)}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    });

    return res.json(GENERIC_RESET_RESPONSE);
  } catch (e) {
    console.error('resetPassword error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
