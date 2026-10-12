import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the browser only talks to the Vite server, and Vite
// forwards the API and image requests to the backend container, exactly as
// Nginx does in the production image. One origin, so no CORS.
const BACKEND_URL = 'http://localhost:8000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': BACKEND_URL,
      '/images': BACKEND_URL,
    },
  },
  test: {
    // jsdom gives the tests a browser-like document.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
