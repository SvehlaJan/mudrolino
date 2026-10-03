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
  expect(await page.evaluate(() => window.__E2E__)).toBeUndefined();

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('release hides the avatar experiment and its preview route', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.goto('/avatar-preview');
  await expect(page).toHaveURL('/');
  await expect(page.locator('canvas')).toHaveCount(0);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('production redirects the development component gallery to home', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/ui-kit?example=game-materials');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'UI Kit', exact: true })).toHaveCount(0);
  await expect(page.getByTestId('component-gallery')).toHaveCount(0);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
