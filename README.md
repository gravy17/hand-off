# HandOff

**Peer-to-peer chat, audio/video calls, and file sharing — right in your browser.**

HandOff lets people in a shared room message each other, jump on a live
audio/video call, and send files that stream **directly between browsers** over
WebRTC. A lightweight signaling server handles presence, chat relay, and the
WebRTC handshake; media and files never touch the server.

Live demo (legacy build): https://hand-off.netlify.app/

## Architecture

This is an npm-workspaces monorepo:

| Package | Path | Stack | Responsibility |
| --- | --- | --- | --- |
| `@hand-off/client` | `client/` | React 18 · TypeScript · Vite · Zustand · React Router 6 | UI + WebRTC mesh + data-channel file transfer |
| `@hand-off/server` | `server/` | Node · Express · Socket.IO 4 | Rooms, presence, chat relay, WebRTC signaling relay |

- **Chat & presence** are relayed through Socket.IO (reliable, instant).
- **Audio/video calls** use native `RTCPeerConnection` in a full mesh with the
  [perfect-negotiation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation)
  pattern, so either peer can (re)negotiate when tracks are added/removed.
- **File sharing** streams chunks over a reliable `RTCDataChannel` per peer,
  with backpressure handling and progress reporting.

In development the Vite dev server proxies `/socket.io` to the signaling server,
so the client connects same-origin (no CORS). In production the server can serve
the built client from `client/dist`.

## Getting started

Requires **Node.js 18+** (developed on Node 22).

```bash
npm install        # installs both workspaces
npm run dev        # starts the signaling server (:4000) and Vite client (:5173)
```

Open http://localhost:5173, pick a display name and room, then open a second tab
(or share the room name) to connect a peer.

## Scripts (run from the repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Run server + client together (hot reload) |
| `npm run build` | Type-check and build the client to `client/dist` |
| `npm start` | Run the signaling server (serves `client/dist` if built) |
| `npm run lint` | ESLint over the client |
| `npm test` | Vitest unit tests |

## License

MIT
