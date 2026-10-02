import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';
import { DESKTOP_VIEWPORT } from './support/viewports';

const PORT = 4174;
const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: '.',
  outputDir: resolve(process.cwd(), 'test-results/production'),
  testMatch: '**/*.spec.ts',
  globalSetup: './support/verifyBuild.ts',
  metadata: { expectedBuildMode: 'production', expectedBuildDirectory: 'dist' },
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: resolve(process.cwd(), 'artifacts/verification/production-browser.json') }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: chromiumExecutable, args: ['--mute-audio'] },
  },
  projects: [
    {
      name: 'production-guards',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
      testMatch: /(?:production-guards|offline)\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
