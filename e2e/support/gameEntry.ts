import { type Page } from '@playwright/test';

/** Opens '/' and taps the Game card whose href is `path`; resolves once the URL is `path`. */
export async function openGameFromHome(page: Page, path: string): Promise<void> {
  await page.goto('/');
  await page.locator(`[data-testid="game-card"][href="${path}"]`).click();
  await page.waitForURL((url) => url.pathname === path);
}

/** openGameFromHome, then taps the lobby's play button (/^(Hrať|Hrát)$/). Task 6 removes that tap. */
export async function startGame(page: Page, path: string): Promise<void> {
  await openGameFromHome(page, path);
  await page.getByRole('button', { name: /^(Hrať|Hrát)$/ }).click();
}
