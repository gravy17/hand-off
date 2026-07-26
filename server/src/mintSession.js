import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';

/**
 * Shared room-JWT mint used by the Express BFF and serverless adapters.
 * @returns {{ ok: true, status: number, body: object } | { ok: false, status: number, body: { error: string } }}
 */
export function mintSession(
  { roomId, username, userId } = {},
  {
    roomTokenSecret = process.env.ROOM_TOKEN_SECRET || '',
    tokenTtlSeconds = Number(process.env.TOKEN_TTL_SECONDS) || 900,
    signalingUrl = process.env.SIGNALING_URL || process.env.VITE_SIGNALING_URL || '',
    allowDevSecret = false,
  } = {},
) {
  const secret =
    roomTokenSecret ||
    (allowDevSecret ? 'dev-room-token-secret-change-me' : '');

  if (!secret) {
    return {
      ok: false,
      status: 503,
      body: { error: 'ROOM_TOKEN_SECRET is not configured' },
    };
  }

  const cleanRoom = String(roomId || '').trim();
  const cleanName = String(username || '').trim().slice(0, 40) || 'Anonymous';
  const cleanUser = String(userId || '').trim() || randomUUID();

  if (!cleanRoom) {
    return { ok: false, status: 400, body: { error: 'roomId is required' } };
  }
  if (cleanRoom.length > 128) {
    return { ok: false, status: 400, body: { error: 'roomId is too long' } };
  }

  try {
    const token = jwt.sign(
      {
        sub: cleanUser,
        name: cleanName,
        roomId: cleanRoom,
        role: 'member',
      },
      secret,
      { algorithm: 'HS256', expiresIn: tokenTtlSeconds },
    );

    return {
      ok: true,
      status: 200,
      body: {
        token,
        userId: cleanUser,
        username: cleanName,
        roomId: cleanRoom,
        expiresIn: tokenTtlSeconds,
        signalingUrl: signalingUrl || undefined,
      },
    };
  } catch (err) {
    console.error('[hand-off] failed to mint session', err);
    return { ok: false, status: 500, body: { error: 'failed to mint session' } };
  }
}
