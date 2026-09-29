import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  clearAudioEvents,
  getAudioEvents,
  pressAnswerById,
  waitForGamePhase,
} from './support/gameHarness';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import { expectNoHorizontalOverflow, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import { PRAISE_ENTRIES } from '../src/shared/locales/sk';

/**
 * `@axe-core/playwright` declares its `page` param against a `Page` it imports straight from
 * `playwright-core`, while `@playwright/test`'s own `page` fixture resolves through a separately
 * nested `playwright-core`. Both are the same Playwright page at runtime; see
 * `e2e/accessibility-foundation.spec.ts` for the original note on this version-skew cast.
 */
function toAxeParams(page: import('@playwright/test').Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

function isSeriousAxeViolation(impact: string | null | undefined): boolean {
  return ['critical', 'serious'].includes(impact ?? '');
}

test.describe('shared shell and answer group contract', () => {
  test('shared shell exposes the complete round contract', async ({ page }) => {
    await page.goto('/ui-kit?example=game-shell');

    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1, name: 'Abeceda' })).toHaveCount(1);
    await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByTestId('game-visible-instruction')).toHaveText('Nájdi písmeno, ktoré počuješ.');
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Možnosti odpovede' })).toBeVisible();
  });

  test('answer group uses one tab stop and spatial arrows', async ({ page }) => {
    await page.goto('/ui-kit?example=game-shell');
    const a = page.getByRole('button', { name: 'Písmeno A' });
    await a.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Písmeno B' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('button', { name: 'Písmeno D' })).toBeFocused();
  });

  test('shared shell documents recoverable, paused, feedback, and completion states', async ({ page }) => {
    await page.goto('/ui-kit?example=game-shell&state=retry');
    await expect(page.getByRole('status')).toContainText('Skús ešte raz');

    await page.goto('/ui-kit?example=game-shell&state=success');
    await expect(page.getByRole('status')).toContainText('Výborne');
    await expect(page.getByRole('button', { name: 'Pokračovať' })).toBeVisible();

    await page.goto('/ui-kit?example=game-shell&state=failure');
    await expect(page.getByRole('status')).toContainText('Nevadí');

    await page.goto('/ui-kit?example=game-shell&state=paused');
    await expect(page.getByTestId('game-interactive-content')).toHaveAttribute('inert', '');

    await page.goto('/ui-kit?example=game-shell&state=error');
    await expect(page.getByRole('alert')).toContainText('Skúsiť znova');
    await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();

    await page.goto('/ui-kit?example=game-shell&state=completion');
    await expect(page.getByText('5 / 5', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  });

  test('repairs roving focus, skips disabled answers, and preserves native activation', async ({ page }) => {
    await page.goto('/ui-kit?example=game-shell&state=answer-controls');
    const a = page.getByRole('button', { name: 'Písmeno A' });
    const b = page.getByRole('button', { name: 'Písmeno B' });
    const d = page.getByRole('button', { name: 'Písmeno D' });

    await a.focus();
    await page.keyboard.press('Home');
    await expect(a).toBeFocused();
    await page.keyboard.press('End');
    await expect(d).toBeFocused();

    await a.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(page.getByTestId('game-answer-activations')).toHaveText('2');

    await a.focus();
    await page.getByTestId('game-disable-a').evaluate((button: HTMLButtonElement) => button.click());
    await expect(a).toBeDisabled();
    await expect(a).not.toBeFocused();
    await expect(b).toHaveAttribute('tabindex', '0');
    await expect(page.locator('[data-testid="game-answer-region"] button:not(:disabled)[tabindex="0"]')).toHaveCount(1);

    await page.getByTestId('game-disable-c').evaluate((button: HTMLButtonElement) => button.click());
    await b.focus();
    await page.keyboard.press('ArrowRight');
    await expect(d).toBeFocused();

    await d.focus();
    await page.getByTestId('game-remove-d').evaluate((button: HTMLButtonElement) => button.click());
    await expect(d).toHaveCount(0);
    await expect(b).toHaveAttribute('tabindex', '0');
    await expect(page.locator('[data-testid="game-answer-region"] button:not(:disabled)[tabindex="0"]')).toHaveCount(1);
  });

  test('keeps answer children and focus stable across a runtime resize', async ({ page }) => {
    await page.goto('/ui-kit?example=game-shell&state=answer-controls');
    const b = page.getByRole('button', { name: 'Písmeno B' });
    const child = await b.elementHandle();
    await b.focus();
    await page.setViewportSize(CANONICAL_VIEWPORTS.shortLandscape);
    await expect(b).toBeFocused();
    expect(await child?.evaluate((element) => element.isConnected)).toBe(true);
  });

  test('keeps game shell controls and answers usable at narrow and short viewports', async ({ page }) => {
    for (const viewport of [CANONICAL_VIEWPORTS.narrowPhone, CANONICAL_VIEWPORTS.shortLandscape]) {
      await page.setViewportSize(viewport);
      await page.goto('/ui-kit?example=game-shell');
      await expectNoHorizontalOverflow(page);
      await expectWithinViewport(page, page.getByRole('button', { name: 'Zopakovať zadanie' }));
      await expectWithinViewport(page, page.getByRole('group', { name: 'Možnosti odpovede' }));
      await page.getByRole('button', { name: 'Písmeno A' }).click();
      await expect(page.getByRole('button', { name: 'Písmeno A' })).toBeFocused();
    }
  });

  test('keeps a many-answer grid in bounds under narrow, short geometry', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 375 });
    await page.goto('/ui-kit?example=game-shell&state=geometry-stress');
    const group = page.getByRole('group', { name: 'Možnosti odpovede' });
    const answers = group.getByRole('button');

    await expect(answers).toHaveCount(10);
    await expectNoHorizontalOverflow(page);
    await expectNoPairwiseOverlap(await answers.all());

    const columns = await group.evaluate((element) => Number.parseInt(getComputedStyle(element).getPropertyValue('--grid-cols'), 10));
    expect(columns).toBeGreaterThanOrEqual(1);
    await answers.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(answers.nth(columns)).toBeFocused();
  });
});

