import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// In development the browser only talks to the Vite server, and Vite
// forwards the API and image requests to the backend container, exactly as
// Nginx does in the production image. One origin, so no CORS.
const BACKEND_URL = 'http://localhost:8000';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // The vendor file is about 720 kB before compression (230 kB sent),
    // above Vite's default warning at 500 kB. It is one file the browser
    // caches; shrinking it is in FUTURE_IMPROVEMENTS.md.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        codeSplitting: {
          // The libraries go in their own file. They change much less
          // often than the application code, so after a new release the
          // browser keeps them from its cache and downloads only the
          // application file again.
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
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
    // The first test of a file renders the whole application: about 2.5 s
    // on a laptop, twice that in a container or on a CI runner. The
    // default limit of 5 s made those tests fail now and then.
    testTimeout: 15_000,
    // One file at a time. Most files render the whole application, and
    // several at once on a busy machine left a navigation waiting for
    // seconds, so a test failed now and then. Each file alone never did.
    fileParallelism: false,
  },
});
