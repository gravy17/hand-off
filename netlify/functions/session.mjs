import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

const ROOM_TOKEN_SECRET = process.env.ROOM_TOKEN_SECRET || '';
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS) || 900;
const SIGNALING_URL = process.env.SIGNALING_URL || process.env.VITE_SIGNALING_URL || '';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
  'content-type': 'application/json',
};

export async function handler(event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'method not allowed' }) };
  }

  if (!ROOM_TOKEN_SECRET) {
    return {
      statusCode: 503,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'ROOM_TOKEN_SECRET is not configured' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'invalid JSON' }) };
  }

  const roomId = String(body.roomId || '').trim();
  const username = String(body.username || '').trim().slice(0, 40) || 'Anonymous';
  const userId = String(body.userId || '').trim() || randomUUID();

  if (!roomId) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'roomId is required' }) };
  }

  try {
    const token = jwt.sign(
      { sub: userId, name: username, roomId, role: 'member' },
      ROOM_TOKEN_SECRET,
      { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS },
    );

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        token,
        userId,
        username,
        roomId,
        expiresIn: TOKEN_TTL_SECONDS,
        signalingUrl: SIGNALING_URL || undefined,
      }),
    };
  } catch (err) {
    console.error('session mint failed', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'failed to mint session' }),
    };
  }
}
