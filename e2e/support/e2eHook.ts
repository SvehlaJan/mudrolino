import { Page, expect } from '@playwright/test';
import type { E2EGlobalState } from '../../src/shared/services/e2eState';

export async function getE2EState<T extends E2EGlobalState>(page: Page): Promise<T> {
  const state = await page.evaluate(() => (window as unknown as { __E2E__?: T }).__E2E__);
  expect(state, 'window.__E2E__ was never set — is the E2E build guard active?').toBeDefined();
  return state as T;
}
