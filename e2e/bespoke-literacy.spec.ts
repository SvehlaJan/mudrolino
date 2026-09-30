import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  expectMinimumTarget,
  expectNoHorizontalOverflow,
  expectNoPairwiseOverlap,
  expectWithinViewport,
} from './support/layoutAssertions';
import { getE2EState } from './support/e2eHook';
import {
  clearAudioEvents,
  getAudioEvents,
  getAudioClipPaths,
  pressAnswerById,
  stubAudioPlayback,
  stubSpeechSynthesis,
  waitForGamePhase,
} from './support/gameHarness';
import { seedLocalStorage } from './support/persistenceFixtures';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import { CI_VIEWPORT_SUBSET } from './playwright.config';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';

function toAxeParams(page: Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

function isSeriousAxeViolation(impact: string | null | undefined): boolean {
  return ['critical', 'serious'].includes(impact ?? '');
}

test('UI kit exposes the literacy material vocabulary', async ({ page }) => {
  await page.goto('/ui-kit');
  const section = page.getByRole('region', { name: 'Literárne materiály' });
  await expect(section.getByTestId('picture-card')).toBeVisible();
  await expect(section.getByTestId('word-rail')).toBeVisible();
  await expect(section.getByTestId('inset-slot-active')).toHaveAttribute('data-slot-state', 'active');
  await expect(section.getByTestId('inset-slot-filled')).toHaveAttribute('data-slot-state', 'filled');
  await expectMinimumTarget(page, section.getByRole('button', { name: 'Slabika MA' }), 48);
  await expectNoHorizontalOverflow(page);
});

interface FirstLetterE2EState extends E2EGlobalState {
  gameId: 'FIRST_LETTER';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  answerItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}

test('Prvé písmenko uses the shared literacy shell', async ({ page }) => {
  await page.goto('/first-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prvé písmenko' })).toBeVisible();
  await expect(page.getByText('Ktorým písmenom sa začína toto slovo?')).toBeVisible();
  await expect(page.getByTestId('picture-card')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Vyber prvé písmeno' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();

  const state = await getE2EState<FirstLetterE2EState>(page);
  expect(state.gameId).toBe('FIRST_LETTER');
  expect(state.correctItemId).not.toBeNull();
  expect(state.answerItemIds.length).toBeGreaterThan(1);
  expect(new Set(state.answerItemIds).size).toBe(state.answerItemIds.length);
  expect(state.answerItemIds).toContain(state.correctItemId);
});

test('Prvé písmenko announces retry politely without changing the play surface', async ({ page }) => {
  await stubAudioPlayback(page);
  await stubSpeechSynthesis(page);
  await page.goto('/first-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<FirstLetterE2EState>(page);
  const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target answer magnet').toBeDefined();

  await pressAnswerById(page, wrongId!);
  // 'answered-incorrectly' (feedback: null) auto-clears to 'awaiting-answer' after
  // TIMING.FEEDBACK_RESET_MS — too transient for expect.poll's growing interval, so this
  // uses a tight fixed-interval wait, matching the established FindIt-game idiom.
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-incorrectly',
    undefined,
    { polling: 20 },
  );

  const status = page.getByRole('status');
  await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
  await expect(status).toContainText('Skús ešte raz');
  await expect(page.locator(`[data-answer-id="${wrongId}"]`)).toContainText('Skús ešte raz');
});

test('Prvé písmenko settles the correct magnet before showing success feedback', async ({ page }) => {
  await page.goto('/first-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<FirstLetterE2EState>(page);
  await pressAnswerById(page, state.correctItemId!);

  await waitForGamePhase(page, 'answered-correctly');
  await expect(page.locator(`[data-answer-id="${state.correctItemId}"]`)).toHaveAttribute('data-piece-state', 'settled');
  await expect(page.getByRole('status')).toBeVisible();
});

test('Prvé písmenko keyboard: Tab enters the answer group, ArrowRight moves focus, and Space activates exactly one choice', async ({ page }) => {
  await page.goto('/first-letter');
  const playButton = page.getByRole('button', { name: 'Hrať' });
  await playButton.focus();
  await page.keyboard.press('Enter');

  await getE2EState<FirstLetterE2EState>(page);

  const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
  await replay.focus();
  await page.keyboard.press('Tab');

  const answerButtons = page.locator('[data-testid="game-answer-region"] button');
  await expect(answerButtons.first()).toBeFocused();

  await page.keyboard.press('ArrowRight');
  await expect(answerButtons.nth(1)).toBeFocused();

  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase !== 'awaiting-answer',
    undefined,
    { polling: 20 },
  );

  const activated = page.locator(
    '[data-testid="game-answer-region"] button[data-piece-state="pressed"], '
    + '[data-testid="game-answer-region"] button[data-piece-state="settled"], '
    + '[data-testid="game-answer-region"] button[data-piece-state="retry"]',
  );
  expect(await activated.count()).toBe(1);
});

interface CompleteLetterE2EState extends E2EGlobalState {
  gameId: 'COMPLETE_LETTER';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  answerItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
  filledMissingCount: number;
  missingCount: number;
}

test('Doplň písmeno uses the shared literacy shell with a progressive word rail', async ({ page }) => {
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: 2 } });
  await page.goto('/complete-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Doplň písmeno' })).toBeVisible();
  await expect(page.getByText('Doplň chýbajúce písmeno')).toBeVisible();
  await expect(page.getByTestId('picture-card')).toBeVisible();
  await expect(page.getByTestId('word-rail')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();

  const rail = page.getByTestId('word-rail');
  await expect(rail.locator('[data-slot-state="active"]')).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="pending"]')).toHaveCount(1);

  const answerButtons = page.locator('[data-testid="game-answer-region"] button');
  await expect(answerButtons).toHaveCount(4);

  const state = await getE2EState<CompleteLetterE2EState>(page);
  expect(state.gameId).toBe('COMPLETE_LETTER');
  expect(state.missingCount).toBe(2);
  expect(state.filledMissingCount).toBe(0);
  expect(state.correctItemId).not.toBeNull();
  expect(state.answerItemIds).toContain(state.correctItemId);
  expect(new Set(state.answerItemIds).size).toBe(state.answerItemIds.length);
});

test('Doplň písmeno advances the active inset on the first correct fit and completes on the second', async ({ page }) => {
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: 2 } });
  await page.goto('/complete-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const firstState = await getE2EState<CompleteLetterE2EState>(page);
  expect(firstState.missingCount).toBe(2);
  expect(firstState.filledMissingCount).toBe(0);

  await pressAnswerById(page, firstState.correctItemId!);
  // First fit is a 'progress' outcome: it settles one inset and returns straight to
  // awaiting-answer — it must never end the round on its own.
  await page.waitForFunction(
    () => window.__E2E__?.filledMissingCount === 1,
    undefined,
    { polling: 20 },
  );

  const midState = await getE2EState<CompleteLetterE2EState>(page);
  expect(midState.roundsPlayed).toBe(0);
  expect(midState.gamePhase).not.toBe('answered-correctly');
  expect(midState.correctItemId).not.toBeNull();

  await pressAnswerById(page, midState.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');

  const finalState = await getE2EState<CompleteLetterE2EState>(page);
  expect(finalState.roundsPlayed).toBe(1);
  expect(finalState.filledMissingCount).toBe(2);
});

