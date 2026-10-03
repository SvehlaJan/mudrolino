import { expect, test, type Locator, type Page } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
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

async function choiceBounds(page: Page, group: Locator) {
  return group.evaluate(element => {
    const buttons = [...element.querySelectorAll<HTMLElement>(':scope > button')];
    const rects = buttons.map(button => button.getBoundingClientRect());
    if (!rects.length) return null;
    const left = Math.min(...rects.map(rect => rect.left));
    const right = Math.max(...rects.map(rect => rect.right));
    const top = Math.min(...rects.map(rect => rect.top));
    const bottom = Math.max(...rects.map(rect => rect.bottom));
    return { left, right, top, bottom, width: right - left, height: bottom - top };
  });
}

async function locatorBounds(locator: Locator) {
  return locator.boundingBox();
}

async function expectChoicesCenteredInTray(page: Page, answerGroup: Locator): Promise<void> {
  const tray = page.getByTestId('play-tray');
  const [trayBox, choices] = await Promise.all([tray.boundingBox(), choiceBounds(page, answerGroup)]);
  expect(trayBox, 'expected a measurable answer tray').not.toBeNull();
  expect(choices, 'expected measurable answer choices').not.toBeNull();
  expect(Math.abs((choices!.left + choices!.right) / 2 - (trayBox!.x + trayBox!.width / 2))).toBeLessThanOrEqual(12);
}

async function expectBoundedAnswerSurface(page: Page): Promise<void> {
  const [surface, content] = await Promise.all([
    page.getByTestId('play-tray').boundingBox(),
    page.getByTestId('game-interactive-content').boundingBox(),
  ]);
  expect(surface).not.toBeNull();
  expect(content).not.toBeNull();
  expect(surface!.height).toBeLessThan(content!.height * 0.8);
}

