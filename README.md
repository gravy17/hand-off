# HandOff

**Peer-to-peer chat, audio/video calls, and file sharing — right in your browser.**

HandOff lets people in a shared room message each other, jump on a live
audio/video call, and send files that stream **directly between browsers** over
WebRTC. Signaling (presence + call/ICE) is handled by
[`hand-off-server`](https://github.com/gravy17/hand-off-server); media, chat, and
file bytes never touch the server.

Live demo (legacy build): https://hand-off.netlify.app/

## Architecture

This is an npm-workspaces monorepo that pairs with the external signaling server:

| Package | Path | Stack | Responsibility |
| --- | --- | --- | --- |
| `@hand-off/client` | `client/` | React 18 · TypeScript · Vite · Zustand · React Router 6 | UI + WebRTC + data-channel chat/files |
| `@hand-off/server` | `server/` | Node · Express | Session BFF — mints room JWTs; serves `client/dist` |
| `hand-off-server` | separate repo | Socket.IO 4 · JWT rooms | Presence + 1:1 call/ICE signaling |

- **Presence & call signaling** go through `hand-off-server` (JWT auth, `call:*` / `signal:ice`).
- **Chat & file bytes** travel only on a reliable `RTCDataChannel` (no Socket.IO data plane).
- **Audio/video** uses `replaceTrack` on pre-created transceivers so media can start after the
  data link without mid-call SDP renegotiation (the signaling API has no mid-call SDP path).

In development the Vite dev server proxies `/api` → session BFF and `/socket.io` →
`hand-off-server`, so the browser stays same-origin.

## Getting started

Requires **Node.js 18+** (developed on Node 22), plus a running
[`hand-off-server`](https://github.com/gravy17/hand-off-server) instance.

```bash
# terminal A — signaling (from the hand-off-server checkout)
export ROOM_TOKEN_SECRET='dev-room-token-secret-change-me'
export ALLOWED_ORIGINS='http://localhost:5173'
npm start   # :8989

# terminal B — this repo
cp .env.example .env   # optional; defaults match the secret above
npm install
npm run dev            # BFF :4000 + Vite :5173
```

If both repos are siblings (`../hand-off-server`), you can start everything with:

```bash
npm run dev:all
```

Open http://localhost:5173, pick a display name and room, then open a second tab
(or share the room name) to connect a peer.

## Scripts (run from the repo root)

| Command | What it does |
| --- | --- |
| `npm run dev` | Run session BFF + Vite client |
| `npm run dev:all` | Also start sibling `hand-off-server` |
| `npm run build` | Type-check and build the client to `client/dist` |
| `npm start` | Run the session BFF (serves `client/dist` if built) |
| `npm run lint` | ESLint over the client |
| `npm test` | Vitest unit tests |
| `npm run vercel:dev` | Local Vercel runtime (`dist` + `/api/session`) |
| `npm run deploy` | Vercel preview deploy |
| `npm run deploy:prod` | Vercel production deploy |

## Environment

| Variable | Where | Purpose |
| --- | --- | --- |
| `ROOM_TOKEN_SECRET` | BFF / Vercel / Netlify + hand-off-server | Shared HS256 secret for room JWTs |
| `SIGNALING_URL` | BFF / serverless | Advertised signaling base URL in `/api/session` |
| `VITE_SIGNALING_URL` | client build | Absolute Socket.IO URL (production) |
| `VITE_API_URL` | client build | Absolute BFF URL when not same-origin |

## Deploy on Vercel

Vercel serves `client/dist` as static files and runs the session BFF as a
serverless function at `/api/session` (`api/session.js`). Signaling still lives
on `hand-off-server`.

1. Deploy / run `hand-off-server` somewhere (Render, etc.) with:
   - `ROOM_TOKEN_SECRET=<strong-secret>`
   - `ALLOWED_ORIGINS=https://your-app.vercel.app`
   - `NODE_ENV=production`
2. Import this GitHub repo into [Vercel](https://vercel.com/new).
3. In the Vercel project settings, set:

| Environment | Variable | Value |
| --- | --- | --- |
| Production (Build) | `VITE_SIGNALING_URL` | `https://your-hand-off-server.example.com` |
| Production (Runtime) | `ROOM_TOKEN_SECRET` | same secret as hand-off-server |
| Production (Runtime) | `SIGNALING_URL` | same URL as `VITE_SIGNALING_URL` |

4. Framework Preset: **Other** (or leave unset — `vercel.json` sets it).
5. Deploy. Smoke-check:
   - `GET https://your-app.vercel.app/` → SPA
   - `POST https://your-app.vercel.app/api/session` with
     `{"roomId":"demo","username":"Ada"}` → JWT JSON
6. Open two browser tabs on the deployed site and join the same room.

CLI alternative (from this repo):

```bash
npm run vercel:dev    # local: static dist + serverless /api/session
npm run deploy        # preview
npm run deploy:prod   # production
```

## License

MIT
