import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', // or wherever your E2E tests are
  timeout: 30 * 1000,
  retries: 0,
  workers: 4, // Run 4 tests in parallel
  use: {
    baseURL: 'http://localhost:5000', // replace with your local server
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 0,
    ignoreHTTPSErrors: true,
  },
});
