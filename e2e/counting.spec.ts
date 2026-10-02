import { test, expect, type Page } from './support/fixtures';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import { getE2EState } from './support/e2eHook';
import { stubSpeechSynthesis } from './support/gameHarness';
import { expectMinimumTarget, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';

interface CountingE2EState extends E2EGlobalState {
  gameId: 'COUNTING_ITEMS';
  correctItemId: string | null;
  optionValues: number[];
  roundsPlayed: number;
  wrongAttempts: number;
}

async function startCounting(page: Page): Promise<void> {
  await page.goto('/counting');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByText('Spočítaj predmety.')).toBeVisible();
}

async function answer(page: Page, value: number): Promise<void> {
  await page.locator(`[data-answer-id=${JSON.stringify(String(value))}]`).click();
}

test('counting uses a bounded interactive quantity tray and reachable answers on short screens', async ({ page }) => {
  await page.setViewportSize({ width: 667, height: 375 });
  await startCounting(page);

  const state = await getE2EState<CountingE2EState>(page);
  const tokens = page.getByRole('button', { name: /^Predmet \d+ z \d+$/ });
  await expect(tokens).toHaveCount(state.correctItemId ? Number(state.correctItemId) : 0);
  await expect(page.getByRole('group', { name: 'Vyber počet' })).toBeVisible();
  await expectNoPairwiseOverlap(tokens);
  for (const token of await tokens.all()) {
    await expectWithinViewport(page, token);
    await expectMinimumTarget(page, token, 48);
  }
  for (const option of await page.getByRole('group', { name: 'Vyber počet' }).getByRole('button').all()) {
    await expectWithinViewport(page, option);
    await expectMinimumTarget(page, option, 48);
  }
});

test('counting keeps its generated counters visible at narrow phone size', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ countingRange: { start: 1, end: 10 } })));
  await startCounting(page);
  const state = await getE2EState<CountingE2EState>(page);
  const count = Number(state.correctItemId);
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(10);
  const tokens = page.getByRole('button', { name: new RegExp(`^Predmet \\d+ z ${count}$`) });
  await expect(tokens).toHaveCount(count);
  for (const token of await tokens.all()) await expectMinimumTarget(page, token, 48);
});

test('counting supports correct answer, retry, failure, five-round completion, replay, back, and keyboard activation', async ({ page }) => {
  test.setTimeout(45_000);
  await stubSpeechSynthesis(page);
  await startCounting(page);
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
  await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();

  let state = await getE2EState<CountingE2EState>(page);
  const wrong = state.optionValues.find(value => value !== Number(state.correctItemId));
  expect(wrong).toBeDefined();
  await answer(page, wrong!);
  await expect(page.getByRole('status')).toContainText('Skús ešte raz');
  await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).wrongAttempts).toBe(1);
  await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).gamePhase).toBe('awaiting-answer');

  state = await getE2EState<CountingE2EState>(page);
  await answer(page, Number(state.correctItemId));
  await expect(page.getByText(`Správne, je ich ${state.correctItemId} ⭐`, { exact: true })).toBeVisible();
  await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).roundsPlayed).toBe(1);

  for (let round = 1; round < 5; round += 1) {
    const continueButton = page.getByRole('button', { name: 'Pokračovať' });
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    state = await getE2EState<CountingE2EState>(page);
    await answer(page, Number(state.correctItemId));
  }
  await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).gamePhase).toBe('session-complete');
  await page.getByRole('button', { name: 'Hrať znova' }).click();
  await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).roundsPlayed).toBe(0);
  await page.getByRole('button', { name: 'Späť' }).click();
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  await startCounting(page);

  const counters = page.getByRole('button', { name: /^Predmet \d+ z \d+$/ });
  await counters.last().focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('group', { name: 'Vyber počet' }).locator('button[tabindex="0"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect.poll(async () => {
    const afterKeyboard = await getE2EState<CountingE2EState>(page);
    return afterKeyboard.roundsPlayed + afterKeyboard.wrongAttempts;
  }).toBeGreaterThan(0);

});

test('counting ends a round after three wrong answers', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startCounting(page);
  const initial = await getE2EState<CountingE2EState>(page);
  const wrong = initial.optionValues.find(value => value !== Number(initial.correctItemId));
  expect(wrong).toBeDefined();
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await answer(page, wrong!);
    await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).wrongAttempts).toBe(attempt);
    if (attempt < 3) await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).gamePhase).toBe('awaiting-answer');
  }
  await expect.poll(async () => (await getE2EState<CountingE2EState>(page)).roundsPlayed).toBe(1);
  await expect(page.getByText('Nevadí')).toBeVisible();
  await expect(page.getByText(`${initial.correctItemId} ⭐`, { exact: true })).toBeVisible();
});
