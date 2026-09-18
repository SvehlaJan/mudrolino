import { expect, test } from '@playwright/test';
import {
  clearAudioEvents,
  getAudioEvents,
  pressAnswerById,
  waitForGamePhase,
} from './support/gameHarness';
import { getE2EState } from './support/e2eHook';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

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
