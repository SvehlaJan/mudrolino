import { expect, test, type Locator, type Page } from '@playwright/test';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import {
  expectMinimumTarget,
  expectNoHorizontalOverflow,
  expectNoPairwiseOverlap,
  expectWithinViewport,
} from './support/layoutAssertions';

interface NumeracyRoute {
  path: string;
  heading: string;
  answerGroup: string;
  playfield: (page: Page) => Locator;
}

const NUMERACY_ROUTES: NumeracyRoute[] = [
  {
    path: '/counting',
    heading: 'Spočítaj',
    answerGroup: 'Vyber počet',
    playfield: page => page.getByRole('group', { name: 'Predmety na spočítanie' }),
  },
  {
    path: '/compare',
    heading: 'Viac alebo Menej',
    answerGroup: 'Porovnanie množstiev',
    playfield: page => page.getByRole('group', { name: 'Porovnanie množstiev' }),
  },
  {
    path: '/addition',
    heading: 'Sčítaj',
    answerGroup: 'Vyber súčet',
    playfield: page => page.getByTestId('addition-equation'),
  },
];

async function startRound(page: Page, route: NumeracyRoute): Promise<void> {
  await stubSpeechSynthesis(page);
  await page.goto(route.path);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('heading', { name: route.heading })).toBeVisible();
  await waitForGamePhase(page, 'awaiting-answer');
}

async function expectEachWithinViewport(page: Page, controls: Locator): Promise<void> {
  for (const control of await controls.all()) await expectWithinViewport(page, control);
}

async function expectEachMinimumTarget(page: Page, controls: Locator, size: number): Promise<void> {
  for (const control of await controls.all()) await expectMinimumTarget(page, control, size);
}

async function expectDocumentFitsViewport(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.clientHeight + 1);
}

for (const route of NUMERACY_ROUTES) {
  test(`${route.heading}: active rounds keep every critical control visible without scrolling`, async ({ page }) => {
    await startRound(page, route);

    const criticalControls = page.getByTestId('game-critical-controls').getByRole('button');
    const answers = page.getByRole('group', { name: route.answerGroup }).getByRole('button');
    const back = page.getByRole('button', { name: 'Späť' });
    const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
    const progress = page.getByRole('progressbar', { name: 'Postup v hre' });
    const instruction = page.getByTestId('game-visible-instruction');
    await expect(criticalControls).not.toHaveCount(0);
    await expect(answers).not.toHaveCount(0);
    await expect(route.playfield(page)).toBeVisible();
    await expect(back).toBeVisible();
    await expect(replay).toBeVisible();
    await expect(progress).toBeVisible();
    await expect(instruction).toBeVisible();

    await expectNoHorizontalOverflow(page);
    await expectDocumentFitsViewport(page);
    await expectEachWithinViewport(page, criticalControls);
    await expectEachWithinViewport(page, answers);
    await expectWithinViewport(page, back);
    await expectWithinViewport(page, replay);
    await expectWithinViewport(page, progress);
    await expectWithinViewport(page, instruction);
    await expectEachMinimumTarget(page, criticalControls, 48);
    await expectEachMinimumTarget(page, answers, 48);
    await expectMinimumTarget(page, back, 48);
    await expectMinimumTarget(page, replay, 48);
    await expectNoPairwiseOverlap(answers);

    // Counters are interactive in counting; their individual bounds are part of the child-round
    // contract too, rather than merely the enclosing tray's bounds.
    if (route.path === '/counting') {
      const counters = page.locator('[data-quantity-token]:visible');
      await expect(counters).not.toHaveCount(0);
      await expectEachWithinViewport(page, counters);
      await expectNoPairwiseOverlap(counters);
      await expectEachMinimumTarget(page, counters, 48);
    }
  });
}
