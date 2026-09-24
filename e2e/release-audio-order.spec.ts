import { expect, test, type Page } from '@playwright/test';
import type { GameId } from '../src/shared/types';
import {
  clearAudioEvents,
  completeCurrentRound,
  getAudioEvents,
  getAudioClipPaths,
  pressAnswerById,
  readGamePhase,
  waitForGamePhase,
} from './support/gameHarness';
import { RELEASE_GAME_CASES, type ReleaseGameCase } from './support/releaseMatrix';

interface AudioOracle {
  correctItemId?: string | null;
  correctSide?: 'left' | 'right' | null;
  correctSum?: number | null;
  correctTileOrder?: string[];
  filledMissingCount?: number;
}

async function readOracle(page: Page): Promise<AudioOracle> {
  const state = await page.evaluate(() => window.__E2E__ as AudioOracle | undefined);
  expect(state, 'window.__E2E__ was never initialized').toBeDefined();
  return state!;
}

async function startGame(page: Page, game: ReleaseGameCase): Promise<void> {
  await page.goto(game.path);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
}

async function expectClipOrder(page: Page, expected: RegExp[]): Promise<void> {
  await expect.poll(async () => {
    const paths = await getAudioClipPaths(page);
    let after = -1;
    for (const pattern of expected) {
      after = paths.findIndex((path, index) => index > after && pattern.test(path));
      if (after < 0) return false;
    }
    return true;
  }).toBe(true);
}

function categoryFor(gameId: GameId): 'letters' | 'syllables' | 'numbers' | 'words' {
  switch (gameId) {
    case 'ALPHABET':
    case 'FIRST_LETTER':
    case 'COMPLETE_LETTER':
      return 'letters';
    case 'SYLLABLES':
    case 'ASSEMBLY':
    case 'COMPLETE_SYLLABLE':
      return 'syllables';
    case 'WORDS':
      return 'words';
    case 'NUMBERS':
    case 'COUNTING_ITEMS':
    case 'COMPARE_QUANTITIES':
    case 'ADDITION':
      return 'numbers';
  }
}

async function chooseWrongAnswer(page: Page, gameId: GameId): Promise<void> {
  if (gameId === 'COMPARE_QUANTITIES') {
    const { correctSide } = await readOracle(page);
    expect(correctSide).toBeTruthy();
    await page.locator(`[data-answer-side=${correctSide === 'left' ? 'right' : 'left'}]:visible`).click();
    return;
  }

  if (gameId === 'ASSEMBLY') {
    const { correctTileOrder } = await readOracle(page);
    expect(correctTileOrder?.length, 'assembly needs at least two tiles').toBeGreaterThanOrEqual(2);
    const wrongOrder = [correctTileOrder![1], correctTileOrder![0], ...correctTileOrder!.slice(2)];
    for (const [index, tileId] of wrongOrder.entries()) {
      const beforeEvents = (await getAudioEvents(page)).length;
      await page.locator(`[data-tile-id=${JSON.stringify(tileId)}]:visible`).click();
      if (index < wrongOrder.length - 1) {
        // A placed non-final tile animates and speaks before its answer lock releases.
        // Waiting for its complete clip prevents the next visible click from being ignored.
        await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(beforeEvents + 2);
        await waitForGamePhase(page, 'awaiting-answer');
      }
    }
    return;
  }

  const { correctItemId, correctSum } = await readOracle(page);
  const correctId = correctItemId ?? (correctSum === null || correctSum === undefined ? null : String(correctSum));
  expect(correctId).toBeTruthy();
  const wrongId = await page.locator('[data-answer-id]:visible').evaluateAll((answers, expectedId) =>
    answers.map(answer => answer.getAttribute('data-answer-id')).find(id => id !== expectedId), correctId);
  expect(wrongId, `expected a visible wrong answer for ${gameId}`).toBeTruthy();
  await pressAnswerById(page, wrongId!);
}

async function finishCorrectAnswer(page: Page, gameId: GameId): Promise<void> {
  if (gameId === 'ASSEMBLY') {
    const { correctTileOrder } = await readOracle(page);
    expect(correctTileOrder?.length).toBeGreaterThan(0);
    for (const tileId of correctTileOrder!.slice(0, -1)) {
      await page.locator(`[data-tile-id=${JSON.stringify(tileId)}]:visible`).click();
      await waitForGamePhase(page, 'awaiting-answer');
    }
    await clearAudioEvents(page);
    const finalTile = correctTileOrder![correctTileOrder!.length - 1];
    await page.locator(`[data-tile-id=${JSON.stringify(finalTile)}]:visible`).click();
    return;
  }

  if (gameId === 'COMPLETE_LETTER') {
    while (await readGamePhase(page) !== 'answered-correctly') {
      const before = await readOracle(page);
      // On the final blank React clears the oracle just before publishing the verdict.
      // That is a valid terminal transition, not a missing answer.
      if (!before.correctItemId) {
        await waitForGamePhase(page, 'answered-correctly');
        return;
      }
      await clearAudioEvents(page);
      await pressAnswerById(page, before.correctItemId!);
      await expect.poll(async () => {
        if (await readGamePhase(page) === 'answered-correctly') return true;
        return (await readOracle(page)).filledMissingCount! > (before.filledMissingCount ?? 0);
      }).toBe(true);
      if (await readGamePhase(page) === 'answered-correctly') return;
    }
    return;
  }

  await clearAudioEvents(page);
  await completeCurrentRound(page, gameId);
}

for (const game of RELEASE_GAME_CASES) {
  test(`${game.id}: selected-item audio precedes retry and praise`, async ({ page }) => {
    test.setTimeout(60_000);
    const category = categoryFor(game.id);
    const selection = new RegExp(`^sk/${category}/`);

    await startGame(page, game);
    await clearAudioEvents(page);
    await chooseWrongAnswer(page, game.id);
    await expectClipOrder(page, game.id === 'ASSEMBLY'
      ? [selection, /^sk\/phrases\/skus-to-znova$/, /^sk\/words\//]
      : [selection, /^sk\/phrases\/skus-to-znova$/]);
    await waitForGamePhase(page, 'awaiting-answer');

    await finishCorrectAnswer(page, game.id);
    await waitForGamePhase(page, 'answered-correctly');
    await expectClipOrder(page, [selection, /^sk\/praise\//]);
  });
}