test.describe('Living Toybox materials', () => {
  test('base materials expose meaning without color or motion', async ({ page }) => {
    await page.goto('/ui-kit?example=game-materials');
    const region = page.getByRole('region', { name: 'Materiály hier' });

    for (const material of ['wood', 'magnet', 'felt', 'picture', 'counter', 'paper']) {
      await expect(region.locator(`[data-material="${material}"]`).first()).toBeVisible();
    }
    await expect(region.getByRole('button', { name: 'Písmeno A' })).toHaveAttribute('data-piece-state', 'settled');
    await expect(region.getByRole('button', { name: 'Písmeno B' })).toContainText('Skús ešte raz');
    await expect(region.getByTestId('play-tray')).toBeVisible();
  });

  test('tactile pieces meet the minimum touch target and support focus/disabled semantics', async ({ page }) => {
    await page.goto('/ui-kit?example=game-materials');
    const region = page.getByRole('region', { name: 'Materiály hier' });

    const pieceA = region.getByRole('button', { name: 'Písmeno A' });
    const box = await pieceA.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(48);
    expect(box?.height).toBeGreaterThanOrEqual(48);

    await pieceA.focus();
    await expect(pieceA).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('ui-piece-press-count')).toHaveText('1');

    const pieceC = region.getByRole('button', { name: 'Písmeno C' });
    await expect(pieceC).toBeDisabled();
    await expect(pieceC).toHaveAttribute('data-piece-state', 'disabled');
  });

  test('the retry state stays legible as text under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/ui-kit?example=game-materials');
    const region = page.getByRole('region', { name: 'Materiály hier' });
    await expect(region.getByRole('button', { name: 'Písmeno B' })).toContainText('Skús ešte raz');
  });

  test('/ui-kit?example=game-materials has no critical or serious axe violations', async ({ page }) => {
    await page.goto('/ui-kit?example=game-materials');
    const results = await new AxeBuilder(toAxeParams(page))
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.filter((v) => isSeriousAxeViolation(v.impact))).toEqual([]);
  });
});

