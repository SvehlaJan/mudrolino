import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';
import { DESKTOP_VIEWPORT, MOBILE_VIEWPORT, type CanonicalViewportName } from './support/viewports';

const PORT = 4173;

/**
 * The full 10-size `CANONICAL_VIEWPORTS` matrix is exercised for screenshot review
 * (`npm run shots`) and is available to any spec that wants to iterate it directly, but running
 * every size as a real Playwright assertion on every CI run is wasteful. A regular CI run only
 * asserts this subset — one narrow phone, one short landscape strip, one tablet, one desktop —
 * and a full-matrix test should skip its other sizes when `process.env.CI` is set, matching how
 * the `mobile` project below already narrows its own file coverage for CI.
 */
export const CI_VIEWPORT_SUBSET: CanonicalViewportName[] = [
  'narrowPhone',
  'shortLandscape',
  'tabletPortrait',
  'desktop',
];

const chromiumExecutable = resolveChromiumExecutable();
if (chromiumExecutable) {
  console.log(`[e2e] Using pre-installed Chromium at ${chromiumExecutable}`);
}

export default defineConfig({
  testDir: '.',
  testIgnore: ['**/production-guards.spec.ts'],
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
      testMatch: /(?:find-it-games|ui-ux-enhancements|parent-access)\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
