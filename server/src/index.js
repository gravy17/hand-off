import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'hand-off-server' });
});

// In production, serve the built client (single-service deployment).
const clientDist = join(__dirname, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
});

/**
 * Return the list of other members of a room as `{ id, username }`.
 */
function roomMembers(roomId, exceptId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (!room) return [];
  const members = [];
  for (const socketId of room) {
    if (socketId === exceptId) continue;
    const s = io.sockets.sockets.get(socketId);
    if (s) members.push({ id: socketId, username: s.data.username });
  }
  return members;
}

io.on('connection', (socket) => {
  socket.on('join', ({ roomId, username }, ack) => {
    const cleanRoom = String(roomId || '').trim();
    const cleanName = String(username || '').trim().slice(0, 40) || 'Anonymous';
    if (!cleanRoom) {
      if (typeof ack === 'function') ack({ error: 'A room name is required.' });
      return;
    }

    // Leave any previous room first.
    if (socket.data.roomId) {
      socket.leave(socket.data.roomId);
      socket.to(socket.data.roomId).emit('peer-left', { id: socket.id });
    }

    socket.data.username = cleanName;
    socket.data.roomId = cleanRoom;
    socket.join(cleanRoom);

    const peers = roomMembers(cleanRoom, socket.id);
    if (typeof ack === 'function') {
      ack({ selfId: socket.id, roomId: cleanRoom, username: cleanName, peers });
    }
    socket.to(cleanRoom).emit('peer-joined', { id: socket.id, username: cleanName });
  });

  socket.on('chat', ({ text }) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    const clean = String(text ?? '').slice(0, 4000);
    if (!clean) return;
    io.to(roomId).emit('chat', {
      id: `${socket.id}-${Date.now()}`,
      senderId: socket.id,
      username: socket.data.username,
      text: clean,
      ts: Date.now(),
    });
  });

  // Relay WebRTC signaling messages to a specific peer in the room.
  socket.on('signal', ({ to, data }) => {
    if (!to) return;
    io.to(to).emit('signal', { from: socket.id, data });
  });

  socket.on('disconnect', () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      socket.to(roomId).emit('peer-left', { id: socket.id });
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`[hand-off] signaling server listening on http://localhost:${PORT}`);
});
