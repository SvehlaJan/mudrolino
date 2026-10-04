import { expect, test } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { pressAnswerById, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { CompleteSyllableE2EState } from './support/literacyHarness';

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
  // Audio and return movement can consume the cooldown, so retry may already be ready.
  await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 1, undefined, { polling: 20 });

  const status = page.getByRole('status');
  await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
  await expect(status).toContainText('Skús ešte raz');
  await expect(page.locator(`[data-answer-id="${wrongId}"]`)).not.toContainText('Skús ešte raz');

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

for (const dismissal of ['backdrop', 'automatic'] as const) {
  test(`Doplň slabiku dismisses exhausted feedback by ${dismissal} like success`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/complete-syllable');
    await page.getByRole('button', { name: 'Hrať' }).click();
    const initial = await getE2EState<CompleteSyllableE2EState>(page);
    const wrongId = initial.answerItemIds.find(id => id !== initial.correctItemId)!;
    for (let attempt = 1; attempt <= 3; attempt++) {
      await pressAnswerById(page, wrongId);
      await page.waitForFunction(count => window.__E2E__?.wrongAttempts === count, attempt);
      if (attempt < 3) await waitForGamePhase(page, 'awaiting-answer');
    }
    const feedback = page.getByRole('status').filter({ hasText: 'Nevadí' });
    await expect(feedback).toBeVisible();
    if (dismissal === 'backdrop') {
      await feedback.getByText('Nevadí, poďme ďalej', { exact: true }).click();
      await expect(feedback).toBeVisible();
      await page.mouse.click(8, 150);
      await expect(feedback).toHaveCount(0, { timeout: 500 });
    } else {
      await expect(feedback).toHaveCount(0, { timeout: 2500 });
    }
    await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 0 && window.__E2E__?.roundsPlayed === 1);
    await expect(page.locator('[data-answer-id]').first()).toBeEnabled();
  });
}