test('Doplň písmeno fails only on the third wrong tap across the whole word and reveals every remaining blank first', async ({ page }) => {
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: 2 } });
  await page.goto('/complete-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const initialState = await getE2EState<CompleteLetterE2EState>(page);
  expect(initialState.missingCount).toBe(2);
  const wrongId = initialState.answerItemIds.find((id) => id !== initialState.correctItemId);
  expect(wrongId, 'expected at least one non-target answer magnet').toBeDefined();

  const rail = page.getByTestId('word-rail');
  const status = page.getByRole('status');

  // First wrong tap: the attempt counter spans the whole word (not one blank), so this is just
  // a retry — the round stays active and nothing is revealed yet.
  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 1, undefined, { polling: 20 });
  let midState = await getE2EState<CompleteLetterE2EState>(page);
  expect(midState.filledMissingCount).toBe(0);
  expect(midState.roundsPlayed).toBe(0);
  await expect(status).toContainText('Skús ešte raz');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');

  // Second wrong tap: still a retry, not a failure — confirms the counter did not reset or
  // trip early on a per-blank basis.
  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 2, undefined, { polling: 20 });
  midState = await getE2EState<CompleteLetterE2EState>(page);
  expect(midState.filledMissingCount).toBe(0);
  expect(midState.roundsPlayed).toBe(0);
  await expect(status).toContainText('Skús ešte raz');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');

  // Third wrong tap exhausts the word: every remaining blank is revealed and the round ends
  // with failure feedback, not another retry.
  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 3, undefined, { polling: 20 });

  const finalState = await getE2EState<CompleteLetterE2EState>(page);
  expect(finalState.filledMissingCount).toBe(2);
  expect(finalState.roundsPlayed).toBe(1);

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(2);
  await expect(rail.locator('[data-slot-state="active"], [data-slot-state="pending"]')).toHaveCount(0);
  await expect(status).toContainText('Nevadí');
});

test('Doplň písmeno never reports an accented correct answer when accents are disabled', async ({ page }) => {
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { alphabetAccents: false } });
  await page.goto('/complete-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<CompleteLetterE2EState>(page);
  expect(state.correctItemId).not.toBeNull();
  expect(state.correctItemId!.normalize('NFD')).toBe(state.correctItemId);
  for (const id of state.answerItemIds) {
    expect(id.normalize('NFD')).toBe(id);
  }
});

interface CompleteSyllableE2EState extends E2EGlobalState {
  gameId: 'COMPLETE_SYLLABLE';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  answerItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}

test('Doplň slabiku uses the shared literacy shell with a one-blank inset word rail', async ({ page }) => {
  await page.goto('/complete-syllable');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Doplň slabiku' })).toBeVisible();
  await expect(page.getByText('Doplň chýbajúcu slabiku')).toBeVisible();
  await expect(page.getByTestId('picture-card')).toBeVisible();
  await expect(page.getByTestId('word-rail')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();

  const rail = page.getByTestId('word-rail');
  await expect(rail.locator('[data-slot-state="active"]')).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);

  const answerButtons = page.locator('[data-testid="game-answer-region"] button');
  await expect(answerButtons).toHaveCount(4);

  const state = await getE2EState<CompleteSyllableE2EState>(page);
  expect(state.gameId).toBe('COMPLETE_SYLLABLE');
  expect(state.correctItemId).not.toBeNull();
  expect(state.answerItemIds).toContain(state.correctItemId);
  expect(new Set(state.answerItemIds).size).toBe(state.answerItemIds.length);
});

test('Doplň slabiku announces retry politely without changing the play surface and leaves the inset unrevealed', async ({ page }) => {
  await stubAudioPlayback(page);
  await stubSpeechSynthesis(page);
  await page.goto('/complete-syllable');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<CompleteSyllableE2EState>(page);
  const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target syllable piece').toBeDefined();

  await pressAnswerById(page, wrongId!);
  // 'answered-incorrectly' (feedback: null) auto-clears to 'awaiting-answer' after
  // TIMING.FEEDBACK_RESET_MS — too transient for expect.poll's growing interval, so this
  // uses a tight fixed-interval wait, matching the established FindIt-game idiom.
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-incorrectly',
    undefined,
    { polling: 20 },
  );

  const status = page.getByRole('status');
  await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
  await expect(status).toContainText('Skús ešte raz');
  await expect(page.locator(`[data-answer-id="${wrongId}"]`)).toContainText('Skús ešte raz');

  const rail = page.getByTestId('word-rail');
  await expect(rail.locator('[data-slot-state="active"]')).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
});

test('Doplň slabiku fills the missing slot before showing success', async ({ page }) => {
  await page.goto('/complete-syllable');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<CompleteSyllableE2EState>(page);
  await pressAnswerById(page, state.correctItemId!);

  await waitForGamePhase(page, 'answered-correctly');
  await expect(page.locator(`[data-answer-id="${state.correctItemId}"]`)).toHaveAttribute('data-piece-state', 'settled');

  const rail = page.getByTestId('word-rail');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="active"]')).toHaveCount(0);
  await expect(rail.locator('[data-slot-state="filled"]')).toContainText(state.correctItemId!);
  await expect(page.getByRole('status')).toBeVisible();
});

test('Doplň slabiku fails only on the third wrong tap and reveals the missing syllable first', async ({ page }) => {
  await page.goto('/complete-syllable');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const initialState = await getE2EState<CompleteSyllableE2EState>(page);
  const wrongId = initialState.answerItemIds.find((id) => id !== initialState.correctItemId);
  expect(wrongId, 'expected at least one non-target syllable piece').toBeDefined();

  const rail = page.getByTestId('word-rail');
  const status = page.getByRole('status');

  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 1, undefined, { polling: 20 });
  await expect(status).toContainText('Skús ešte raz');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');

  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 2, undefined, { polling: 20 });
  await expect(status).toContainText('Skús ešte raz');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');

  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 3, undefined, { polling: 20 });

  const finalState = await getE2EState<CompleteSyllableE2EState>(page);
  expect(finalState.roundsPlayed).toBe(1);

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="active"]')).toHaveCount(0);
  await expect(rail.locator('[data-slot-state="filled"]')).toContainText(initialState.correctItemId!);
  await expect(status).toContainText('Nevadí');
});

interface AssemblyE2EState extends E2EGlobalState {
  gameId: 'ASSEMBLY';
  gamePhase: GamePhase;
  paused: boolean;
  wrongAttempts: number;
  roundsPlayed: number;
  totalTaps: number;
  replaying: boolean;
  trayTileIds: string[];
  placedTileIds: (string | null)[];
  correctTileOrder: string[];
}

