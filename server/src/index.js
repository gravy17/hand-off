import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

import express from 'express';
import cors from 'cors';

import { mintSession } from './mintSession.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const SIGNALING_URL = process.env.SIGNALING_URL || 'http://localhost:8989';
const isProd = process.env.NODE_ENV === 'production';

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
 * POST /api/session  body: { roomId, username, userId? }
 */
app.post('/api/session', (req, res) => {
  const result = mintSession(req.body, {
    signalingUrl: SIGNALING_URL,
    allowDevSecret: !isProd,
  });
  res.status(result.status).json(result.body);
});

// Local/Node deploys: serve the built client next to the BFF.
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
