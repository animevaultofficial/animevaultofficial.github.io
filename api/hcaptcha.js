import express from 'express';

const app = express();
app.use(express.json());

const HCAPTCHA_VERIFY_URL = 'https://hcaptcha.com/siteverify';
const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY || '';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed.' });
  }

  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ success: false, message: 'Captcha response is required.' });
  }

  if (!HCAPTCHA_SECRET_KEY) {
    return res.status(500).json({ success: false, message: 'Captcha secret is not configured.' });
  }

  try {
    const verifyRes = await fetch(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        response: String(token),
        secret: HCAPTCHA_SECRET_KEY,
      }).toString(),
    });

    const payload = await verifyRes.json().catch(() => ({}));
    const isValid = Boolean(payload?.success);

    if (!verifyRes.ok || !isValid) {
      console.warn('[hCaptcha] validation rejected:', payload?.['error-codes'] || verifyRes.status);
      return res.status(400).json({
        success: false,
        message: 'Captcha validation failed.',
      });
    }

    return res.json({ success: true, message: 'Captcha validated.' });
  } catch (error) {
    console.error('[hCaptcha] verification failed:', error);
    return res.status(500).json({ success: false, message: 'Captcha verification failed.' });
  }
}

app.post('/api/hcaptcha/verify', async (req, res) => {
  return handler(req, res);
});

export { app };
