import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The signaling server runs separately in dev (default :4000). We proxy
// socket.io traffic through Vite so the client can talk to it same-origin
// (no CORS) and connect with a plain `io()` call.
const SERVER_PORT = process.env.SERVER_PORT || '4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: `http://localhost:${SERVER_PORT}`,
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
