import { describe, expect, it } from 'vitest';
import { sentryDsnFor, shouldCountPageViews } from './monitoringPolicy';

const production = { MODE: 'production', PROD: true };

describe('sentryDsnFor', () => {
  it('reports from a production build that has a DSN', () => {
    expect(sentryDsnFor({ ...production, VITE_SENTRY_DSN: ' https://key@o1.ingest.de.sentry.io/2 ' }))
      .toBe('https://key@o1.ingest.de.sentry.io/2');
  });

  it('stays off without a DSN, so builds without the Vercel variable never report', () => {
    expect(sentryDsnFor(production)).toBeNull();
    expect(sentryDsnFor({ ...production, VITE_SENTRY_DSN: '  ' })).toBeNull();
  });

  it('stays off in development and in the e2e test build', () => {
    expect(sentryDsnFor({ MODE: 'development', PROD: false, VITE_SENTRY_DSN: 'https://key@x/1' })).toBeNull();
    expect(sentryDsnFor({ MODE: 'test', PROD: true, VITE_SENTRY_DSN: 'https://key@x/1' })).toBeNull();
  });
});

describe('shouldCountPageViews', () => {
  it('counts only on the Vercel production deployment', () => {
    expect(shouldCountPageViews({ ...production, VITE_VERCEL_ENV: 'production' })).toBe(true);
    expect(shouldCountPageViews({ ...production, VITE_VERCEL_ENV: 'preview' })).toBe(false);
    expect(shouldCountPageViews(production)).toBe(false);
  });

  it('never counts in development or the e2e test build', () => {
    expect(shouldCountPageViews({ MODE: 'development', PROD: false, VITE_VERCEL_ENV: 'production' })).toBe(false);
    expect(shouldCountPageViews({ MODE: 'test', PROD: true, VITE_VERCEL_ENV: 'production' })).toBe(false);
  });
});
