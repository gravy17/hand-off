# AGENTS.md

## Cursor Cloud specific instructions

HandOff is an npm-workspaces monorepo for a peer-to-peer chat / audio-video call
/ file-sharing web app. Standard commands and the architecture are documented in
`README.md` — prefer those. Notes below are the non-obvious bits.

### Services
- `@hand-off/client` (`client/`) — React 18 + TypeScript + Vite dev server on **:5173**.
- `@hand-off/server` (`server/`) — Node + Express + Socket.IO signaling server on **:4000**.

Run both together from the repo root with `npm run dev` (uses `concurrently`).
`npm run dev:server` / `npm run dev:client` run them individually. Build/lint/test
are `npm run build`, `npm run lint`, `npm test` (see `README.md`).

### Node version
- Requires Node 18+ (developed on Node 22). The VM's default `node` (Node 22) is
  fine. If a shell resolves an older `node`, activate 22 with nvm:
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.

### Non-obvious gotchas
- **Dev connectivity:** the client talks to the signaling server via a Vite proxy
  for `/socket.io` (see `client/vite.config.ts`), so it connects same-origin with
  a plain `io()` — no CORS config needed in dev. `VITE_SERVER_URL` can override the
  target if you ever run the client against a remote server.
- **Two participants needed:** chat, calls, and file transfer only do something
  interesting with ≥2 peers in the same room. Open a second browser tab (or share
  the room name) to test. File sharing is disabled until a peer is present (data
  channels must be open).
- **WebRTC mesh:** peer connections use the "perfect negotiation" pattern in
  `client/src/lib/rtc.ts`; politeness is decided by comparing socket ids, and the
  impolite peer opens the data channel (which triggers the first offer). Media
  tracks added/removed during a call renegotiate through the same path.
- **Testing calls in the VM:** there is no real camera/mic. Launch Chrome with
  fake media so `getUserMedia` succeeds and permission is auto-granted:
  `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required`.
  Chrome must be fully quit before relaunching for new flags to apply; if the
  DevTools port or singleton complains, remove `~/.config/google-chrome/Singleton*`.
  Chat and file-sharing need no special flags.
