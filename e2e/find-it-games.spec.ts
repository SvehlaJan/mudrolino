import { test, expect } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { pressAnswerById, waitForGamePhase } from './support/gameHarness';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';

interface FindItE2EState extends E2EGlobalState {
  gameId: 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'WORDS';
  gamePhase: GamePhase;
  correctItemId: string | null;
  gridItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}

interface FindItGameCase {
  name: string;
  gameId: FindItE2EState['gameId'];
  path: string;
}

const FIND_IT_GAMES: FindItGameCase[] = [
  { name: 'alphabet', gameId: 'ALPHABET', path: '/alphabet' },
  { name: 'syllables', gameId: 'SYLLABLES', path: '/syllables' },
  { name: 'numbers', gameId: 'NUMBERS', path: '/numbers' },
  { name: 'words', gameId: 'WORDS', path: '/words' },
];

async function findWrongId(page: import('@playwright/test').Page): Promise<string> {
  const state = await getE2EState<FindItE2EState>(page);
  const wrongId = state.gridItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target grid item').toBeDefined();
  return wrongId!;
}

for (const game of FIND_IT_GAMES) {
  test(`${game.name}: round has one target among unique answer ids`, async ({ page }) => {
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    const state = await getE2EState<FindItE2EState>(page);
    expect(state.gameId).toBe(game.gameId);
    expect(state.correctItemId).not.toBeNull();
    expect(state.gridItemIds.length).toBeGreaterThan(1);
    expect(new Set(state.gridItemIds).size).toBe(state.gridItemIds.length);
    expect(state.gridItemIds).toContain(state.correctItemId);
  });

  test(`${game.name}: answers are available while the opening prompt plays`, async ({ page }) => {
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
  });

  test(`${game.name}: correct answer reaches success feedback`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
    await expect(page.getByRole('status')).toContainText('Výborne');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test(`${game.name}: one and two wrong answers stay recoverable and do not count the round`, async ({ page }) => {
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const wrongId = await findWrongId(page);
      await pressAnswerById(page, wrongId);
      // 'answered-incorrectly' auto-clears to 'awaiting-answer' after TIMING.FEEDBACK_RESET_MS —
      // too transient to assert directly, so wait for the settled retry state instead.
      await waitForGamePhase(page, 'awaiting-answer');
    }

    const state = await getE2EState<FindItE2EState>(page);
    expect(state.roundsPlayed).toBe(0);
    expect(state.wrongAttempts).toBe(2);
  });

  test(`${game.name}: three wrong answers reach failure feedback and count the round without crediting it`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const wrongId = await findWrongId(page);
      await pressAnswerById(page, wrongId);
      if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
    }

    await waitForGamePhase(page, 'answered-incorrectly');
    await expect(page.getByRole('status')).toContainText('Nevadí');
    const state = await getE2EState<FindItE2EState>(page);
    expect(state.roundsPlayed).toBe(1);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}

// alphabet is the sole full-session representative for this cluster: round-counter and
// session-complete logic is shared via FindItGame across all 4 games, so one full run is
// enough to cover it. See docs/superpowers/specs/2026-07-08-automated-ui-testing-design.md.
test('alphabet: a full 5-round session reaches an explicit completion that requires a choice', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  for (let round = 0; round < 5; round += 1) {
    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    if (round < 4) {
      await waitForGamePhase(page, 'answered-correctly');
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }

  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();

  await page.waitForTimeout(5500);
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
