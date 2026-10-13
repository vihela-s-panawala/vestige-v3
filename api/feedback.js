import { isAdminAuthenticated } from '../lib/admin-auth.js';

const FEEDBACK_TABLE = 'feedback';

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }

  return {
    url: `${url.replace(/\/$/, '')}/rest/v1/${FEEDBACK_TABLE}`,
    serviceRoleKey
  };
}

async function supabaseRequest(path = '', options = {}) {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error(`Supabase feedback request failed (${response.status}):`, detail);
    throw new Error('The feedback database request failed.');
  }

  const responseText = await response.text();
  return responseText ? JSON.parse(responseText) : null;
}

function sendError(res, error) {
  console.error('Feedback API error:', error);
  return res.status(500).json({ message: 'Feedback is temporarily unavailable. Please try again later.' });
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      res.setHeader('Cache-Control', 'no-store');
      const reviews = await supabaseRequest('?select=id,name,rating,review,created_at&order=created_at.desc');
      return res.status(200).json(reviews);
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === 'POST') {
    const { name, rating, review } = req.body || {};
    if (
      typeof name !== 'string' ||
      !name.trim() ||
      name.trim().length > 60 ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 5 ||
      typeof review !== 'string' ||
      !review.trim() ||
      review.trim().length > 300
    ) {
      return res.status(400).json({ message: 'Enter a name, a rating from 1 to 5, and a review of at most 300 characters.' });
    }

    try {
      const saved = await supabaseRequest('?select=id,name,rating,review,created_at', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ name: name.trim(), rating, review: review.trim() })
      });
      if (!Array.isArray(saved) || !saved[0]) {
        throw new Error('The feedback database did not confirm the saved review.');
      }
      return res.status(201).json(saved[0]);
    } catch (error) {
      return sendError(res, error);
    }
  }

  if (req.method === 'DELETE') {
    if (!isAdminAuthenticated(req)) {
      return res.status(401).json({ message: 'Admin authentication is required.' });
    }

    const id = req.query.id;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ message: 'A valid feedback ID is required.' });
    }

    try {
      await supabaseRequest(`?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
      return res.status(200).json({ ok: true });
    } catch (error) {
      return sendError(res, error);
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE');
  return res.status(405).json({ message: 'Method not allowed.' });
}
