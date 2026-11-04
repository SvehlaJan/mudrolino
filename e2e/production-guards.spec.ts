import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  trackFailedRequests,
  expectNoConsoleErrors,
  expectNoFailedRequests,
} from './support/assertions';
import { startGame } from './support/gameEntry';

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


test('production ignores the candidate companion fixture global', async ({ page }) => {
  const fixtureRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('/__avatar_fixture/')) fixtureRequests.push(request.url()); });
  await page.addInitScript(() => { window.__E2E__ = { companionFixture: true }; });
  await startGame(page, '/alphabet');
  await expect(page.getByTestId('game-answer-region')).toBeVisible();
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  expect(fixtureRequests).toEqual([]);
});
