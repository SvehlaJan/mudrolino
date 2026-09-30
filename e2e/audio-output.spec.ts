import { expect, test } from '@playwright/test';

test('test builds silence fallback speech while still completing the prompt', async ({ page }) => {
  await page.addInitScript(() => {
    const observed = { volumes: [] as number[], mediaMuted: [] as boolean[] };
    Object.assign(window, { __speechOutput: observed });
    // Force the real AudioManager fallback without sending sound to the host during the test.
    HTMLMediaElement.prototype.play = function play() {
      observed.mediaMuted.push(this.muted);
      return Promise.reject(new Error('exercise speech fallback'));
    };
    const prototype = Object.getPrototypeOf(window.speechSynthesis) as SpeechSynthesis;
    prototype.speak = function speak(utterance: SpeechSynthesisUtterance) {
      // The shell also sends an empty utterance to unlock speech after the first tap.
      if (utterance.text) observed.volumes.push(utterance.volume);
      setTimeout(() => utterance.onend?.(new Event('end') as SpeechSynthesisEvent), 0);
    };
  });

  await page.goto('/numbers');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect.poll(() => page.evaluate(() => {
    const state = (window as typeof window & { __speechOutput: { volumes: number[] } }).__speechOutput;
    return state.volumes.length > 0 && state.volumes.every(volume => volume === 0);
  })).toBe(true);
  await page.waitForFunction(() => window.__E2E__?.gamePhase === 'awaiting-answer');
  const mediaMuted = await page.evaluate(() => (
    window as typeof window & { __speechOutput: { mediaMuted: boolean[] } }
  ).__speechOutput.mediaMuted);
  expect(mediaMuted.length).toBeGreaterThan(0);
  expect(mediaMuted.every(Boolean)).toBe(true);
  await expect(page.getByTestId('game-answer-region').getByRole('button').first()).toBeEnabled();
});
