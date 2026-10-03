import { expect, test } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { pressAnswerById, waitForGamePhase } from './support/gameHarness';
import { seedLocalStorage } from './support/persistenceFixtures';
import { CompleteLetterE2EState } from './support/literacyHarness';

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

  const rail = page.getByTestId('word-rail');
  const firstIndex = await rail.locator('[data-slot-state]').evaluateAll(nodes=>nodes.findIndex(node=>node.getAttribute('data-slot-state')==='active'));
  const firstSlot = rail.locator('[data-slot-state]').nth(firstIndex);
  const initialSlot = (await firstSlot.boundingBox())!;
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
  const filledSlot = (await firstSlot.boundingBox())!;
  expect(Math.abs(filledSlot.width-initialSlot.width)).toBeLessThan(1);
  expect(Math.abs(filledSlot.height-initialSlot.height)).toBeLessThan(1);

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