const ASSEMBLY_JAHODA = { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' };
const ASSEMBLY_MAMA = { word: 'Mama', syllables: 'ma-ma', emoji: '👩', audioKey: 'mama' };
const LONG_LABEL_WORDS = {
  'first-letter': { word: 'Džús', syllables: 'džús', emoji: '🥤', audioKey: 'dzus' },
  'complete-letter': { word: 'Džús', syllables: 'džús', emoji: '🥤', audioKey: 'dzus' },
  'complete-syllable': { word: 'Stromalina', syllables: 'stro-ma-li-na', emoji: '🌳', audioKey: 'stromalina' },
  assembly: { word: 'Dlhý strom', syllables: 'dlo-hý-stro', emoji: '🌳', audioKey: 'dlhy-strom' },
} as const;

/**
 * Pins the eligible word pool to exactly one deterministic word, bypassing the random 33-word
 * default pool: `hrave-ucenie-seeded-sk: 'true'` short-circuits ContentProvider's own seeding
 * (LocalContentRepository.seed() no-ops once already seeded), and every default word the
 * migration re-adds behind the scenes lands `enabled: false` (see contentState.ts's `migrate()`),
 * leaving only this one custom, enabled, ready word playable.
 */
function seedSingleLiteracyWord(
  page: import('@playwright/test').Page,
  word: { word: string; syllables: string; emoji: string; audioKey: string },
) {
  return seedLocalStorage(page, {
    'hrave-ucenie-seeded-sk': 'true',
    'hrave-ucenie-user-words-sk': {
      version: 2,
      items: [
        {
          id: `e2e-assembly-${word.audioKey}`,
          word: word.word,
          syllables: word.syllables,
          emoji: word.emoji,
          audioKey: word.audioKey,
          status: 'ready',
          enabled: true,
          isDefault: false,
          locale: 'sk',
          order: 0,
        },
      ],
    },
  });
}

function seedSingleAssemblyWord(
  page: import('@playwright/test').Page,
  word: { word: string; syllables: string; emoji: string; audioKey: string },
) {
  return seedSingleLiteracyWord(page, word);
}

function expectEventsInOrder(events: string[], expected: Array<string | RegExp>): void {
  let after = -1;
  for (const event of expected) {
    const index = events.findIndex((actual, index) => index > after
      && (typeof event === 'string' ? actual === event : event.test(actual)));
    expect(index, `expected ${event} after event ${after}`).toBeGreaterThan(after);
    after = index;
  }
}

test('Skladaj uses the shared literacy shell with a tap-to-place felt tray and word rail', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skladaj' })).toBeVisible();
  await expect(page.getByText('Usporiadaj slabiky')).toBeVisible();
  await expect(page.getByTestId('picture-card')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();

  const tray = page.getByTestId('play-tray');
  await expect(tray).toBeVisible();
  const trayButtons = tray.locator('[data-tile-id]');
  await expect(trayButtons).toHaveCount(3);
  await expect(trayButtons.first()).toHaveAttribute('data-material', 'felt');
  await expectMinimumTarget(page, trayButtons.first(), 48);

  const rail = page.getByTestId('word-rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('[data-slot-state="pending"]')).toHaveCount(3);
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);

  const state = await getE2EState<AssemblyE2EState>(page);
  expect(state.gameId).toBe('ASSEMBLY');
  expect(state.trayTileIds).toHaveLength(3);
  expect(new Set(state.trayTileIds).size).toBe(3);
  expect(state.correctTileOrder).toHaveLength(3);
  expect(new Set(state.correctTileOrder)).toEqual(new Set(state.trayTileIds));
});

test('Skladaj fills the first open rail slot on a tray tap and returns the exact tile on a rail tap', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const firstTileId = state.trayTileIds[0];
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${firstTileId}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(1);
  await expect(rail.locator(`[data-tile-id="${firstTileId}"]`)).toHaveCount(1);
  await expect(tray.locator(`[data-tile-id="${firstTileId}"]`)).toHaveCount(0);

  const midState = await getE2EState<AssemblyE2EState>(page);
  expect(midState.roundsPlayed).toBe(0);
  expect(midState.totalTaps).toBe(0);

  await rail.locator(`[data-tile-id="${firstTileId}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await expect(tray.locator(`[data-tile-id="${firstTileId}"]`)).toHaveCount(1);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);
});

test('Skladaj settles a correct full rail before success, speaking the final syllable once before praise', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${state.correctTileOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${state.correctTileOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await clearAudioEvents(page);
  await tray.locator(`[data-tile-id="${state.correctTileOrder[2]}"]`).click();
  await waitForGamePhase(page, 'answered-correctly');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(3);
  await expect(page.getByRole('status')).toBeVisible();

  // Phase advances on ANSWER_CORRECT before the praise verdict audio is awaited — wait for both
  // the selection clip (2 events) and the praise clip (2 events) to actually land.
  await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(4);
  const events = await getAudioEvents(page);
  expectEventsInOrder(events, [
    /^start:sk\/syllables\//,
    /^finish:sk\/syllables\//,
    /^start:sk\/praise\//,
    /^finish:sk\/praise\//,
  ]);
  expect(events.filter((e) => e.startsWith('start:sk/syllables/'))).toHaveLength(1);

  const finalState = await getE2EState<AssemblyE2EState>(page);
  expect(finalState.roundsPlayed).toBe(1);
  expect(finalState.totalTaps).toBe(1);
});

test('Skladaj announces retry without a visible banner on a wrong full rail, plays its special sequence once, then returns every tile without counting a completed round', async ({ page }) => {
  await stubAudioPlayback(page);
  await stubSpeechSynthesis(page);
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const wrongOrder = [second, first, third];
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');
  const status = page.getByRole('status');

  await tray.locator(`[data-tile-id="${wrongOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${wrongOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await clearAudioEvents(page);
  await tray.locator(`[data-tile-id="${wrongOrder[2]}"]`).click();
  await waitForGamePhase(page, 'answered-incorrectly');

  await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
  await expect(status).toContainText('Skús ešte raz');

  // The documented exception: exactly the wrong syllable, then retry, then the target word —
  // no immediate selected-syllable call precedes this sequence, and nothing duplicates it.
  await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(6);
  const events = await getAudioEvents(page);
  expectEventsInOrder(events, [
    /^start:sk\/syllables\//,
    /^finish:sk\/syllables\//,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
    'start:sk/words/jahoda',
    'finish:sk/words/jahoda',
  ]);
  expect(events.filter((e) => e.startsWith('start:sk/syllables/'))).toHaveLength(1);

  const midState = await getE2EState<AssemblyE2EState>(page);
  expect(midState.roundsPlayed).toBe(0);
  expect(midState.totalTaps).toBe(1);

  await waitForGamePhase(page, 'awaiting-answer');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await expect(rail.locator('[data-slot-state="pending"]')).toHaveCount(3);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);

  const finalState = await getE2EState<AssemblyE2EState>(page);
  expect(finalState.roundsPlayed).toBe(0);
});

test('Skladaj keeps repeated syllables independently operable by stable tile ID', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_MAMA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  expect(state.trayTileIds).toHaveLength(2);
  const [tileA, tileB] = state.trayTileIds;

  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${tileA}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(rail.locator(`[data-tile-id="${tileA}"]`)).toHaveCount(1);
  await expect(tray.locator(`[data-tile-id="${tileB}"]`)).toHaveCount(1);

  // Returning tile A must not disturb tile B, which stays independently available by its own id.
  await rail.locator(`[data-tile-id="${tileA}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(tray.locator(`[data-tile-id="${tileA}"]`)).toHaveCount(1);
  await expect(tray.locator(`[data-tile-id="${tileB}"]`)).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);

  // Placing B before A still completes the word correctly — both tiles carry the same text.
  await tray.locator(`[data-tile-id="${tileB}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${tileA}"]`).click();
  await waitForGamePhase(page, 'answered-correctly');

  await expect(rail.locator(`[data-tile-id="${tileB}"]`)).toHaveCount(1);
  await expect(rail.locator(`[data-tile-id="${tileA}"]`)).toHaveCount(1);
});

test('Skladaj tray and rail form two independent roving-tabstop keyboard groups', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  const trayButtons = tray.locator('[data-tile-id]');
  await trayButtons.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(trayButtons.nth(1)).toBeFocused();

  await tray.locator(`[data-tile-id="${state.correctTileOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${state.correctTileOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  const railButtons = rail.locator('[data-tile-id]');
  await expect(railButtons).toHaveCount(2);
  await railButtons.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(railButtons.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(railButtons.first()).toBeFocused();

  // Returning the focused rail tile restores logical focus to it back in the tray.
  await page.keyboard.press('Enter');
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(tray.locator(`[data-tile-id="${state.correctTileOrder[0]}"]`)).toBeFocused();
});

test('Skladaj reaches the correct final board under reduced motion with no stale floating tiles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');

  for (const tileId of state.correctTileOrder) {
    await tray.locator(`[data-tile-id="${tileId}"]`).click();
    await page.waitForFunction(
      () => window.__E2E__?.gamePhase !== 'resolving-answer',
      undefined,
      { polling: 20 },
    );
  }
  await waitForGamePhase(page, 'answered-correctly');

  await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(3);

  // Reduced motion never clones a tile — every id must appear exactly once in the live DOM.
  const ids = await page.locator('[data-tile-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
});

test('Skladaj leaves no stale floating tile clones after a wrong full rail resets', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const tray = page.getByTestId('play-tray');

  for (const tileId of [second, first, third]) {
    await tray.locator(`[data-tile-id="${tileId}"]`).click();
    await page.waitForFunction(
      () => window.__E2E__?.gamePhase !== 'resolving-answer',
      undefined,
      { polling: 20 },
    );
  }

  // The automatic retry -> reset cycle settles the board back to a full tray; poll past the
  // GSAP flight duration so no floating clone is still mid-flight when nodes are counted.
  await waitForGamePhase(page, 'awaiting-answer');
  await expect.poll(() => page.locator('[data-tile-id]').count()).toBe(3);
  const ids = await page.locator('[data-tile-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
  expect(new Set(ids).size).toBe(3);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);
});

// ============================================================================
// Task 7: cluster-wide hardening.
//
// Tasks 3-6 each covered pause/keyboard/reduced-motion/focus for what that task's own brief
// required, on the mechanic it migrated. This section closes the remaining gaps across all four
// games together: the full canonical-viewport matrix, pause/rotation/focus exercised uniformly,
// and assistive/reduced-motion checks exercised uniformly — reusing each game's own oracle hook
// rather than duplicating the golden-path coverage already above.
// ============================================================================

interface BespokeRoundState extends E2EGlobalState {
  gameId: 'FIRST_LETTER' | 'COMPLETE_LETTER' | 'COMPLETE_SYLLABLE' | 'ASSEMBLY';
  gamePhase: GamePhase;
  paused: boolean;
  roundsPlayed: number;
  wrongAttempts: number;
}

interface GenericChoiceState extends BespokeRoundState {
  correctItemId: string | null;
  answerItemIds: string[];
}

/** The 3-choice games (first-letter, complete-letter, complete-syllable) share one E2E state
 * shape and one single-tap AnswerGroup mechanic, so they share one set of round helpers. */
async function genericAnswerWrong(page: Page): Promise<string> {
  const state = await getE2EState<GenericChoiceState>(page);
  const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target answer').toBeDefined();
  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-incorrectly',
    undefined,
    { polling: 20 },
  );
  return wrongId!;
}

