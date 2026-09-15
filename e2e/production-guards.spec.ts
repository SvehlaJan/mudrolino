import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  trackFailedRequests,
  expectNoConsoleErrors,
  expectNoFailedRequests,
} from './support/assertions';

test('production does not expose the parent gate adapter', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
  const exposed = await page.evaluate(() => 'parentGate' in (window.__E2E__ ?? {}));
  expect(exposed).toBe(false);

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