test.describe('FindIt empty-pool recovery', () => {
  test('an empty descriptor pool renders a recoverable error without crashing, and retry recovers once content exists', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/ui-kit?example=game-empty-pool');

    await expect(page.getByRole('alert')).toContainText('Žiadne položky na hranie.');
    await expect(page.getByRole('button', { name: 'Skúsiť znova' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();

    await page.getByTestId('empty-pool-fill').evaluate((button: HTMLButtonElement) => button.click());
    await page.getByRole('button', { name: 'Skúsiť znova' }).click();
    await expect(page.getByTestId('game-answer-region')).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('Home returns to the lobby from an empty-pool recoverable error', async ({ page }) => {
    await page.goto('/ui-kit?example=game-empty-pool');
    await expect(page.getByRole('alert')).toContainText('Žiadne položky na hranie.');
    await page.getByRole('button', { name: 'Domov' }).click();
    await expect(page.getByTestId('empty-pool-exit-count')).toHaveText('1');
  });
});

interface AlphabetState extends E2EGlobalState {
  correctItemId: string | null;
  gridItemIds: string[];
}

function expectEventsInOrder(events: string[], expected: Array<string | RegExp>): void {
  let after = -1;
  for (const event of expected) {
    const index = events.findIndex((actual, index) => index > after
      && (typeof event === 'string' ? actual === event : event.test(actual)));
    expect(index, `expected ${event} after event ${after}`).toBeGreaterThan(after);
    after = index;
  }
}

test('audio: records the alphabet prompt as logical clip events', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await expect.poll(() => getAudioEvents(page)).toContain('start:sk/phrases/najdi');
  await expect.poll(() => getAudioEvents(page)).toContain('finish:sk/phrases/najdi');
});

test('audio: visible and spoken praise correspond to the same entry on a correct answer', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AlphabetState>(page);
  await clearAudioEvents(page);
  await pressAnswerById(page, state.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');
  await expect.poll(async () => (await getAudioEvents(page)).some((event) => event.startsWith('start:sk/praise/'))).toBe(true);

  const events = await getAudioEvents(page);
  const praiseEvent = events.find((event) => event.startsWith('start:sk/praise/'))!;
  const audioKey = praiseEvent.replace('start:sk/praise/', '');
  const expectedPraise = PRAISE_ENTRIES.find((entry) => entry.audioKey === audioKey);
  expect(expectedPraise, `expected a known SK praise entry for audioKey "${audioKey}"`).toBeDefined();

  await expect(page.getByRole('status')).toContainText(expectedPraise!.text);
});

test('answer tiles expose live retry and settled states with matching text', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const initial = await getE2EState<AlphabetState>(page);
  const wrongId = initial.gridItemIds.find((id) => id !== initial.correctItemId)!;
  const wrongTile = page.locator(`[data-answer-id="${wrongId}"]`);

  await pressAnswerById(page, wrongId);
  // 'answered-incorrectly' (feedback: null) only lasts TIMING.FEEDBACK_RESET_MS (500ms);
  // Playwright's own attribute polling can start its next check after that window already
  // closed, so this confirms the phase first with a tight, fixed-interval waitForFunction.
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-incorrectly',
    undefined,
    { polling: 20 },
  );
  await expect(wrongTile).toHaveAttribute('data-piece-state', 'retry');
  await expect(wrongTile).toContainText('Skús ešte raz');
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(wrongTile).toHaveAttribute('data-piece-state', 'idle');

  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const success = await getE2EState<AlphabetState>(page);
  const correctTile = page.locator(`[data-answer-id="${success.correctItemId}"]`);

  await pressAnswerById(page, success.correctItemId!);
  await expect(correctTile).toHaveAttribute('data-piece-state', 'settled');
  await expect(correctTile).toContainText('Uložené');
});

test('audio: alphabet serializes wrong, correct, and terminal-failure answer clips', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const initial = await getE2EState<AlphabetState>(page);
  const wrongId = initial.gridItemIds.find((id) => id !== initial.correctItemId)!;
  await clearAudioEvents(page);
  await pressAnswerById(page, wrongId);
  // Non-exhausted 'answered-incorrectly' auto-clears to 'awaiting-answer' after
  // TIMING.FEEDBACK_RESET_MS — too transient to assert directly; audioEvents already
  // happened by then and persist regardless of which phase we wait for.
  await waitForGamePhase(page, 'awaiting-answer');
  // A letter's audioKey is a transliteration (e.g. "Á" → "a-acute"), not simply its
  // lowercased symbol, so these assertions match the clip category, not the exact key.
  expectEventsInOrder(await getAudioEvents(page), [
    /^start:sk\/letters\//,
    /^finish:sk\/letters\//,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
  ]);

  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const success = await getE2EState<AlphabetState>(page);
  await clearAudioEvents(page);
  await pressAnswerById(page, success.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');
  // Phase advances on ANSWER_CORRECT before the praise verdict audio is awaited — wait for
  // both the selection clip (2 events) and the praise clip (2 events) to actually land.
  await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(4);
  const successEvents = await getAudioEvents(page);
  expectEventsInOrder(successEvents, [
    /^start:sk\/letters\//,
    /^finish:sk\/letters\//,
    /^start:sk\/praise\//,
    /^finish:sk\/praise\//,
  ]);

  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const next = await getE2EState<AlphabetState>(page);
  const thirdWrong = next.gridItemIds.find((id) => id !== next.correctItemId)!;
  await clearAudioEvents(page);
  await pressAnswerById(page, thirdWrong);
  await waitForGamePhase(page, 'awaiting-answer');
  await pressAnswerById(page, thirdWrong);
  await waitForGamePhase(page, 'awaiting-answer');
  await pressAnswerById(page, thirdWrong);
  await waitForGamePhase(page, 'answered-incorrectly');
  // Phase advances on the exhausting ANSWER_WRONG before its explanation verdict audio is
  // awaited — wait for all 3 selection clips (2 events each) plus the 3-clip explanation
  // (neverMind + itIs + letter, 2 events each) to actually land.
  await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(18);
  expectEventsInOrder(await getAudioEvents(page), [
    /^start:sk\/letters\//,
    /^finish:sk\/letters\//,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
    'start:sk/phrases/nevadi',
    'finish:sk/phrases/nevadi',
    'start:sk/phrases/je-to',
    'finish:sk/phrases/je-to',
    /^start:sk\/letters\//,
    /^finish:sk\/letters\//,
  ]);
});
