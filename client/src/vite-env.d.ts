/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute URL for the session BFF (`POST /api/session`). */
  readonly VITE_API_URL?: string;
  /** Optional absolute URL for hand-off-server Socket.IO + TURN HTTP API. */
  readonly VITE_SIGNALING_URL?: string;
  /** @deprecated Prefer VITE_SIGNALING_URL */
  readonly VITE_SERVER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
