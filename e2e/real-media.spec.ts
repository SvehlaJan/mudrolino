// Deliberately use native fixtures: the default fast fixture must never wrap this suite.
import { expect, test } from '@playwright/test';
import { getAudioEvents, waitForGamePhase } from './support/gameHarness';

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
  await page.goto('/numbers');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia.ends)).toBeGreaterThan(0);
  await expect.poll(async () => (await getAudioEvents(page)).some(event => event.startsWith('finish:sk/numbers/'))).toBe(true);
  await waitForGamePhase(page, 'awaiting-answer');
  const observation = await page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia);
  expect(observation.starts).toBeGreaterThan(0);
  expect(observation.muted.every(Boolean)).toBe(true);
});

test('leaving during native playback cancels media and a fresh game can complete its prompt', async ({ page }) => {
  await page.goto('/numbers');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia.starts)).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Späť', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __nativeMedia: NativeMediaObservation }
  ).__nativeMedia.cancellations)).toBeGreaterThan(0);
  await page.goto('/numbers');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect.poll(async () => (await getAudioEvents(page)).some(event => event.startsWith('finish:sk/numbers/'))).toBe(true);
  await waitForGamePhase(page, 'awaiting-answer');
});
