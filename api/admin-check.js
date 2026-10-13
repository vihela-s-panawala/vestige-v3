import { createAdminCookie, clearAdminCookie, isAdminAuthenticated } from '../lib/admin-auth.js';

export default function handler(req, res) {
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearAdminCookie());
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ ok: false, message: 'Admin session is not valid.' });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ ok: false, message: 'Method not allowed.' });
  }

  const { pin } = req.body || {};
  const realPin = process.env.ADMIN_PIN;

  if (!realPin) {
    return res.status(500).json({ ok: false, message: 'Admin PIN is not configured on the server.' });
  }

  if (String(pin).trim() === String(realPin)) {
    try {
      res.setHeader('Set-Cookie', createAdminCookie());
    } catch (error) {
      console.error('Unable to create admin session:', error);
      return res.status(500).json({ ok: false, message: 'Admin session is not configured on the server.' });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(401).json({ ok: false, message: 'Incorrect PIN. Access denied.' });
}
