import { Page } from '@playwright/test';
import type { E2EGlobalState } from '../../src/shared/services/e2eState';

export async function getE2EState<T extends E2EGlobalState>(page: Page): Promise<T> {
  return page.evaluate(() => (window as unknown as { __E2E__: T }).__E2E__);
}
