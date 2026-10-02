import { expect, test, type Locator, type Page } from './support/fixtures';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import {
  expectMinimumTarget,
  expectNoHorizontalOverflow,
  expectNoPairwiseOverlap,
  expectReachableOrVisible,
  expectWithinViewport,
} from './support/layoutAssertions';
import { RELEASE_GAME_CASES, type ReleaseGameCase } from './support/releaseMatrix';
import { unlockParentGate } from './support/parentGate';

const GAMES_WITH_SETTINGS = new Set([
  'ALPHABET', 'SYLLABLES', 'NUMBERS', 'FIRST_LETTER', 'COMPLETE_LETTER',
  'COUNTING_ITEMS', 'COMPARE_QUANTITIES', 'ADDITION',
]);

async function startRound(page: Page, game: ReleaseGameCase): Promise<void> {
  await stubSpeechSynthesis(page);
  await page.goto(game.path);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('heading', { level: 1, name: game.title })).toBeVisible();
  await waitForGamePhase(page, 'awaiting-answer');
}

async function expectDocumentFitsViewport(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(dimensions.scrollHeight, 'active child rounds should not require document scrolling')
    .toBeLessThanOrEqual(dimensions.clientHeight + 1);
}

async function expectControlsInViewport(page: Page, controls: Locator): Promise<void> {
  const allControls = await controls.all();
  expect(allControls, 'expected active answer controls').not.toHaveLength(0);
  for (const control of allControls) {
    await expectWithinViewport(page, control);
    await expectMinimumTarget(page, control, 48);
  }
}

test('home keeps both game groups and all release cards reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Hravé Učenie' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(2);
  await expect(page.locator('section[aria-labelledby^="category-heading-"]')).toHaveCount(2);
  await expectReachableOrVisible(page.getByTestId('game-card'));
  await expectNoHorizontalOverflow(page);
});

for (const game of RELEASE_GAME_CASES) {
  test(`${game.id} lobby keeps its child actions contained`, async ({ page }) => {
    await page.goto(game.path);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: game.title })).toBeVisible();
    await expect(page.getByTestId('lobby-instruction')).toBeVisible();
    await expect(page.getByTestId('lobby-tactile-preview')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Späť' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    const settings = page.getByRole('button', { name: 'Nastavenia' });
    await expect(settings).toHaveCount(GAMES_WITH_SETTINGS.has(game.id) ? 1 : 0);
    if (GAMES_WITH_SETTINGS.has(game.id)) await expect(settings).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}

for (const game of RELEASE_GAME_CASES) {
  test(`${game.id} active round keeps the prompt and answers contained`, async ({ page }) => {
    await startRound(page, game);
    const answers = page.getByTestId('game-answer-region').getByRole('button');
    const critical = page.getByTestId('game-critical-controls').getByRole('button');
    const back = page.getByRole('button', { name: 'Späť' });
    const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
    const progress = page.getByRole('progressbar', { name: 'Postup v hre' });

    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
    await expect(replay).toBeVisible();
    await expect(progress).toBeVisible();
    await expect(back).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectDocumentFitsViewport(page);
    await expectWithinViewport(page, page.getByTestId('game-visible-instruction'));
    await expectControlsInViewport(page, answers);
    await expectControlsInViewport(page, critical);
    await expectWithinViewport(page, back);
    await expectWithinViewport(page, replay);
    await expectWithinViewport(page, progress);
    await expectNoPairwiseOverlap(answers);
  });
}

test('parent dashboard and word editor remain reachable in their explicit scroll region', async ({ page }) => {
  await page.goto('/settings');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Rodičovská zóna' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectReachableOrVisible(page.getByRole('link', { name: /^Vlastný obsah/ }));
  await expectMinimumTarget(page, page.getByRole('button', { name: 'Späť' }), 44);

  await page.goto('/content');
  await unlockParentGate(page);
  await page.getByRole('tab', { name: 'Slová' }).click();
  const addWord = page.getByRole('button', { name: 'Pridať slovo', exact: true });
  await expectReachableOrVisible(addWord);
  await expectMinimumTarget(page, addWord, 44);
  await addWord.click();
  await expect(page.getByRole('heading', { name: 'Pridať slovo' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('ordinary home content avoids horizontal scroll at 200 percent CSS zoom', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  await expectNoHorizontalOverflow(page);
});