async function genericAnswerCorrect(page: Page): Promise<string> {
  const state = await getE2EState<GenericChoiceState>(page);
  await pressAnswerById(page, state.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');
  return state.correctItemId!;
}

async function genericFinishSessionCorrectly(page: Page): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await genericAnswerCorrect(page);
    if (round < 4) {
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }
  await waitForGamePhase(page, 'session-complete');
}

/** Assembly has no single-tap "wrong answer" — a wrong outcome only exists at a wrong FULL
 * rail (see AssemblyGame's own documented exception), so its round helpers place three tiles. */
async function asmAnswerWrong(page: Page): Promise<string> {
  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const wrongOrder = [second, first, third];
  const tray = page.getByTestId('play-tray');
  await tray.locator(`[data-tile-id="${wrongOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${wrongOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${wrongOrder[2]}"]`).click();
  // The retry window is only TIMING.FEEDBACK_RESET_MS (500ms) wide, so this uses the tight
  // fixed-interval wait the three choice games already use rather than `waitForGamePhase`'s
  // `expect.poll`, whose growing interval can spend a large share of that window before it
  // even observes the phase.
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-incorrectly',
    undefined,
    { polling: 20 },
  );
  return wrongOrder[2];
}

async function asmAnswerCorrect(page: Page): Promise<string> {
  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');
  const order = state.correctTileOrder;
  for (const tileId of order.slice(0, -1)) {
    await tray.locator(`[data-tile-id="${tileId}"]`).click();
    await waitForGamePhase(page, 'awaiting-answer');
  }
  const lastTileId = order[order.length - 1];
  await tray.locator(`[data-tile-id="${lastTileId}"]`).click();
  await waitForGamePhase(page, 'answered-correctly');
  return lastTileId;
}

async function asmFinishSessionCorrectly(page: Page): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await asmAnswerCorrect(page);
    if (round < 4) {
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }
  await waitForGamePhase(page, 'session-complete');
}

interface BespokeGameCase {
  name: 'first-letter' | 'complete-letter' | 'complete-syllable' | 'assembly';
  path: string;
  heading: string;
  instruction: string;
  /** Navigates, seeds any fixture content Assembly needs for determinism, and starts a round
   * through the real Hrať control. */
  enterPlay(page: Page): Promise<void>;
  /** Taps/places a wrong answer, landing in the shared 'answered-incorrectly' retry state.
   * Returns the acted-on control's `data-answer-id`/`data-tile-id`. */
  answerWrong(page: Page): Promise<string>;
  /** Taps/places the correct answer(s), completing exactly one round successfully. Returns the
   * acted-on control's `data-answer-id`/`data-tile-id`. */
  answerCorrect(page: Page): Promise<string>;
  /** Plays every round of a 5-round session correctly, reaching session-complete. */
  finishSessionCorrectly(page: Page): Promise<void>;
}

