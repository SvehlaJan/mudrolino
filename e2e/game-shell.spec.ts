import { expect, test } from '@playwright/test';
import {
  clearAudioEvents,
  getAudioEvents,
  pressAnswerById,
  waitForGamePhase,
} from './support/gameHarness';
import { getE2EState } from './support/e2eHook';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import { expectNoHorizontalOverflow, expectWithinViewport } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';

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

  test('shared shell restores answer focus when a paused shell resumes', async ({ page }) => {
    await page.goto('/ui-kit?example=game-shell&state=focus-restoration');
    const answer = page.getByRole('button', { name: 'Písmeno A' });
    await answer.focus();
    await page.getByTestId('game-pause-demo-toggle').evaluate((button: HTMLButtonElement) => button.click());
    await expect(page.getByTestId('game-interactive-content')).toHaveAttribute('inert', '');
    await page.getByTestId('game-pause-demo-toggle').evaluate((button: HTMLButtonElement) => button.click());
    await expect(answer).toBeFocused();
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

// TODO(Task 5): unskip when FindItGame consumes useGameSession and supplies data-answer-id and
// gamePhase E2E state. This is the non-negotiable audio-order contract for that migration.
test.skip('audio: alphabet serializes wrong, correct, and terminal-failure answer clips', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const initial = await getE2EState<AlphabetState>(page);
  const wrongId = initial.gridItemIds.find((id) => id !== initial.correctItemId)!;
  await clearAudioEvents(page);
  await pressAnswerById(page, wrongId);
  await waitForGamePhase(page, 'answered-incorrectly');
  expectEventsInOrder(await getAudioEvents(page), [
    `start:sk/letters/${wrongId.toLowerCase()}`,
    `finish:sk/letters/${wrongId.toLowerCase()}`,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
  ]);

  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const success = await getE2EState<AlphabetState>(page);
  await clearAudioEvents(page);
  await pressAnswerById(page, success.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');
  const successEvents = await getAudioEvents(page);
  expectEventsInOrder(successEvents, [
    `start:sk/letters/${success.correctItemId!.toLowerCase()}`,
    `finish:sk/letters/${success.correctItemId!.toLowerCase()}`,
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
  expectEventsInOrder(await getAudioEvents(page), [
    `start:sk/letters/${thirdWrong.toLowerCase()}`,
    `finish:sk/letters/${thirdWrong.toLowerCase()}`,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
    'start:sk/phrases/nevadi',
    'finish:sk/phrases/nevadi',
    'start:sk/phrases/je-to',
    'finish:sk/phrases/je-to',
    `start:sk/letters/${next.correctItemId!.toLowerCase()}`,
    `finish:sk/letters/${next.correctItemId!.toLowerCase()}`,
  ]);
});
