import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';
import { DESKTOP_VIEWPORT, MOBILE_VIEWPORT } from './support/viewports';

const PORT = 4173;

const chromiumExecutable = resolveChromiumExecutable();
if (chromiumExecutable) {
  console.log(`[e2e] Using pre-installed Chromium at ${chromiumExecutable}`);
}

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: chromiumExecutable },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE_VIEWPORT },
      testMatch: /find-it-games\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
