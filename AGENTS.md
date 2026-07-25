# AGENTS.md

## Cursor Cloud specific instructions

`hand-off` ("HandOff") is a single Create React App frontend (React 16, `react-scripts` 3.4.1) — a WebRTC/WebTorrent P2P app for chat, audio/video calls, and file sharing. There is no backend in this repo; standard commands live in `package.json` (`start`, `build`, `test`).

### Node version (important)
- `react-scripts` 3.4.1 (webpack 4) requires **Node 16**. It does not build/run cleanly on the VM's default newer Node.
- The startup update script installs deps under Node 16 via nvm. In a fresh interactive shell the `node` on `PATH` may still resolve to a newer Node (e.g. `/exec-daemon/node`), so activate Node 16 before running any `npm` command:
  ```
  export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm use 16
  ```
  (Node 16 is the nvm `default`; login shells generally pick it up, but activate explicitly to be safe.)

### Run / build / test / lint
- Dev server: `BROWSER=none npm start` → http://localhost:3000. Under Node 16 no `--openssl-legacy-provider` flag is needed.
- Build: `npm run build`. ESLint (`react-app` config) runs as part of `start`/`build`; there is no separate lint script.
- Tests: `react-scripts test` runs Jest. Run non-interactively with `CI=true npm test -- --forceExit --watchAll=false`. `--forceExit` is required because `src/App.test.js` renders the full app, whose WebTorrent/socket.io imports leave open handles that otherwise keep Jest from exiting. Note: this single test is a leftover default CRA test that fails (looks for "learn react" and renders `NavLink` without a Router) — it is a pre-existing test bug, not an environment problem.

### App behavior gotchas (pre-existing, not env issues)
- The signaling backend is hardcoded to `https://hand-off-server.herokuapp.com/` (now dead / returns 404), so real peer-to-peer connectivity (multi-user chat, calls) will not establish. Sent chat messages still render locally via Redux, so single-client chat is demonstrable.
- On first load the app shows a native `prompt()` for a username (stored in `localStorage` under `handoff-user`); entering Chat triggers another `prompt()` for the room id.
- `src/components/Chat.js` reads the user from `localStorage` at module-load time. Clicking Chat on the very first load (before the username is persisted) can throw "Cannot read properties of null (reading 'name')". A full page reload after the name is set resolves it.
