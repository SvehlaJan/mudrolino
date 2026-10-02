import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { GEOMETRY_TAG, INTEGRATION_IGNORED_SPECS } from './support/browserProfiles';
import { resolveChromiumExecutable } from './browserResolver';
import { DESKTOP_VIEWPORT, INTEGRATION_VIEWPORTS } from './support/viewports';

const PORT = 4173;
const chromiumExecutable = resolveChromiumExecutable();
if (chromiumExecutable) console.log(`[e2e] Using pre-installed Chromium at ${chromiumExecutable}`);

export default defineConfig({
  testDir: '.',
  outputDir: resolve(process.cwd(), 'test-results/integration'),
  testMatch: '**/*.spec.ts',
  globalSetup: './support/verifyBuild.ts',
  metadata: { expectedBuildMode: 'test', expectedBuildDirectory: 'dist-e2e' },
  testIgnore: INTEGRATION_IGNORED_SPECS,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: resolve(process.cwd(), 'artifacts/verification/integration.json') }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath: chromiumExecutable, args: ['--mute-audio'] },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
      // Untagged behavior and tests with their own viewport loop execute exactly once.
      grepInvert: GEOMETRY_TAG,
    },
    ...Object.entries(INTEGRATION_VIEWPORTS).map(([name, viewport]) => ({
      name: `geometry-${name}`,
      use: { ...devices['Desktop Chrome'], viewport },
      grep: GEOMETRY_TAG,
    })),
  ],
  webServer: {
    command: `npm run preview:e2e -- --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
