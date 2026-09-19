import { expect, test } from '@playwright/test';
import { expectMinimumTarget, expectNoHorizontalOverflow } from './support/layoutAssertions';
import { getE2EState } from './support/e2eHook';
import { pressAnswerById, waitForGamePhase } from './support/gameHarness';
import { seedLocalStorage } from './support/persistenceFixtures';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';

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

test('Prvé písmenko shows a polite retry status on a wrong tap', async ({ page }) => {
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
  await expect(status).toBeVisible();
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

test('Doplň slabiku shows a polite retry status on a wrong tap and leaves the inset unrevealed', async ({ page }) => {
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
  await expect(status).toBeVisible();
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
