import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a running stack (docker compose up), through
 * Nginx, as a user would see it. They start no server of their own.
 */
export default defineConfig({
  testDir: './tests',
  // Never retry: a test that passes only on a second try is a bug to see.
  retries: 0,
  forbidOnly: !!process.env.CI,
  // The HTML report is always written, but traces and screenshots are kept
  // only for failed tests, and CI uploads the report only on a failure.
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    // The interface follows the browser language, so fix it: otherwise
    // the result would depend on the machine that runs the tests.
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
