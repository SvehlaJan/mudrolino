import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { RELEASE_CORE_SPECS } from './support/browserProfiles';
import { resolveChromiumExecutable } from './browserResolver';
import { RELEASE_VIEWPORTS } from './support/releaseMatrix';

const PORT = 4175;
const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: '.',
  outputDir: resolve(process.cwd(), 'test-results/release'),
  testMatch: '**/*.spec.ts',
  globalSetup: './support/verifyBuild.ts',
  metadata: { expectedBuildMode: 'test', expectedBuildDirectory: 'dist-e2e' },
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 3,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: resolve(process.cwd(), 'artifacts/verification/release.json') }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'release-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: RELEASE_VIEWPORTS.desktop,
        launchOptions: { executablePath: chromiumExecutable, args: ['--mute-audio'] },
      },
      testMatch: RELEASE_CORE_SPECS,
    },
    ...Object.entries(RELEASE_VIEWPORTS).map(([name, viewport]) => ({
      name: `release-responsive-${name}`,
      use: { ...devices['Desktop Chrome'], viewport, launchOptions: { executablePath: chromiumExecutable, args: ['--mute-audio'] } },
      testMatch: /release-responsive\.spec\.ts/,
    })),
    ...(['phonePortrait', 'desktop'] as const).map(name => ({
      name: `release-accessibility-${name}`,
      use: {
        ...devices['Desktop Chrome'],
        viewport: RELEASE_VIEWPORTS[name],
        launchOptions: { executablePath: chromiumExecutable, args: ['--mute-audio'] },
      },
      testMatch: /release-accessibility\.spec\.ts/,
    })),
    ...(['phonePortrait', 'shortLandscape', 'desktop'] as const).map(name => ({
      name: `release-webkit-${name}`,
      use: { ...devices['Desktop Safari'], viewport: RELEASE_VIEWPORTS[name] },
      testMatch: /release-webkit-smoke\.spec\.ts/,
    })),
  ],
  webServer: {
    command: `npm run preview:e2e -- --port ${PORT} --host 127.0.0.1 --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
