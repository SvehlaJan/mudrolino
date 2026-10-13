/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** The subset of `import.meta.env` that decides whether monitoring runs. */
export interface MonitoringEnv {
  MODE: string;
  PROD: boolean;
  VITE_SENTRY_DSN?: string;
  VITE_VERCEL_ENV?: string;
}

/**
 * Error reports go to Sentry only from real production builds that have a DSN.
 * Development and the e2e `test` build never report, so local errors and the
 * suite's no-failed-request checks stay unaffected.
 */
export function sentryDsnFor(env: MonitoringEnv): string | null {
  if (!env.PROD || env.MODE === 'test') return null;
  return env.VITE_SENTRY_DSN?.trim() || null;
}

/**
 * Page views are counted only on the Vercel production deployment. Vercel sets
 * `VITE_VERCEL_ENV` at build time; local and preview builds load no script, so
 * they neither pollute the numbers nor request a missing `/_vercel/insights` file.
 */
export function shouldCountPageViews(env: MonitoringEnv): boolean {
  return env.PROD && env.MODE !== 'test' && env.VITE_VERCEL_ENV === 'production';
}
