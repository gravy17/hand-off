# AGENTS.md

## Cursor Cloud specific instructions

HandOff is an npm-workspaces monorepo for a peer-to-peer chat / audio-video call
/ file-sharing web app. Standard commands and the architecture are documented in
`README.md` — prefer those. Notes below are the non-obvious bits.

### Services
- `@hand-off/client` (`client/`) — React 18 + TypeScript + Vite dev server on **:5173**.
- `@hand-off/server` (`server/`) — Express session BFF on **:4000** (mints room JWTs; no Socket.IO).
- `api/session.js` — same mint endpoint as a Vercel serverless function (`vercel.json`).
- `hand-off-server` (sibling repo) — authenticated signaling on **:8989**.

Run BFF + client with `npm run dev`. When `../hand-off-server` exists,
`npm run dev:all` also starts signaling. Build/lint/test are `npm run build`,
`npm run lint`, `npm test` (see `README.md`).

### Node version
- Requires Node 18+ (developed on Node 22). The VM's default `node` (Node 22) is
  fine. If a shell resolves an older `node`, activate 22 with nvm:
  `export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 22`.

### Non-obvious gotchas
- **Dev connectivity:** Vite proxies `/api` → BFF `:4000` and `/socket.io` →
  signaling `:8989` (see `client/vite.config.ts`). The client uses plain
  `io()` / `fetch('/api/session')` same-origin unless `VITE_*` overrides are set.
- **Shared JWT secret:** BFF and `hand-off-server` must use the same
  `ROOM_TOKEN_SECRET` (dev default `dev-room-token-secret-change-me`).
- **One peer link:** `hand-off-server` allows one ringing/active call per user.
  The client auto-links to a single peer for the data channel (chat/files/calls).
- **Two participants needed:** chat, calls, and file transfer only do something
  interesting with a linked peer. Open a second browser tab (or share the room
  name) to test.
- **WebRTC:** initial `call:invite`/`call:accept` establish the PC + data channel
  with audio/video sendrecv transceivers. Media is added later via `replaceTrack`
  (no mid-call SDP). File bytes use SCTP backpressure (`bufferedamountlow`) and
  OPFS on receive when available.
- **Testing calls in the VM:** there is no real camera/mic. Launch Chrome with
  fake media so `getUserMedia` succeeds and permission is auto-granted:
  `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream --autoplay-policy=no-user-gesture-required`.
  Chrome must be fully quit before relaunching for new flags to apply; if the
  DevTools port or singleton complains, remove `~/.config/google-chrome/Singleton*`.
  Chat and file-sharing need no special flags.
