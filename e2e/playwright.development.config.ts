import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';
import { resolveChromiumExecutable } from './browserResolver';

// Built bundles omit React's StrictMode effect replay. Exercise the actual dev
// server separately so a lost context during replay cannot hide behind those gates.
export default defineConfig({
  testDir: '.',
  testMatch: '**/*.development.ts',
  outputDir: resolve('test-results/development'),
  workers: 1,
  retries: 0,
  metadata: { expectedBuildMode: 'development' },
  expect: { timeout: 10_000 },
  reporter: [['list'], ['json', { outputFile: resolve('artifacts/verification/development-browser.json') }]],
  use: {
    baseURL: 'http://127.0.0.1:4175',
    viewport: { width: 800, height: 700 },
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: resolveChromiumExecutable(),
      args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-gl=angle'],
    },
  },
  webServer: {
    command: 'npm run dev -- --port 4175 --host 127.0.0.1 --strictPort',
    url: 'http://127.0.0.1:4175',
    reuseExistingServer: false,
    env: { VITE_AVATAR_LOCAL_COMPANION: 'true', DISABLE_HMR: 'true' },
  },
});