const BESPOKE_GAMES: BespokeGameCase[] = [
  {
    name: 'first-letter',
    path: '/first-letter',
    heading: 'Prvé písmenko',
    instruction: 'Ktorým písmenom sa začína toto slovo?',
    enterPlay: async (page) => {
      await page.goto('/first-letter');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: genericAnswerWrong,
    answerCorrect: genericAnswerCorrect,
    finishSessionCorrectly: genericFinishSessionCorrectly,
  },
  {
    name: 'complete-letter',
    path: '/complete-letter',
    heading: 'Doplň písmeno',
    instruction: 'Doplň chýbajúce písmeno',
    enterPlay: async (page) => {
      await page.goto('/complete-letter');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: genericAnswerWrong,
    answerCorrect: genericAnswerCorrect,
    finishSessionCorrectly: genericFinishSessionCorrectly,
  },
  {
    name: 'complete-syllable',
    path: '/complete-syllable',
    heading: 'Doplň slabiku',
    instruction: 'Doplň chýbajúcu slabiku',
    enterPlay: async (page) => {
      await page.goto('/complete-syllable');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: genericAnswerWrong,
    answerCorrect: genericAnswerCorrect,
    finishSessionCorrectly: genericFinishSessionCorrectly,
  },
  {
    name: 'assembly',
    path: '/assembly',
    heading: 'Skladaj',
    instruction: 'Usporiadaj slabiky',
    enterPlay: async (page) => {
      await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
      await page.goto('/assembly');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: asmAnswerWrong,
    answerCorrect: asmAnswerCorrect,
    finishSessionCorrectly: asmFinishSessionCorrectly,
  },
];

/** Selects a control by either attribute a game's round helpers might report — `data-answer-id`
 * for the three choice games, `data-tile-id` for Assembly. */
function actedControl(page: Page, id: string) {
  return page.locator(`[data-answer-id="${id}"], [data-tile-id="${id}"]`);
}

/**
 * OverlayFrame's enter transition fades opacity 0→1 over motionPreset.transition (180ms), even
 * under reduced motion (only translate/scale are dropped, not the fade itself). Playwright's own
 * `visible` check resolves the instant opacity leaves 0, so an axe scan immediately after can
 * catch a genuinely mid-fade frame and report a transient contrast "violation" that never
 * reflects the settled panel — wait for the observable computed opacity to actually reach 1.
 */
async function waitForOverlaySettled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const panel = document.querySelector('[role="status"][aria-live="polite"]');
    return panel !== null && getComputedStyle(panel).opacity === '1';
  });
}

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/**
 * Confirms `locator` isn't silently clipped by an ancestor whose own overflow is restricting it
 * (e.g. a `max-h-*`/`overflow-y-auto` wrapper whose content is taller than its own box, or a
 * plain `overflow-hidden` container). `expectWithinViewport` alone can't catch this — a clipped
 * element's bounding box can sit entirely within the page viewport while genuinely invisible
 * under its own ancestor's clip, exactly the shape of gap Task 7 closed in `PictureCard`/
 * `WordRail`'s short-layout wrapper (a fixed cap that left WordRail no room at all).
 */
async function expectNotClippedByAncestorOverflow(locator: ReturnType<Page['locator']>): Promise<void> {
  const clippingAncestor = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    let node = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      const restricts = ['auto', 'hidden', 'scroll'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      if (restricts) {
        const ancestorRect = node.getBoundingClientRect();
        const visibleTop = ancestorRect.top;
        const visibleBottom = ancestorRect.top + node.clientHeight;
        if (rect.top < visibleTop - 1 || rect.bottom > visibleBottom + 1) {
          return node.getAttribute('data-testid') ?? node.className ?? node.tagName;
        }
      }
      node = node.parentElement;
    }
    return null;
  });
  expect(clippingAncestor, `expected element not to be clipped by ancestor "${clippingAncestor}"`).toBeNull();
}

/** Every interactive playing-surface control a bespoke round exposes — AnswerGroup's choice
 * buttons for the three choice games, the felt tray tiles for Assembly. */
const PLAY_SURFACE_CONTROLS =
  '[data-testid="game-answer-region"] button, [data-testid="play-tray"] [data-tile-id]';

/**
 * AnswerGroup derives its grid geometry (column count and an explicit pixel `--tile-size`) inside
 * a ResizeObserver callback, so tile positions can still move a frame or two after first paint or
 * after any layout change. Clicking before that settles can land the pointer on a neighbouring
 * tile. The rotation test below already polls for this after a resize; this helper generalises it
 * to "two consecutive reads of every control's box agree", which is what the screenshot capture
 * tool needs too (`tools/screenshots/capture.mjs`).
 */
async function waitForPlaySurfaceSettled(page: Page): Promise<void> {
  await page.locator(PLAY_SURFACE_CONTROLS).first().waitFor({ state: 'visible' });
  let previous = '';
  await expect.poll(async () => {
    const current = await page.evaluate((selector) => Array.from(document.querySelectorAll(selector))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
      })
      .join('|'), PLAY_SURFACE_CONTROLS);
    const settled = current !== '' && current === previous;
    previous = current;
    return settled;
  }).toBe(true);
}

