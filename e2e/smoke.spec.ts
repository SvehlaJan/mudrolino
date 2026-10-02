import { test, expect } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { GAME_DEFINITIONS } from '../src/shared/gameCatalog';

test('home: loads without errors', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

for (const game of GAME_DEFINITIONS) {
  test(`${game.path.replace('/', '')}: route loads and lobby renders`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}
