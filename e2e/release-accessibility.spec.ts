import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import { getE2EState } from './support/e2eHook';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { expectMinimumTarget } from './support/layoutAssertions';
import { unlockParentGate } from './support/parentGate';
import { RELEASE_GAME_CASES, type ReleaseGameCase } from './support/releaseMatrix';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const INTERACTION_FAMILIES = ['ALPHABET', 'ASSEMBLY', 'COUNTING_ITEMS', 'COMPARE_QUANTITIES', 'ADDITION'] as const;

function toAxeParams(page: Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

async function expectNoSeriousAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder(toAxeParams(page)).withTags(AXE_TAGS).analyze();
  const serious = results.violations
    .filter(violation => ['critical', 'serious'].includes(violation.impact ?? ''))
    .map(violation => ({
      id: violation.id,
      count: violation.nodes.length,
      examples: violation.nodes.slice(0, 8).map(node => ({
        target: node.target,
        data: node.any.map(check => check.data),
      })),
    }));
  expect(serious).toEqual([]);
}

async function startRound(page: Page, game: ReleaseGameCase): Promise<void> {
  await stubSpeechSynthesis(page);
  await page.goto(game.path);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('heading', { level: 1, name: game.title })).toBeVisible();
  await waitForGamePhase(page, 'awaiting-answer');
}

async function expectChildTargets(page: Page, controls: Locator): Promise<void> {
  const allControls = await controls.all();
  expect(allControls, 'expected child controls').not.toHaveLength(0);
  for (const control of allControls) await expectMinimumTarget(page, control, 48);
}

test('home has one main landmark and no serious accessibility violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expectNoSeriousAxeViolations(page);
});

test('a game lobby exposes its primary action without serious accessibility violations', async ({ page }) => {
  const game = RELEASE_GAME_CASES[0];
  await page.goto(game.path);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: game.title })).toHaveCount(1);
  await expectMinimumTarget(page, page.getByRole('button', { name: 'Hrať' }), 48);
  await expectMinimumTarget(page, page.getByRole('button', { name: 'Späť' }), 48);
  await expectNoSeriousAxeViolations(page);
});

for (const id of INTERACTION_FAMILIES) {
  const game = RELEASE_GAME_CASES.find(candidate => candidate.id === id)!;
  test(`${game.title} active interaction family has one semantic game shell`, async ({ page }) => {
    await startRound(page, game);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: game.title })).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Zadanie' })).toBeVisible();
    await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toBeVisible();
    await expectChildTargets(page, page.getByTestId('game-answer-region').getByRole('button'));
    await expectNoSeriousAxeViolations(page);
  });
}

test('the real parent gate contains keyboard focus and parent controls meet their target size', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('button', { name: 'Nastavenia' });
  await opener.click();
  const gate = page.getByRole('dialog', { name: 'Pre rodičov' });
  await expect(gate).toBeVisible();
  await expect(gate.getByRole('button', { name: '1', exact: true })).toBeFocused();
  for (let press = 0; press < 16; press += 1) {
    await page.keyboard.press('Tab');
    await expect(gate.locator(':focus')).toHaveCount(1);
  }
  for (const control of await gate.getByRole('button').all()) await expectMinimumTarget(page, control, 44);
  await expectNoSeriousAxeViolations(page);
  await page.keyboard.press('Escape');
  await expect(opener).toBeVisible();
});

test('dashboard, content editor, and feedback form have no serious accessibility violations', async ({ page }) => {
  await page.goto('/settings');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Rodičovská zóna' })).toHaveCount(1);
  await expectNoSeriousAxeViolations(page);

  await page.goto('/content');
  await unlockParentGate(page);
  const wordsTab = page.getByRole('tab', { name: /Slová/ });
  await wordsTab.click();
  await expect(wordsTab).toHaveAttribute('data-state', 'active');
  await Promise.all([
    wordsTab.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished))),
    page.getByRole('tab', { name: /Písmená/ }).evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished))),
  ]);
  await page.getByRole('button', { name: 'Pridať slovo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Pridať slovo' })).toBeVisible();
  await expectNoSeriousAxeViolations(page);

  await page.goto('/settings/help');
  await unlockParentGate(page);
  const feedbackOpener = page.getByRole('button', { name: 'Odoslať spätnú väzbu' });
  await feedbackOpener.click();
  const dialog = page.getByRole('dialog', { name: 'Spätná väzba' });
  await expect(dialog).toBeVisible();
  await expectNoSeriousAxeViolations(page);
  const group = dialog.getByRole('radiogroup', { name: 'Typ správy' });
  const firstCategory = group.getByRole('radio').first();
  await firstCategory.click();
  await firstCategory.focus();
  await expect(firstCategory).toBeFocused();
  const nextCategory = group.getByRole('radio').nth(1);
  // Keep the key down until Radix moves focus; its radio item selects on the
  // focus event while the arrow key is held, matching a real key press.
  await page.keyboard.down('ArrowRight');
  await expect(nextCategory).toBeFocused();
  await page.keyboard.up('ArrowRight');
  await expect(nextCategory).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(feedbackOpener).toBeFocused();
});

test('reduced motion keeps a wrong round outcome visible and disables infinite animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const game = RELEASE_GAME_CASES.find(candidate => candidate.id === 'COUNTING_ITEMS')!;
  await startRound(page, game);
  const state = await getE2EState<E2EGlobalState & { correctItemId?: string | null }>(page);
  const wrongId = await page.locator('[data-answer-id]:visible').evaluateAll((answers, correctId) =>
    answers.map(answer => answer.getAttribute('data-answer-id')).find(id => id !== correctId),
  state.correctItemId);
  expect(wrongId, 'expected a visible wrong answer').toBeTruthy();
  await page.locator(`[data-answer-id=${JSON.stringify(wrongId)}]:visible`).click();
  await expect(page.getByRole('status')).toBeVisible();
  const infiniteAnimations = await page.evaluate(() => Array.from(document.querySelectorAll('*')).filter(element =>
    getComputedStyle(element).animationIterationCount === 'infinite',
  ).length);
  expect(infiniteAnimations).toBe(0);
});
