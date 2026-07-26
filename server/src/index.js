import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
// Must match hand-off-server's ROOM_TOKEN_SECRET (dev default mirrors that repo).
const ROOM_TOKEN_SECRET =
  process.env.ROOM_TOKEN_SECRET || 'dev-room-token-secret-change-me';
const TOKEN_TTL_SECONDS = Number(process.env.TOKEN_TTL_SECONDS) || 900;
const SIGNALING_URL = process.env.SIGNALING_URL || 'http://localhost:8989';

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '16kb' }));

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'hand-off-bff',
    signalingUrl: SIGNALING_URL,
  });
});

/**
 * Mint a short-lived room JWT the browser can present to hand-off-server.
 * Identity (userId) is created here so the secret never ships to the client.
 *
 * POST /api/session
 * body: { roomId, username, userId? }
 */
app.post('/api/session', (req, res) => {
  const roomId = String(req.body?.roomId || '').trim();
  const username = String(req.body?.username || '').trim().slice(0, 40) || 'Anonymous';
  const userId = String(req.body?.userId || '').trim() || randomUUID();

  if (!roomId) {
    res.status(400).json({ error: 'roomId is required' });
    return;
  }
  if (roomId.length > 128) {
    res.status(400).json({ error: 'roomId is too long' });
    return;
  }

  try {
    const token = jwt.sign(
      {
        sub: userId,
        name: username,
        roomId,
        role: 'member',
      },
      ROOM_TOKEN_SECRET,
      { algorithm: 'HS256', expiresIn: TOKEN_TTL_SECONDS },
    );

    res.json({
      token,
      userId,
      username,
      roomId,
      expiresIn: TOKEN_TTL_SECONDS,
      signalingUrl: SIGNALING_URL,
    });
  } catch (err) {
    console.error('[hand-off-bff] failed to mint session', err);
    res.status(500).json({ error: 'failed to mint session' });
  }
});

// In production, serve the built client (single-service deployment of the UI + BFF).
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
httpServer.listen(PORT, () => {
  console.log(`[hand-off] session BFF listening on http://localhost:${PORT}`);
  console.log(`[hand-off] minting tokens for signaling at ${SIGNALING_URL}`);
});
