/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Sentry from '@sentry/react';
import type { RootOptions } from 'react-dom/client';
import { sentryDsnFor, shouldCountPageViews, type MonitoringEnv } from './monitoringPolicy';

// Read single properties: passing `import.meta.env` as a whole makes Vite inline
// every build variable into the bundle, including Vercel's commit author name.
const monitoringEnv: MonitoringEnv = {
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
  VITE_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV,
};

export const pageViewsEnabled = shouldCountPageViews(monitoringEnv);

/**
 * Starts error reporting when this build has a DSN and returns the React root
 * hooks that forward render errors, including those the app's ErrorBoundary
 * catches. Returns undefined, leaving React's default logging, when reporting is off.
 */
export function initMonitoring(): RootOptions | undefined {
  const dsn = sentryDsnFor(monitoringEnv);
  if (!dsn) return undefined;
  Sentry.init({
    dsn,
    release: __APP_VERSION__,
    environment: import.meta.env.VITE_VERCEL_ENV ?? 'production',
    // A children's app sends errors only: tracing, session replay and profiling
    // stay off because their integrations are never added. v11 collects every
    // data category unless told otherwise, so all personal data is switched off,
    // which also stops IP address inference.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
  });
  return {
    onUncaughtError: Sentry.reactErrorHandler(),
    onCaughtError: Sentry.reactErrorHandler(),
    onRecoverableError: Sentry.reactErrorHandler(),
  };
}
