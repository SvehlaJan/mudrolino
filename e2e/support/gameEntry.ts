import { expect, type Page } from '@playwright/test';

/**
 * Opens '/' and taps the Game card whose href is `path`; resolves once the URL is `path` and no
 * Game card remains on the page. The game route is a lazy chunk, so the URL changes while the
 * Home screen is still rendered; callers must not query selectors Home shares with the game
 * screen (the main landmark, an h1, the settings button) until Home is gone.
 */
export async function openGameFromHome(page: Page, path: string): Promise<void> {
  await page.goto('/');
  await page.locator(`[data-testid="game-card"][href="${path}"]`).click();
  await page.waitForURL((url) => url.pathname === path);
  await expect(page.getByTestId('game-card')).toHaveCount(0);
}

/** openGameFromHome, then taps the lobby's play button (/^(Hrať|Hrát)$/). Task 6 removes that tap. */
export async function startGame(page: Page, path: string): Promise<void> {
  await openGameFromHome(page, path);
  await page.getByRole('button', { name: /^(Hrať|Hrát)$/ }).click();
}
