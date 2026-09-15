import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';
import { DESKTOP_VIEWPORT } from './support/viewports';

const PORT = 4174;
const chromiumExecutable = resolveChromiumExecutable();

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
      name: 'production-guards',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
      testMatch: /production-guards\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
