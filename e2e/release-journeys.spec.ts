import { expect, test, type Page } from './support/fixtures';
import type { GameId } from '../src/shared/types';
import {
  expectNoConsoleErrors,
  expectNoFailedRequests,
  trackConsoleErrors,
  trackFailedRequests,
} from './support/assertions';
import {
  completeCurrentRound,
  pressAnswerById,
  readGamePhase,
  stubSpeechSynthesis,
} from './support/gameHarness';
import { RELEASE_GAME_CASES, type ReleaseGameCase } from './support/releaseMatrix';
import { ASSEMBLY_JAHODA, seedSingleAssemblyWord } from './support/literacyHarness';

interface ReleaseOracle {
  gameId?: GameId;
  correctItemId?: string | null;
  correctSide?: 'left' | 'right' | null;
  correctSum?: number | null;
  correctTileOrder?: string[];
}

interface TrackedPageIssues {
  errors: string[];
  failedRequests: string[];
}

const issuesByPage = new WeakMap<Page, TrackedPageIssues>();

test.beforeEach(({ page }) => {
  issuesByPage.set(page, {
    errors: trackConsoleErrors(page),
    failedRequests: trackFailedRequests(page),
  });
});

test.afterEach(({ page }) => {
  const issues = issuesByPage.get(page);
  if (!issues) throw new Error('release journey issue tracker was not initialized');
  expectNoConsoleErrors(issues.errors);
  expectNoFailedRequests(issues.failedRequests);
});

async function readReleaseOracle(page: Page): Promise<ReleaseOracle> {
  const state = await page.evaluate(
    () => (window as unknown as { __E2E__?: ReleaseOracle }).__E2E__,
  );
  expect(state, 'window.__E2E__ was never initialized').toBeDefined();
  return state as ReleaseOracle;
}

async function startFromHome(page: Page, game: ReleaseGameCase): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(game.title, 'i') }).click();
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
}

async function startGame(page: Page, gameId: GameId): Promise<void> {
  const game = RELEASE_GAME_CASES.find((candidate) => candidate.id === gameId);
  if (!game) throw new Error(`release matrix does not contain ${gameId}`);
  await startFromHome(page, game);
}

async function clickVisibleWrongAnswer(page: Page): Promise<void> {
  const { correctItemId, correctSum } = await readReleaseOracle(page);
  const correctId = correctItemId ?? (correctSum === null || correctSum === undefined ? null : String(correctSum));
  expect(correctId, 'expected a correct answer id').not.toBeNull();
  const wrongId = await page.locator('[data-answer-id]:visible').evaluateAll((answers, correctId) =>
    answers.map((answer) => answer.getAttribute('data-answer-id')).find((id) => id !== correctId),
  correctId);
  expect(wrongId, 'expected one visible wrong answer').toBeTruthy();
  await pressAnswerById(page, wrongId!);
}

async function expectRecoveredRound(page: Page, gameId: GameId): Promise<void> {
  await expect.poll(() => readGamePhase(page)).toBe('awaiting-answer');
  await completeCurrentRound(page, gameId);
  await expect.poll(() => readGamePhase(page)).toBe('answered-correctly');
}

for (const game of RELEASE_GAME_CASES) {
  test(`${game.id}: home to five-round completion and home`, async ({ page }) => {
    test.setTimeout(90_000);
    await stubSpeechSynthesis(page);
    await startFromHome(page, game);

    for (let round = 0; round < 5; round += 1) {
      await completeCurrentRound(page, game.id, round === 4 ? 'session-complete' : 'answered-correctly');
      if (round < 4) {
        await expect.poll(() => readGamePhase(page)).toBe('answered-correctly');
        await page.getByRole('button', { name: 'Pokračovať' }).click();
        await expect.poll(() => readGamePhase(page)).toBe('ready');
      }
    }

    await expect.poll(() => readGamePhase(page)).toBe('session-complete');
    await page.getByRole('button', { name: 'Domov' }).click();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page).toHaveURL('/');
  });
}

test('grid retry: alphabet recovers through a visible correct answer', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page, 'ALPHABET');
  await clickVisibleWrongAnswer(page);
  await expectRecoveredRound(page, 'ALPHABET');
});

test('sequence retry: assembly resets a wrong visible tile order', async ({ page }) => {
  // Swapping repeated syllables can still spell the target word; this retry needs distinct labels.
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await stubSpeechSynthesis(page);
  await startGame(page, 'ASSEMBLY');
  const { correctTileOrder } = await readReleaseOracle(page);
  expect(correctTileOrder?.length, 'expected at least two assembly tiles').toBeGreaterThanOrEqual(2);
  const labels = await Promise.all(correctTileOrder!.map(tileId =>
    page.locator(`[data-tile-id=${JSON.stringify(tileId)}]:visible`).getAttribute('aria-label'),
  ));
  expect(labels, 'every assembly tile must expose its syllable label').not.toContain(null);
  expect(new Set(labels).size, 'retry fixture must have distinct syllable labels').toBe(labels.length);
  const wrongOrder = [correctTileOrder![1], correctTileOrder![0], ...correctTileOrder!.slice(2)];
  for (const tileId of wrongOrder) {
    await page.locator(`[data-tile-id=${JSON.stringify(tileId)}]:visible`).click();
  }
  await page.waitForFunction(() => window.__E2E__?.gamePhase === 'answered-incorrectly', undefined, { polling: 20 });
  await expect.poll(() => readGamePhase(page)).toBe('awaiting-answer');
  await completeCurrentRound(page, 'ASSEMBLY');
  await expect.poll(() => readGamePhase(page)).toBe('answered-correctly');
});

test('counting retry: a visible wrong total remains recoverable', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page, 'COUNTING_ITEMS');
  await clickVisibleWrongAnswer(page);
  await expectRecoveredRound(page, 'COUNTING_ITEMS');
});

test('comparison retry: the opposite visible side remains recoverable', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page, 'COMPARE_QUANTITIES');
  const { correctSide } = await readReleaseOracle(page);
  expect(correctSide, 'expected comparison side').not.toBeNull();
  const wrongSide = correctSide === 'left' ? 'right' : 'left';
  await page.locator(`[data-answer-side=${wrongSide}]:visible`).click();
  await expectRecoveredRound(page, 'COMPARE_QUANTITIES');
});

test('addition retry: a visible wrong sum remains recoverable', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page, 'ADDITION');
  await clickVisibleWrongAnswer(page);
  await expectRecoveredRound(page, 'ADDITION');
});

test('replay: audio-first alphabet prompt is available', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page, 'ALPHABET');
  const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
  await expect(replay).toBeVisible();
  await replay.click();
});

test('replay: visual-and-audio counting prompt is available', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page, 'COUNTING_ITEMS');
  const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
  await expect(replay).toBeVisible();
  await replay.click();
});
