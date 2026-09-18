import { expect, test } from '@playwright/test';
import {
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

function expectEventsInOrder(events: string[], expected: string[]): void {
  let after = -1;
  for (const event of expected) {
    const index = events.indexOf(event, after + 1);
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

// Task 5 migrates FindItGame to useGameSession and gives every answer its data-answer-id.
// Keep this contract ready now: it must be enabled together with that migration, rather than
// pretending the legacy component already supplies the hook's state and control surface.
test.skip('audio: alphabet serializes wrong, correct, and terminal-failure answer clips', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const initial = await getE2EState<AlphabetState>(page);
  const wrongId = initial.gridItemIds.find((id) => id !== initial.correctItemId)!;
  await pressAnswerById(page, wrongId);
  await waitForGamePhase(page, 'answered-incorrectly');
  expectEventsInOrder(await getAudioEvents(page), [
    `start:sk/letters/${wrongId.toLowerCase()}`,
    `finish:sk/letters/${wrongId.toLowerCase()}`,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
  ]);

  await waitForGamePhase(page, 'awaiting-answer');
  await pressAnswerById(page, initial.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');
  const successEvents = await getAudioEvents(page);
  const correctStart = `start:sk/letters/${initial.correctItemId!.toLowerCase()}`;
  expect(successEvents).toContain(correctStart);
  expect(successEvents.find((event) => /^start:sk\/praise\//.test(event))).toBeDefined();

  // A fresh round, three wrong answers: the final answer keeps the same selected-item →
  // retry ordering before the correct-answer explanation begins.
  const next = await getE2EState<AlphabetState>(page);
  const thirdWrong = next.gridItemIds.find((id) => id !== next.correctItemId)!;
  await pressAnswerById(page, thirdWrong);
  await waitForGamePhase(page, 'awaiting-answer');
  await pressAnswerById(page, thirdWrong);
  await waitForGamePhase(page, 'awaiting-answer');
  await pressAnswerById(page, thirdWrong);
  await waitForGamePhase(page, 'answered-incorrectly');
  expectEventsInOrder(await getAudioEvents(page), [
    `start:sk/letters/${thirdWrong.toLowerCase()}`,
    'start:sk/phrases/skus-to-znova',
    'start:sk/phrases/nevadi',
    'start:sk/phrases/je-to',
    `start:sk/letters/${next.correctItemId!.toLowerCase()}`,
  ]);
});
