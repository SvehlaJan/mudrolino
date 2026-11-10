import { test, expect } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { GAME_DEFINITIONS } from '../src/shared/gameCatalog';
import { startGame } from './support/gameEntry';
import { unlockParentGate } from './support/parentGate';

test('home: loads without errors', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mudrolíno' })).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

for (const game of GAME_DEFINITIONS) {
  test(`${game.path.replace('/', '')}: route loads and the game screen renders`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await startGame(page, game.path);
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}

test('worksheets: parent route loads and renders printable sheets', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/settings/worksheets?seed=42');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { name: 'Pracovné listy' })).toBeVisible();
  await expect(page.getByTestId('worksheet-preview').getByTestId('worksheet-sheet').first()).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
