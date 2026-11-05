// Deliberately use native fixtures: the default fast fixture must never wrap this suite.
import { expect, test, type Page } from '@playwright/test';
import { getAudioEvents, waitForGamePhase } from './support/gameHarness';
import { startGame } from './support/gameEntry';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';

/** Real clips play at their own length, and a loaded machine stretches that; a prompt can run past 10 s. */
const NATIVE_PLAYBACK_TIMEOUT_MS = 20_000;

// Each test waits on up to two whole prompts, so it needs more than the default 30 s.
test.describe.configure({ timeout: 60_000 });

async function hasAudioEvent(page: Page, matches: (event: string) => boolean): Promise<boolean> {
  return (await getAudioEvents(page)).some(matches);
}

interface NativeMediaObservation {
  starts: number;
  ends: number;
  cancellations: number;
  muted: boolean[];
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const observation: NativeMediaObservation = { starts: 0, ends: 0, cancellations: 0, muted: [] };
    Object.assign(window, { __nativeMedia: observation });
    const nativePlay = HTMLMediaElement.prototype.play;
    const nativePause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.play = function play() {
      observation.starts += 1;
      observation.muted.push(this.muted);
      this.addEventListener('ended', () => { observation.ends += 1; }, { once: true });
      return nativePlay.call(this);
    };
    HTMLMediaElement.prototype.pause = function pause() {
      if (!this.ended && !this.paused) observation.cancellations += 1;
      return nativePause.call(this);
    };
  });
});

test('bundled media delivers a native ended event and completes a silent game prompt', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await startGame(page, '/numbers');
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia.ends)).toBeGreaterThan(0);
  await expect.poll(() => hasAudioEvent(page, event => event.startsWith('finish:sk/numbers/')), { timeout: NATIVE_PLAYBACK_TIMEOUT_MS }).toBe(true);
  await waitForGamePhase(page, 'awaiting-answer');
  const observation = await page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia);
  expect(observation.starts).toBeGreaterThan(0);
  expect(observation.muted.every(Boolean)).toBe(true);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('leaving during native playback cancels media and a fresh game can complete its prompt', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await startGame(page, '/numbers');
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia.starts)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Späť', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia.cancellations)).toBeGreaterThan(0);
  await startGame(page, '/numbers');
  await expect.poll(() => hasAudioEvent(page, event => event.startsWith('finish:sk/numbers/')), { timeout: NATIVE_PLAYBACK_TIMEOUT_MS }).toBe(true);
  await waitForGamePhase(page, 'awaiting-answer');
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('a card tap plays the first prompt from its recording', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  const messages: string[] = [];
  page.on('console', (message) => messages.push(message.text()));

  await startGame(page, '/numbers');

  await expect.poll(() => hasAudioEvent(page, event => event === 'finish:sk/phrases/najdi'), { timeout: NATIVE_PLAYBACK_TIMEOUT_MS }).toBe(true);
  await expect.poll(() => hasAudioEvent(page, event => event.startsWith('finish:sk/numbers/')), { timeout: NATIVE_PLAYBACK_TIMEOUT_MS }).toBe(true);
  expect(messages.filter(message => message.includes('falling back to TTS'))).toEqual([]);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
