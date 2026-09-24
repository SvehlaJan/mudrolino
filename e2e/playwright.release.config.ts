import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';
import { RELEASE_VIEWPORTS } from './support/releaseMatrix';

const PORT = 4175;
const chromiumExecutable = resolveChromiumExecutable();

export default defineConfig({
  testDir: '.',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  retries: 0,
  reporter: [['list']],
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
        launchOptions: { executablePath: chromiumExecutable },
      },
      testMatch: /release-(?:journeys|audio-order)\.spec\.ts/,
    },
    ...Object.entries(RELEASE_VIEWPORTS).map(([name, viewport]) => ({
      name: `release-responsive-${name}`,
      use: { ...devices['Desktop Chrome'], viewport, launchOptions: { executablePath: chromiumExecutable } },
      testMatch: /release-responsive\.spec\.ts/,
    })),
    ...(['phonePortrait', 'desktop'] as const).map(name => ({
      name: `release-accessibility-${name}`,
      use: {
        ...devices['Desktop Chrome'],
        viewport: RELEASE_VIEWPORTS[name],
        launchOptions: { executablePath: chromiumExecutable },
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
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
