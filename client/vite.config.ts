import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Session BFF (token minting) defaults to :4000.
// hand-off-server (Socket.IO signaling) defaults to :8989.
const BFF_PORT = process.env.BFF_PORT || process.env.SERVER_PORT || '4000';
const SIGNALING_PORT = process.env.SIGNALING_PORT || '8989';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${BFF_PORT}`,
        changeOrigin: true,
      },
      '/socket.io': {
        target: `http://localhost:${SIGNALING_PORT}`,
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
