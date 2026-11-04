import type { Page } from '@playwright/test';

/**
 * Pins the first Round of the game at `path`. While the URL is `path`, `Math.random` returns the
 * given `readings` in order (the last one repeats); anywhere else it is the real generator, so the
 * Home screen cannot consume a reading meant for the Round. A card tap generates the first Round
 * as the game mounts, so install this before the tap (`startGame`): an init script survives the
 * navigation. Registered after another init script that seeds `Math.random`, it wins on the game
 * route and falls through to the seeded generator elsewhere.
 *
 * Kept free of runtime imports so tools/screenshots/capture.mjs can load it too.
 */
export async function pinFirstRoundRandom(page: Page, path: string, readings: number[]): Promise<void> {
  await page.addInitScript(({ routePath, values }) => {
    const underlying = Math.random;
    let taken = 0;
    Math.random = () => {
      if (window.location.pathname !== routePath) return underlying.call(Math);
      return values[Math.min(taken++, values.length - 1)];
    };
  }, { routePath: path, values: readings });
}
