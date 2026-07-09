import { test, expect } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
  waitForOverlay,
  waitForOverlayCleared,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

interface FindItGameCase {
  name: string;
  path: string;
}

const FIND_IT_GAMES: FindItGameCase[] = [
  { name: 'alphabet', path: '/alphabet' },
  { name: 'syllables', path: '/syllables' },
  { name: 'numbers', path: '/numbers' },
  { name: 'words', path: '/words' },
];

interface FindItE2EState extends E2EGlobalState {
  correctItemId: string | null;
  gridItemIds: string[];
}

async function tapCorrectItem(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<FindItE2EState>(page);
  expect(state.correctItemId, 'expected an active target item').not.toBeNull();
  await page.getByRole('button', { name: state.correctItemId!, exact: true }).click();
}

async function tapWrongItem(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<FindItE2EState>(page);
  const wrongId = state.gridItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target grid item').toBeDefined();
  await page.getByRole('button', { name: wrongId!, exact: true }).click();
}

for (const game of FIND_IT_GAMES) {
  test(`${game.name}: correct answer reaches the success overlay`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    await tapCorrectItem(page);
    await waitForOverlay(page, 'success');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test(`${game.name}: three wrong answers reach the failure overlay`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    await tapWrongItem(page);
    await tapWrongItem(page);
    await tapWrongItem(page);
    await waitForOverlay(page, 'failure');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}

// alphabet is the sole full-session representative for this cluster: round-counter and
// session-complete logic is shared via FindItGame across all 4 games, so one full run is
// enough to cover it. See docs/superpowers/specs/2026-07-08-automated-ui-testing-design.md.
test('alphabet: a full 5-round session reaches the session-complete overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  for (let round = 0; round < 5; round += 1) {
    await tapCorrectItem(page);
    if (round < 4) {
      await waitForOverlay(page, 'success');
      await waitForOverlayCleared(page);
    }
  }

  await waitForOverlay(page, 'session-complete');
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
