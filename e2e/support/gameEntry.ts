import { expect, test, type Page } from '@playwright/test';

/**
 * Opens '/' and taps the Game card whose href is `path`. A card tap starts the first Round, so
 * this resolves once the URL is `path` and the game screen has mounted. The game route is a lazy
 * chunk: the URL changes first, then the route shows a blank screen until the chunk arrives, so the
 * helper waits for both the URL and the screen. In a test build it also waits for the game to publish its `window.__E2E__` state, so
 * callers can read the oracle immediately; the production build has no oracle, which the project's
 * expected build mode tells apart. Finally it waits for the game's input shield to leave: for a
 * moment after a game opens, an invisible layer swallows taps (a double tap's second half), so a
 * caller's first tap would otherwise vanish into it.
 *
 * The first Round is generated as soon as the game mounts, so anything that must shape it (a
 * `Math.random` patch, an init script; see firstRoundRandom.ts) has to be installed before this call.
 */
export async function startGame(page: Page, path: string): Promise<void> {
  await page.goto('/');
  await page.locator(`[data-testid="game-card"][href="${path}"]`).click();
  await page.waitForURL((url) => url.pathname === path);
  await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
  if (test.info().config.metadata.expectedBuildMode === 'test') {
    await page.waitForFunction(() => Boolean((window as { __E2E__?: { gameId?: string } }).__E2E__?.gameId));
  }
  await expect(page.getByTestId('game-input-shield')).toHaveCount(0);
}

/** Asserts the Home screen is showing: the Game cards are back and the URL is '/'. */
export async function expectHomeScreen(page: Page): Promise<void> {
  await expect(page.getByTestId('game-card').first()).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/');
}
