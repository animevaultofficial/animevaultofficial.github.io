// src/api/resetPassword.js
// Vercel serverless function – handles password‑reset request
import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.VITE_DATABASE_URL); // Neon connection (runtime env)
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await sql`SELECT id, username FROM users WHERE username = ${email}`;
    if (!result.length) return res.status(404).json({ error: 'User not found' });
    const user = result[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const resetLink = `${process.env.RESET_URL || 'https://animevaultofficial.github.io'}/set-new-password?token=${token}`;
    const msg = {
      to: email,
      from: process.env.SENDGRID_FROM || 'no-reply@animevault.com',
      subject: 'AnimeVault Password Reset',
      html: `<p>Hello ${user.username},</p><p>Click <a href="${resetLink}">here</a> to reset your password. This link expires in 1 hour.</p>`,
    };
    await sgMail.send(msg);
    return res.json({ success: true });
  } catch (e) {
    console.error('resetPassword error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
