/**
 * Vercel serverless adapter for the session BFF.
 * Same contract as Express POST /api/session.
 */
import { mintSession } from '../server/src/mintSession.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const result = mintSession(req.body || {}, {
    allowDevSecret: false,
  });
  res.status(result.status).json(result.body);
}
