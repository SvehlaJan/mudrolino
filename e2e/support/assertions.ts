import { Page, Request, expect } from '@playwright/test';
import type { E2EOverlay } from '../../src/shared/services/e2eState';

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export function expectNoConsoleErrors(errors: string[]): void {
  expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
}

export function trackFailedRequests(page: Page): string[] {
  const failures: string[] = [];
  page.on('requestfailed', (request: Request) => {
    failures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown error'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.request().method()} ${response.url()} — HTTP ${response.status()}`);
    }
  });
  return failures;
}

export function expectNoFailedRequests(failures: string[]): void {
  expect(failures, `Unexpected failed requests:\n${failures.join('\n')}`).toEqual([]);
}

export async function waitForOverlay(page: Page, overlay: Exclude<E2EOverlay, null>): Promise<void> {
  await page.waitForFunction(
    (expected) => (window as unknown as { __E2E__?: { overlay: unknown } }).__E2E__?.overlay === expected,
    overlay,
    { timeout: 10_000 },
  );
}

export async function waitForOverlayCleared(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __E2E__?: { overlay: unknown } }).__E2E__?.overlay === null,
    undefined,
    { timeout: 10_000 },
  );
}