test.describe('Task 7: Full viewport matrix', () => {
  const viewportEntries = Object.entries(CANONICAL_VIEWPORTS) as Array<
    [keyof typeof CANONICAL_VIEWPORTS, (typeof CANONICAL_VIEWPORTS)[keyof typeof CANONICAL_VIEWPORTS]]
  >;

  for (const game of BESPOKE_GAMES) {
    for (const [viewportName, viewport] of viewportEntries) {
      test(`${game.name} meets viewport constraints at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        test.skip(
          Boolean(process.env.CI) && !CI_VIEWPORT_SUBSET.includes(viewportName),
          'the full 10-size matrix runs locally and is covered by screenshot review; CI asserts the 4-viewport subset',
        );

        await page.setViewportSize(viewport);
        await game.enterPlay(page);

        await expectNoHorizontalOverflow(page);

        // Child playfields (the picture/word-rail prompt visuals) may compress or scroll inside
        // the bounded shell, so they only need to intersect the viewport, not sit fully inside
        // it — unlike the answer region, replay, progress, and back action below.
        for (const locator of [page.getByTestId('game-visible-instruction'), page.getByTestId('game-answer-region')]) {
          const box = await locator.boundingBox();
          expect(box, `${game.name} at ${viewportName}: expected a visible bounding box`).not.toBeNull();
          expect(box!.x, `${game.name} at ${viewportName}: must intersect the viewport horizontally`).toBeLessThan(viewport.width);
          expect(box!.x + box!.width, `${game.name} at ${viewportName}: must intersect the viewport horizontally`).toBeGreaterThan(0);
        }

        // Three of the four games render a WordRail — the actual blank(s) the round is about —
        // inside the same prompt area as PictureCard. It must stay genuinely visible, not just
        // "somewhere on the page": this is what a fixed, too-small wrapper cap broke silently.
        const wordRail = page.getByTestId('word-rail');
        if (await wordRail.count() > 0) {
          await expect(wordRail).toBeVisible();
          await expectWithinViewport(page, wordRail);
          await expectNotClippedByAncestorOverflow(wordRail);
        }

        const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
        const back = page.getByRole('button', { name: 'Späť', exact: true });
        const progress = page.getByRole('progressbar', { name: 'Postup v hre' });
        const answerRegion = page.getByTestId('game-answer-region');

        await expectWithinViewport(page, answerRegion);
        await expectWithinViewport(page, replay);
        await expectWithinViewport(page, progress);
        await expectWithinViewport(page, back);

        await expectMinimumTarget(page, replay, 48);
        await expectMinimumTarget(page, back, 48);

        const answers = page.locator('[data-testid="game-answer-region"] button');
        const count = await answers.count();
        expect(count, `${game.name} at ${viewportName}: expected at least one answer control`).toBeGreaterThan(0);
        for (let i = 0; i < count; i += 1) {
          await expectMinimumTarget(page, answers.nth(i), 48);
        }
        await expectNoPairwiseOverlap(answers);
      });
    }
  }
});

/**
 * The retry announcement must not change the prompt or answer area's geometry. Exercise every
 * bespoke game at each canonical viewport, then confirm the playfield remains usable.
 */
test.describe('Final review: retries keep the prompt and answer area geometry', () => {
  const viewportEntries = Object.entries(CANONICAL_VIEWPORTS) as Array<
    [keyof typeof CANONICAL_VIEWPORTS, (typeof CANONICAL_VIEWPORTS)[keyof typeof CANONICAL_VIEWPORTS]]
  >;

  for (const game of BESPOKE_GAMES) {
    for (const [viewportName, viewport] of viewportEntries) {
      test(`${game.name} keeps retry announcement off the play surface at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        test.skip(
          Boolean(process.env.CI) && !CI_VIEWPORT_SUBSET.includes(viewportName),
          'the full 10-size matrix runs locally and is covered by screenshot review; CI asserts the 4-viewport subset',
        );

        // Audio completion is stubbed because this check measures geometry, not playback timing.
        await stubAudioPlayback(page);
        await stubSpeechSynthesis(page);
        await page.setViewportSize(viewport);
        await game.enterPlay(page);
        await waitForPlaySurfaceSettled(page);

        const readGeometry = () => page.evaluate((selector) => {
          const box = (el: Element | null) => {
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          };
          const tray = document.querySelector('[data-testid="play-tray"]');
          return {
            prompt: box(document.querySelector('[data-testid="game-visible-instruction"]')),
            interactiveContent: box(document.querySelector('[data-testid="game-interactive-content"]')),
            answerRegion: box(document.querySelector('[data-testid="game-answer-region"]')),
            tray: box(document.querySelector('[data-testid="play-tray"]')),
            controls: Array.from(document.querySelectorAll(selector)).map((el) => box(el)!),
            trayOverflowPx: tray ? tray.scrollHeight - tray.clientHeight : null,
            viewportHeight: window.innerHeight,
          };
        }, PLAY_SURFACE_CONTROLS);
        const beforeRetry = await readGeometry();
        await game.answerWrong(page);
        const snapshot = await readGeometry();

        expect(snapshot.prompt, `${game.name} at ${viewportName}: expected a measurable prompt`).not.toBeNull();
        expect(snapshot.interactiveContent).toEqual(beforeRetry.interactiveContent);
        expect(snapshot.answerRegion, `${game.name} at ${viewportName}: expected a measurable answer region`).not.toBeNull();
        expect(snapshot.prompt).toEqual(beforeRetry.prompt);
        expect(snapshot.answerRegion).toEqual(beforeRetry.answerRegion);
        expect(snapshot.tray).toEqual(beforeRetry.tray);
        await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
        await expect(page.getByTestId('game-retry-status')).toHaveAttribute('aria-live', 'polite');

        // Every control must remain an on-screen, minimum-size target in the retry state.
        expect(snapshot.controls.length, `${game.name} at ${viewportName}: expected at least one control`).toBeGreaterThan(0);
        for (const control of snapshot.controls) {
          expect(
            Math.min(control.width, control.height),
            `${game.name} at ${viewportName}: control ${JSON.stringify(control)} is under the 48px child target during retry`,
          ).toBeGreaterThanOrEqual(47.5);
          expect(
            control.bottom,
            `${game.name} at ${viewportName}: control ${JSON.stringify(control)} runs past the bottom of the viewport during retry`,
          ).toBeLessThanOrEqual(snapshot.viewportHeight + 1);
        }
        expect(
          snapshot.trayOverflowPx,
          `${game.name} at ${viewportName}: the play tray is clipping ${snapshot.trayOverflowPx}px of its own content during retry`,
        ).toBeLessThanOrEqual(1);

        const answerRegion = page.getByTestId('game-answer-region');
        await expectNotClippedByAncestorOverflow(answerRegion);
        await expectNoHorizontalOverflow(page);
      });
    }
  }
});

/**
 * The answer-grid geometry is deliberately driven by the available tray height on short
 * landscapes. Its labels therefore cannot use viewport width alone: at 667px wide the former
 * 7vw scale made a three-character syllable much wider than its roughly 61px answer tile. Check
 * the rendered label box itself rather than scroll metrics, because TactilePiece intentionally
 * allows its child content to paint outside its border in ordinary layouts.
 */
