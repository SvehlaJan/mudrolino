import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';

interface SmokeCase {
  name: string;
  path: string;
}

const ALL_GAME_ROUTES: SmokeCase[] = [
  { name: 'alphabet', path: '/alphabet' },
  { name: 'syllables', path: '/syllables' },
  { name: 'numbers', path: '/numbers' },
  { name: 'counting', path: '/counting' },
  { name: 'words', path: '/words' },
  { name: 'first-letter', path: '/first-letter' },
  { name: 'assembly', path: '/assembly' },
  { name: 'complete-syllable', path: '/complete-syllable' },
  { name: 'complete-letter', path: '/complete-letter' },
];

test('home: loads without errors', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

for (const game of ALL_GAME_ROUTES) {
  test(`${game.name}: route loads and lobby renders`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}
