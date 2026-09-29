import { test, expect, type Page } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import { seedLocalStorage } from './support/persistenceFixtures';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { expectNoHorizontalOverflow, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import type { GamePhase } from '../src/shared/game/gameState';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
  waitForOverlay,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

interface AdditionE2EState extends E2EGlobalState {
  gameId: 'ADDITION';
  gamePhase: GamePhase;
  correctSum: number | null;
  optionValues: number[];
  roundsPlayed: number;
  totalTaps: number;
}

async function tapCorrectOption(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<AdditionE2EState>(page);
  expect(state.correctSum, 'expected an active round').not.toBeNull();
  await page.getByRole('button', { name: String(state.correctSum), exact: true }).click();
}

async function tapWrongOption(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<AdditionE2EState>(page);
  const wrongValue = state.optionValues.find((v) => v !== state.correctSum);
  expect(wrongValue, 'expected at least one distractor option').toBeDefined();
  await page.getByRole('button', { name: String(wrongValue), exact: true }).click();
}

async function startAddition(page: Page): Promise<void> {
  await page.goto('/addition');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByText('Koľko je spolu?')).toBeVisible();
}

test('addition: correct answer reaches the success overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await stubSpeechSynthesis(page);
  await startAddition(page);

  const { correctSum } = await getE2EState<AdditionE2EState>(page);
  await tapCorrectOption(page);
  await waitForOverlay(page, 'success');
  await expect(page.getByText(new RegExp(`je dokopy ${correctSum}`))).toBeVisible();

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('addition: three wrong answers reach the failure overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await stubSpeechSynthesis(page);
  await startAddition(page);

  await tapWrongOption(page);
  await tapWrongOption(page);
  await tapWrongOption(page);
  await waitForOverlay(page, 'failure');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('addition renders objects at ranges 5 and 10, and numerals at every supported range', async ({ page }) => {
  for (const settings of [
    { additionSumRange: 5, additionRepresentation: 'objects' },
    { additionSumRange: 10, additionRepresentation: 'objects' },
    { additionSumRange: 5, additionRepresentation: 'numerals' },
    { additionSumRange: 10, additionRepresentation: 'numerals' },
    { additionSumRange: 20, additionRepresentation: 'numerals' },
    { additionSumRange: 100, additionRepresentation: 'numerals' },
  ] as const) {
    await seedLocalStorage(page, { 'hrave-ucenie-settings': settings });
    await startAddition(page);
    await expect(page.locator(`[data-quantity-mode=${settings.additionRepresentation}]`)).toHaveCount(2);
  }
});

test('addition never renders object trays for a forced numeral range', async ({ page }) => {
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { additionSumRange: 20, additionRepresentation: 'objects' } });
  await startAddition(page);
  await expect(page.locator('[data-quantity-mode="objects"]')).toHaveCount(0);
  await expect(page.locator('[data-quantity-mode="numerals"]')).toHaveCount(2);
});

test('addition suppresses duplicate answer presses while the selection resolves', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startAddition(page);
  const state = await getE2EState<AdditionE2EState>(page);
  await page.locator(`[data-answer-id=${JSON.stringify(String(state.correctSum))}]`).dblclick();
  await waitForGamePhase(page, 'answered-correctly');
  const resolved = await getE2EState<AdditionE2EState>(page);
  expect(resolved.roundsPlayed).toBe(1);
  expect(resolved.totalTaps).toBe(1);
});

test('addition uses the shared prompt, shell controls, unique answers, keyboard, and completion', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startAddition(page);
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Späť' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Vyber súčet' })).toBeVisible();
  await page.getByRole('button', { name: 'Späť' }).click();
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  await startAddition(page);
  await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: 'Rodičovská prestávka' })).toHaveCount(0);
  const active = await getE2EState<AdditionE2EState>(page);
  await page.locator(`[data-answer-id=${JSON.stringify(String(active.correctSum))}]`).click();
  await waitForGamePhase(page, 'answered-correctly');

  // Start fresh after confirming the header stays focused on progress during play.
  await startAddition(page);
  let state = await getE2EState<AdditionE2EState>(page);
  expect(state.gameId).toBe('ADDITION');
  expect(new Set(state.optionValues).size).toBe(4);
  expect(state.optionValues.filter(value => value === state.correctSum)).toHaveLength(1);

  const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
  await replay.click();
  await replay.focus();
  await page.keyboard.press('Tab');
  const answers = page.getByRole('group', { name: 'Vyber súčet' }).getByRole('button');
  await expect(answers.first()).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await getE2EState<AdditionE2EState>(page)).gamePhase).not.toBe('awaiting-answer');

  // Start fresh so each successful answer advances the intended five-round session.
  await startAddition(page);
  for (let round = 0; round < 5; round += 1) {
    state = await getE2EState<AdditionE2EState>(page);
    await page.locator(`[data-answer-id=${JSON.stringify(String(state.correctSum))}]`).click();
    if (round < 4) {
      await waitForGamePhase(page, 'answered-correctly');
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'awaiting-answer');
    }
  }
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await page.getByRole('button', { name: 'Domov' }).click();
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
});

for (const [name, viewport] of Object.entries({
  narrowPhone: CANONICAL_VIEWPORTS.narrowPhone,
  shortLandscape: CANONICAL_VIEWPORTS.shortLandscape,
})) {
  test(`addition keeps both operands, prompt, replay, and answers visible at ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await startAddition(page);
    await expect(page.getByTestId('addition-equation')).toBeVisible();
    await expect(page.getByTestId('addition-plus')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
    const trays = page.locator('[data-quantity-mode]:visible');
    const answers = page.getByRole('group', { name: 'Vyber súčet' }).getByRole('button');
    await expect(trays).toHaveCount(2);
    await expect(answers).toHaveCount(4);
    await expectNoHorizontalOverflow(page);
    await expectNoPairwiseOverlap(trays);
    await expectNoPairwiseOverlap(answers);
    for (const control of [...await trays.all(), ...await answers.all()]) await expectWithinViewport(page, control);
  });
}
