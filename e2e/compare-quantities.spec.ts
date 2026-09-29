import { expect, test, type Page } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import { seedLocalStorage } from './support/persistenceFixtures';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { expectNoHorizontalOverflow, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import {
  expectNoConsoleErrors,
  expectNoFailedRequests,
  trackConsoleErrors,
  trackFailedRequests,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';

interface CompareE2EState extends E2EGlobalState {
  gameId: 'COMPARE_QUANTITIES';
  gamePhase: GamePhase;
  correctSide: 'left' | 'right' | null;
  wrongSide: 'left' | 'right' | null;
  roundsPlayed: number;
}

function otherSide(side: 'left' | 'right'): 'left' | 'right' {
  return side === 'left' ? 'right' : 'left';
}

function answer(page: Page, side: 'left' | 'right') {
  return page.locator(`[data-answer-side=${side}]:visible`);
}

async function startGame(page: Page) {
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('group', { name: 'Porovnanie množstiev' })).toBeVisible();
  await expect(answer(page, 'left')).toHaveAccessibleName(/Skupina so \d+ predmetmi/);
  await expect(answer(page, 'right')).toHaveAccessibleName(/Skupina so \d+ predmetmi/);
  await waitForGamePhase(page, 'awaiting-answer');
}

test('compare quantities: correct choice shows the localized relationship', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await stubSpeechSynthesis(page);
  await startGame(page);

  const state = await getE2EState<CompareE2EState>(page);
  expect(state.gameId).toBe('COMPARE_QUANTITIES');
  expect(state.correctSide, 'expected an active round').not.toBeNull();
  await answer(page, state.correctSide!).click();
  await waitForGamePhase(page, 'answered-correctly');
  await expect(page.getByText(/je viac ako/)).toBeVisible();

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('compare quantities: wrong choice remains available for unlimited self-correction', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await stubSpeechSynthesis(page);
  await startGame(page);

  const state = await getE2EState<CompareE2EState>(page);
  expect(state.correctSide, 'expected an active round').not.toBeNull();
  const wrongSide = otherSide(state.correctSide!);
  const wrongButton = answer(page, wrongSide);
  await wrongButton.click();
  await expect(page.getByText('Skús druhú skupinu.')).toBeVisible();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(wrongButton).toBeEnabled();
  await expect(answer(page, state.correctSide!)).toBeEnabled();

  await answer(page, state.correctSide!).click();
  await waitForGamePhase(page, 'answered-correctly');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('compare quantities: supports object and numeral modes across both configured ranges', async ({ page }) => {
  for (const settings of [
    { compareMode: 'objects', compareRange: { start: 1, end: 5 } },
    { compareMode: 'numerals', compareRange: { start: 1, end: 10 } },
  ] as const) {
    await seedLocalStorage(page, { 'hrave-ucenie-settings': settings });
    await startGame(page);
    await expect(page.locator(`[data-quantity-mode=${settings.compareMode}]`)).toHaveCount(2);
    const names = await Promise.all(['left', 'right'].map(side => answer(page, side as 'left' | 'right').getAttribute('aria-label')));
    expect(names.every(name => /^Skupina so (?:[1-9]|10) predmetmi$/.test(name ?? ''))).toBe(true);
  }
});

test('compare quantities: replay, roving keyboard controls, progress-only header, Back, and completion use the shared shell', async ({ page }) => {
  await stubSpeechSynthesis(page);
  await startGame(page);

  await answer(page, 'left').focus();
  await page.keyboard.press('ArrowRight');
  await expect(answer(page, 'right')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(answer(page, 'left')).toBeFocused();
  await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();
  await page.getByRole('button', { name: 'Späť' }).click();
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  await startGame(page);
  await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByRole('button', { name: 'Rodičovská prestávka' })).toHaveCount(0);
  const active = await getE2EState<CompareE2EState>(page);
  await answer(page, active.correctSide!).click();
  await waitForGamePhase(page, 'answered-correctly');

  // A fresh route gives the completion sequence a clean session.
  await startGame(page);
  for (let round = 0; round < 5; round += 1) {
    const state = await getE2EState<CompareE2EState>(page);
    expect(state.correctSide).not.toBeNull();
    await answer(page, state.correctSide!).click();
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
  test(`compare quantities: choices fit and do not overlap at ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await startGame(page);
    const choices = page.locator('[data-answer-side]:visible');
    await expect(choices).toHaveCount(2);
    await expectNoHorizontalOverflow(page);
    await expectNoPairwiseOverlap(choices);
    for (const choice of await choices.all()) await expectWithinViewport(page, choice);
  });
}