test.describe('Final review: literacy answer labels stay inside their tiles on landscape phones', () => {
  const LANDSCAPE_VIEWPORTS: Array<[string, { width: number; height: number }]> = [
    ['shortLandscape', CANONICAL_VIEWPORTS.shortLandscape],
    ['phoneLandscape', CANONICAL_VIEWPORTS.phoneLandscape],
  ];
  const EXPECTED_STRESS_LABELS: Record<BespokeGameCase['name'], string[]> = {
    'first-letter': ['DŽ'],
    'complete-letter': ['DŽ'],
    'complete-syllable': ['STRO'],
    assembly: ['DLO', 'STRO'],
  };

  async function expectAnswerLabelsContained(
    page: Page,
    context: string,
    expectedLabels: string[],
  ): Promise<void> {
    const geometry = await page.locator('[data-testid="game-answer-region"] button > .font-spline').evaluateAll((labels) =>
      labels.map((label) => {
        const labelRect = label.getBoundingClientRect();
        const tileRect = label.parentElement!.getBoundingClientRect();
        return {
          label: label.textContent?.trim(),
          labelLeft: labelRect.left,
          labelRight: labelRect.right,
          labelTop: labelRect.top,
          labelBottom: labelRect.bottom,
          tileLeft: tileRect.left,
          tileRight: tileRect.right,
          tileTop: tileRect.top,
          tileBottom: tileRect.bottom,
          tileWidth: tileRect.width,
          tileHeight: tileRect.height,
        };
      }),
    );

    expect(geometry.length, `${context}: expected answer labels`).toBeGreaterThan(0);
    for (const expectedLabel of expectedLabels) {
      expect(
        geometry.some((item) => item.label === expectedLabel),
        `${context}: expected stress label ${expectedLabel} before measuring containment`,
      ).toBe(true);
    }
    for (const item of geometry) {
      expect(item.tileWidth, `${context}: ${item.label} target width`).toBeGreaterThanOrEqual(48);
      expect(item.tileHeight, `${context}: ${item.label} target height`).toBeGreaterThanOrEqual(48);
      expect(item.labelLeft, `${context}: ${item.label} extends left of its tile`).toBeGreaterThanOrEqual(item.tileLeft - 0.5);
      expect(item.labelRight, `${context}: ${item.label} extends right of its tile`).toBeLessThanOrEqual(item.tileRight + 0.5);
      expect(item.labelTop, `${context}: ${item.label} extends above its tile`).toBeGreaterThanOrEqual(item.tileTop - 0.5);
      expect(item.labelBottom, `${context}: ${item.label} extends below its tile`).toBeLessThanOrEqual(item.tileBottom + 0.5);
    }
  }

  async function enterLongLabelRound(page: Page, game: BespokeGameCase): Promise<void> {
    // The production pools are shuffled, so pin one word per game and make the missing-letter
    // picker choose its first unit. This guarantees the label that previously escaped its tile:
    // DŽ for the two letter games, STRO for missing-syllable, and DLO/STRO in Assembly.
    await page.addInitScript(() => { Math.random = () => 0; });
    await seedSingleLiteracyWord(page, LONG_LABEL_WORDS[game.name]);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();
  }

  for (const game of BESPOKE_GAMES) {
    for (const [viewportName, viewport] of LANDSCAPE_VIEWPORTS) {
      test(`${game.name} contains every answer label in ${viewportName} during a round and retry`, async ({ page }) => {
        await stubSpeechSynthesis(page);
        await page.setViewportSize(viewport);
        await enterLongLabelRound(page, game);
        await waitForPlaySurfaceSettled(page);

        await expectAnswerLabelsContained(
          page,
          `${game.name} at ${viewportName} during a round`,
          EXPECTED_STRESS_LABELS[game.name],
        );

        await game.answerWrong(page);
        await expectAnswerLabelsContained(
          page,
          `${game.name} at ${viewportName} during retry`,
          EXPECTED_STRESS_LABELS[game.name],
        );
      });
    }
  }
});

