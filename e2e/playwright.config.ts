import { defineConfig, devices } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';
import { DESKTOP_VIEWPORT, MOBILE_VIEWPORT, type CanonicalViewportName } from './support/viewports';

const PORT = 4173;
const NUMERACY_MATRIX_SPECS = /(?:numeracy-(?:responsive|accessibility)|counting|compare-quantities|addition)\.spec\.ts/;
const RELEASE_ONLY_SPECS = /(?:offline|release-(?:journeys|audio-order|responsive|accessibility|webkit-smoke))\.spec\.ts/;
const NUMERACY_VIEWPORTS: Array<{ name: string; viewport: { width: number; height: number } }> = [
  { name: 'numeracy-320x568', viewport: { width: 320, height: 568 } },
  { name: 'numeracy-390x844', viewport: { width: 390, height: 844 } },
  { name: 'numeracy-667x375', viewport: { width: 667, height: 375 } },
  { name: 'numeracy-768x1024', viewport: { width: 768, height: 1024 } },
  { name: 'numeracy-1280x900', viewport: { width: 1280, height: 900 } },
];

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
  testIgnore: [
    '**/production-guards.spec.ts',
    '**/offline.spec.ts',
    '**/release-journeys.spec.ts',
    '**/release-audio-order.spec.ts',
    '**/release-responsive.spec.ts',
    '**/release-accessibility.spec.ts',
    '**/release-webkit-smoke.spec.ts',
  ],
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
      // The numeracy games run under the five explicit projects below. Keeping them out of the
      // default project preserves the existing suite's coverage count instead of multiplying it.
      testIgnore: [NUMERACY_MATRIX_SPECS, RELEASE_ONLY_SPECS, '**/production-guards.spec.ts'],
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE_VIEWPORT },
      testMatch: /(?:find-it-games|ui-ux-enhancements|parent-access)\.spec\.ts/,
    },
    ...NUMERACY_VIEWPORTS.map(({ name, viewport }) => ({
      name,
      use: { ...devices['Desktop Chrome'], viewport },
      testMatch: NUMERACY_MATRIX_SPECS,
    })),
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