async function expectStableAnswersOnRetry(page: Page, route: NumeracyRoute): Promise<void> {
  const answerGroup = page.getByRole('group', { name: route.answerGroup });
  const before = await choiceBounds(page, answerGroup);
  expect(before).not.toBeNull();
  const state = await getE2EState<{ correctItemId?: string | null; correctSum?: number | null; optionValues?: number[] }>(page);
  const correct = Number(state.correctItemId ?? state.correctSum);
  const wrong = state.optionValues?.find(value => value !== correct);
  expect(wrong).toBeDefined();
  await answerGroup.getByRole('button', { name: String(wrong), exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Skús ešte raz');
  await waitForGamePhase(page, 'awaiting-answer');
  const after = await choiceBounds(page, answerGroup);
  expect(after).not.toBeNull();
  expect(Math.abs(after!.left - before!.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.top - before!.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
}

test('@geometry counting and addition center bounded answer choices at supported sizes and keep them still on retry', async ({ page }) => {
  expect(page.viewportSize()).not.toBeNull();
  for (const route of NUMERACY_ROUTES.filter(item => item.path !== '/compare')) {
    await startRound(page, route);
    const group = page.getByRole('group', { name: route.answerGroup });
    await expect(group.getByRole('button')).toHaveCount(4);
    await expectChoicesCenteredInTray(page, group);
    await expectBoundedAnswerSurface(page);
    for (const option of await group.getByRole('button').all()) {
      await expectMinimumTarget(page, option, 48);
      await expectWithinViewport(page, option);
    }
    await expectStableAnswersOnRetry(page, route);
    await page.goto('/');
  }
});

test('@geometry compare quantity cards have equal bounded heights and contained scattered object groups at supported sizes', async ({ page }) => {
  expect(page.viewportSize()).not.toBeNull();
  await page.addInitScript(() => localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ compareMode: 'objects', compareRange: { start: 1, end: 10 } })));
  await stubSpeechSynthesis(page);
  await page.goto('/compare');
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  await page.evaluate(() => {
    let calls = 0;
    Math.random = () => calls++ === 0 ? 0 : 0.999999;
  });
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('group', { name: 'Porovnanie množstiev' })).toBeVisible();
  await waitForGamePhase(page, 'awaiting-answer');
  const choices = page.locator('[data-answer-side]:visible');
  const answerGroup = page.getByRole('group', { name: 'Porovnanie množstiev' });
  const availableArea = await answerGroup.evaluate(element => {
    // AnswerGroup sits inside GameShell's second interactive-content child, which excludes the prompt.
    const area = element.parentElement?.parentElement;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  });
  expect(availableArea).not.toBeNull();
  const beforeRetry = await Promise.all(['left', 'right'].map(side => locatorBounds(page.locator(`[data-answer-side=${side}]:visible`))));
  const cards = await choices.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    const contents = element.querySelector<HTMLElement>('[data-quantity-mode="objects"]');
    const inner = contents?.getBoundingClientRect();
    const tokens = [...element.querySelectorAll<HTMLElement>('[data-quantity-token]')].map(token => token.getBoundingClientRect());
    const tokenLeft = Math.min(...tokens.map(rect => rect.left));
    const tokenRight = Math.max(...tokens.map(rect => rect.right));
    const tokenTop = Math.min(...tokens.map(rect => rect.top));
    const tokenBottom = Math.max(...tokens.map(rect => rect.bottom));
    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
      innerCenterX: inner ? inner.left + inner.width / 2 : null,
      innerCenterY: inner ? inner.top + inner.height / 2 : null,
      innerWidth: inner?.width ?? 0,
      innerHeight: inner?.height ?? 0,
      tokenCount: tokens.length,
      tokenLeft,
      tokenRight,
      tokenTop,
      tokenBottom,
      tokenSizes: tokens.map(rect => ({ width: rect.width, height: rect.height })),
      tokenBoxes: tokens.map(rect => ({ left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom })),
      tokenOverflow: tokens.some(rect => !inner || rect.left < inner.left || rect.right > inner.right || rect.top < inner.top || rect.bottom > inner.bottom),
      overflowX: element.scrollWidth > element.clientWidth,
      overflowY: element.scrollHeight > element.clientHeight,
    };
  }));
  expect(cards).toHaveLength(2);
  expect(Math.max(cards[0].tokenCount, cards[1].tokenCount)).toBe(10);
  expect(Math.abs(cards[0].height - cards[1].height)).toBeLessThanOrEqual(1);
  expect(Math.abs(cards[0].top - cards[1].top)).toBeLessThanOrEqual(1);
  expect(cards[0].height).toBeLessThanOrEqual(Math.min((page.viewportSize()!.height * 0.36), 320) + 1);
  const beforePair = {
    left: Math.min(cards[0].left, cards[1].left),
    right: Math.max(cards[0].right, cards[1].right),
    top: Math.min(cards[0].top, cards[1].top),
    bottom: Math.max(cards[0].bottom, cards[1].bottom),
  };
  expect(Math.abs((beforePair.left + beforePair.right) / 2 - (availableArea!.left + availableArea!.right) / 2)).toBeLessThanOrEqual(12);
  expect(Math.abs((beforePair.top + beforePair.bottom) / 2 - (availableArea!.top + availableArea!.bottom) / 2)).toBeLessThanOrEqual(12);
  for (const card of cards) {
    expect(card.height).toBeGreaterThanOrEqual(48);
    expect(card.overflowX || card.overflowY).toBe(false);
    expect(card.innerCenterX).not.toBeNull();
    expect(Math.abs((card.left + card.right) / 2 - card.innerCenterX!)).toBeLessThanOrEqual(12);
    expect(Math.abs((card.top + card.bottom) / 2 - card.innerCenterY!)).toBeLessThanOrEqual(12);
    expect(card.tokenCount).toBeGreaterThan(0);
    expect(card.tokenOverflow).toBe(false);
    for (const token of card.tokenSizes) {
      expect(token.width, JSON.stringify(card)).toBeGreaterThanOrEqual(24);
      expect(token.height, JSON.stringify(card)).toBeGreaterThanOrEqual(24);
    }
    for (let index = 0; index < card.tokenBoxes.length; index += 1) {
      for (let other = index + 1; other < card.tokenBoxes.length; other += 1) {
        const token = card.tokenBoxes[index];
        const next = card.tokenBoxes[other];
        expect(token.right <= next.left || next.right <= token.left || token.bottom <= next.top || next.bottom <= token.top).toBe(true);
      }
    }
  }
  const state = await getE2EState<E2EGlobalState & { correctSide: 'left' | 'right' | null }>(page);
  expect(state.correctSide).not.toBeNull();
  await page.locator(`[data-answer-side=${state.correctSide === 'left' ? 'right' : 'left'}]:visible`).click();
  await expect(page.getByRole('status')).toContainText('Skús druhú skupinu.');
  await waitForGamePhase(page, 'awaiting-answer');
  const afterRetry = await Promise.all(['left', 'right'].map(side => locatorBounds(page.locator(`[data-answer-side=${side}]:visible`))));
  const availableAreaAfterRetry = await answerGroup.evaluate(element => {
    const area = element.parentElement?.parentElement;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
  });
  expect(availableAreaAfterRetry).not.toBeNull();
  const afterPair = {
    left: Math.min(afterRetry[0]!.x, afterRetry[1]!.x),
    right: Math.max(afterRetry[0]!.x + afterRetry[0]!.width, afterRetry[1]!.x + afterRetry[1]!.width),
    top: Math.min(afterRetry[0]!.y, afterRetry[1]!.y),
    bottom: Math.max(afterRetry[0]!.y + afterRetry[0]!.height, afterRetry[1]!.y + afterRetry[1]!.height),
  };
  expect(Math.abs((afterPair.left + afterPair.right) / 2 - (availableAreaAfterRetry!.left + availableAreaAfterRetry!.right) / 2)).toBeLessThanOrEqual(12);
  expect(Math.abs((afterPair.top + afterPair.bottom) / 2 - (availableAreaAfterRetry!.top + availableAreaAfterRetry!.bottom) / 2)).toBeLessThanOrEqual(12);
  for (let index = 0; index < beforeRetry.length; index += 1) {
    expect(beforeRetry[index]).not.toBeNull();
    expect(afterRetry[index]).not.toBeNull();
    expect(Math.abs(afterRetry[index]!.y - beforeRetry[index]!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterRetry[index]!.x - beforeRetry[index]!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterRetry[index]!.height - beforeRetry[index]!.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(afterRetry[index]!.width - beforeRetry[index]!.width)).toBeLessThanOrEqual(1);
  }
  await page.goto('/');
});

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