test.describe('Task 7: WordRail must stay genuinely visible, not just on-page', () => {
  // Dedicated, never-CI-skipped coverage for exactly the two sizes a real ancestor-clipping
  // regression was found at: the app's own canonical mobile viewport (phonePortrait, the same
  // size as MOBILE_VIEWPORT used throughout the rest of this suite) and shortLandscape. The full
  // viewport-matrix test above also checks this at all 10 sizes, but only asserts the 4-viewport
  // CI subset in CI — this block runs regardless, so a regression here always fails the suite.
  const WORD_RAIL_GAMES = BESPOKE_GAMES.filter((game) => game.name !== 'first-letter');
  const CHECK_VIEWPORTS: Array<[string, { width: number; height: number }]> = [
    ['phonePortrait (MOBILE_VIEWPORT)', CANONICAL_VIEWPORTS.phonePortrait],
    ['shortLandscape', CANONICAL_VIEWPORTS.shortLandscape],
  ];

  for (const game of WORD_RAIL_GAMES) {
    for (const [viewportName, viewport] of CHECK_VIEWPORTS) {
      test(`${game.name}: word-rail is visible and unclipped at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await game.enterPlay(page);

        const wordRail = page.getByTestId('word-rail');
        await expect(wordRail).toBeVisible();
        await expectWithinViewport(page, wordRail);
        await expectNotClippedByAncestorOverflow(wordRail);

        // The actual blank(s)/letters inside must be visible too, not merely the section shell.
        const slots = wordRail.locator('[data-slot-state]');
        const slotCount = await slots.count();
        expect(slotCount, `${game.name} at ${viewportName}: expected at least one word-rail slot`).toBeGreaterThan(0);
        for (let i = 0; i < slotCount; i += 1) {
          await expect(slots.nth(i)).toBeVisible();
        }
      });
    }
  }
});

test.describe('Task 7: Rotation preserves focus', () => {
  for (const game of BESPOKE_GAMES) {
    test(`${game.name}: rotating portrait to landscape mid-round preserves round state and focus without clipping`, async ({ page }) => {
      await page.setViewportSize(CANONICAL_VIEWPORTS.phonePortrait);
      await game.enterPlay(page);
      await game.answerWrong(page);
      await waitForGamePhase(page, 'awaiting-answer');

      const before = await getE2EState<BespokeRoundState>(page);
      const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
      await replay.focus();

      await page.setViewportSize(CANONICAL_VIEWPORTS.phoneLandscape);
      await expectNoHorizontalOverflow(page);
      // AnswerGroup's own grid geometry is recomputed from a ResizeObserver callback, not
      // synchronously with the resize itself — unlike a fresh page load (where it's already
      // settled by the time a check runs), a resize on an already-mounted page needs a beat to
      // catch up. Poll for that settlement instead of asserting once immediately after resizing.
      await expect.poll(async () => {
        const rect = await page.getByTestId('game-answer-region').evaluate((el) => el.getBoundingClientRect());
        const viewport = page.viewportSize();
        return viewport !== null && rect.bottom <= viewport.height + 1;
      }).toBe(true);
      await expectWithinViewport(page, page.getByTestId('game-answer-region'));
      await expectWithinViewport(page, replay);
      await expect(replay).toBeFocused();

      const afterLandscape = await getE2EState<BespokeRoundState>(page);
      expect(afterLandscape.gamePhase).toBe(before.gamePhase);
      expect(afterLandscape.roundsPlayed).toBe(before.roundsPlayed);
      expect(afterLandscape.wrongAttempts).toBe(before.wrongAttempts);

      await page.setViewportSize(CANONICAL_VIEWPORTS.phonePortrait);
      await expectNoHorizontalOverflow(page);
      const restored = await getE2EState<BespokeRoundState>(page);
      expect(restored.roundsPlayed).toBe(before.roundsPlayed);
      expect(restored.wrongAttempts).toBe(before.wrongAttempts);

      // The round must still be completable after two resizes.
      await game.answerCorrect(page);
    });
  }
});

test.describe('Task 7: Assistive contract', () => {
  for (const game of BESPOKE_GAMES) {
    test(`${game.name}: exposes one main, one heading, visible prompt/replay/progress, roving tabstop, and visible+live retry/correct states`, async ({ page }) => {
      await game.enterPlay(page);

      await expect(page.getByRole('main')).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1, name: game.heading })).toHaveCount(1);
      await expect(page.getByTestId('game-visible-instruction')).toHaveText(game.instruction);
      await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
      await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toHaveAttribute('aria-valuenow', '1');

      // Roving tabstop: every game's choice/tray region is the same shared AnswerGroup
      // instance, so ArrowRight must move focus within it identically for all four.
      const answers = page.locator('[data-testid="game-answer-region"] button');
      await answers.first().focus();
      await page.keyboard.press('ArrowRight');
      await expect(answers.nth(1)).toBeFocused();

      const wrongId = await game.answerWrong(page);
      const status = page.getByRole('status');
      await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
      await expect(status).toContainText('Skús ešte raz');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      await expect(actedControl(page, wrongId)).toContainText('Skús ešte raz');

      await waitForGamePhase(page, 'awaiting-answer');

      const correctId = await game.answerCorrect(page);
      await expect(page.getByRole('status')).toBeVisible();
      await expect(actedControl(page, correctId)).toHaveAttribute('data-piece-state', 'settled');
    });

    test(`${game.name}: reaching session completion moves focus to Play again`, async ({ page }) => {
      await game.enterPlay(page);
      await game.finishSessionCorrectly(page);

      await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeFocused();
      await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
    });
  }
});

test.describe('Task 7: Reduced motion', () => {
  for (const game of BESPOKE_GAMES) {
    test(`${game.name}: reduced motion keeps retry and correct feedback legible with no serious axe violations and no stale clones`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await game.enterPlay(page);

      const roundAxe = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
      expect(roundAxe.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);

      const wrongId = await game.answerWrong(page);
      await expect(page.getByRole('status')).toContainText('Skús ešte raz');
      await expect(actedControl(page, wrongId)).toContainText('Skús ešte raz');
      await waitForGamePhase(page, 'awaiting-answer');

      const correctId = await game.answerCorrect(page);
      await expect(page.getByRole('status')).toBeVisible();
      await expect(actedControl(page, correctId)).toHaveAttribute('data-piece-state', 'settled');

      // No translational tile flight and no leftover floating clone: every id in the live DOM
      // (mainly exercises Assembly's tile-flight path — the other three render no clones at all)
      // must still appear exactly once.
      const tileIds = await page.locator('[data-tile-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
      expect(new Set(tileIds).size).toBe(tileIds.length);

      await waitForOverlaySettled(page);
      const successAxe = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
      expect(successAxe.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);
    });

    test(`${game.name}: reduced motion still reaches a finite completion with no looping animation`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await game.enterPlay(page);
      await game.finishSessionCorrectly(page);

      await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
      await waitForOverlaySettled(page);
      const completionAxe = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
      expect(completionAxe.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);

      // Finite, not an infinite celebration loop — the same completion controls must still be
      // exactly there well past any short entrance transition.
      await page.waitForTimeout(1500);
      await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
    });
  }
});

// ============================================================================
// Final whole-phase review: same-tick double-tap re-entrancy.
//
// Every one of the three choice games picks this round's praise entry and commits it to local
// React state *before* awaiting resolveAnswer, so useGameSession's own synchronous guard (its
// `answeringRef`) is set too late to protect that local write: a second tap landing in the same
// task overwrites the shown praise while the first tap's verdict audio is already built from the
// entry it replaced. Phase 5 hit exactly this class of bug in FindItGame.tsx, and Task 4's fix
// round hit it again in CompleteLetterGame.tsx; this closes it for the remaining two and keeps a
// regression test on all three.
// ============================================================================

const DOUBLE_TAP_PRAISES = [
  { id: 'e2e-praise-alfa', text: 'Pochvala Alfa', emoji: '🅰️', audioKey: 'e2e-praise-alfa' },
  { id: 'e2e-praise-beta', text: 'Pochvala Beta', emoji: '🅱️', audioKey: 'e2e-praise-beta' },
] as const;

/**
 * Replaces the whole enabled praise pool with exactly two distinguishable entries. Seeding only
 * the praises (and deliberately *not* `hrave-ucenie-seeded-sk`) leaves the default word pool
 * untouched and enabled — LocalContentRepository.seed() still runs and re-adds every default
 * praise as `enabled: false`, so `praiseEntries` ends up as precisely these two.
 */
function seedTwoPraises(page: Page) {
  return seedLocalStorage(page, {
    'hrave-ucenie-user-praises-sk': {
      version: 2,
      items: DOUBLE_TAP_PRAISES.map((praise, order) => ({
        ...praise,
        status: 'ready',
        enabled: true,
        isDefault: false,
        locale: 'sk',
        order,
      })),
    },
  });
}

/**
 * Makes `pickPraise` alternate instead of being random: successive `Math.random()` readings map
 * to the first and last entry of any list in turn. Two picks with nothing in between therefore
 * *always* disagree, which is what turns "the shown praise drifted from the spoken one" from a
 * coin flip into a deterministic failure whenever the ref guard is missing.
 */
function stubAlternatingRandom(page: Page) {
  return page.addInitScript(() => {
    let reading = 0;
    Math.random = () => {
      reading += 1;
      return reading % 2 === 1 ? 0 : 0.999999;
    };
  });
}

const DOUBLE_TAP_GAMES: Array<{ name: string; path: string; seed?(page: Page): Promise<void> }> = [
  { name: 'first-letter', path: '/first-letter' },
  { name: 'complete-syllable', path: '/complete-syllable' },
  {
    name: 'complete-letter',
    path: '/complete-letter',
    // One blank, so the very first correct tap is the round-winning one that picks a praise.
    seed: (page) => seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: 1 } }),
  },
];

for (const game of DOUBLE_TAP_GAMES) {
  test(`${game.name}: a same-tick double tap on the correct answer cannot desync the shown praise from the spoken one`, async ({ page }) => {
    // The seeded praises have no recorded mp3, so their clips always reach the TTS fallback; this
    // test is about which praise was chosen, not about the synthesizer.
    await stubSpeechSynthesis(page);
    await stubAlternatingRandom(page);
    await seedTwoPraises(page);
    await game.seed?.(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForPlaySurfaceSettled(page);

    const state = await getE2EState<GenericChoiceState>(page);
    expect(state.correctItemId).not.toBeNull();
    await clearAudioEvents(page);

    // Both clicks are dispatched inside one task, so the second handler runs before the first has
    // resumed from its first await — the window a React-state-derived `canAnswer` cannot close
    // and only a synchronous ref guard can.
    await page
      .locator(`[data-answer-id=${JSON.stringify(state.correctItemId!)}]:visible`)
      .evaluate((el) => {
        (el as HTMLElement).click();
        (el as HTMLElement).click();
      });

    // The success overlay only mounts once the verdict (praise) audio has finished, so this also
    // guarantees the praise clip is already recorded by the time the events are read.
    await expect(page.getByRole('button', { name: 'Pokračovať' })).toBeVisible();

    const praiseClips = (await getAudioClipPaths(page)).filter((path) => path.startsWith('sk/praise/'));
    expect(praiseClips, `expected exactly one praise clip, got ${JSON.stringify(praiseClips)}`).toHaveLength(1);

    const spoken = DOUBLE_TAP_PRAISES.find((praise) => praiseClips[0] === `sk/praise/${praise.audioKey}`);
    expect(spoken, `unrecognised praise clip ${praiseClips[0]}`).toBeDefined();
    const other = DOUBLE_TAP_PRAISES.find((praise) => praise !== spoken)!;

    // The praise the child sees must be the praise the child heard.
    await expect(page.getByText(spoken!.text, { exact: true })).toBeVisible();
    await expect(page.getByText(other.text, { exact: true })).toHaveCount(0);

    const finalState = await getE2EState<GenericChoiceState>(page);
    expect(finalState.roundsPlayed, 'the doubled tap must still count as exactly one round').toBe(1);
  });
}
