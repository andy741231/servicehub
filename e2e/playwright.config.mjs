import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests against a running local dev stack (`npm run dev`).
 * See e2e/README.md.
 */
export default defineConfig({
  testDir: '.',
  testMatch: /.*\.spec\.mjs$/,
  outputDir: './test-results',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  workers: 1, // tests share one fixture page
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
