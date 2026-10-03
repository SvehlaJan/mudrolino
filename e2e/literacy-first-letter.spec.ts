import { expect, test } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { pressAnswerById, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { FirstLetterE2EState } from './support/literacyHarness';

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
  await expect(page.locator(`[data-answer-id="${wrongId}"]`)).not.toContainText('Skús ešte raz');
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
