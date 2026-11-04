import { test, expect, type Page } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { openGameFromHome } from './support/gameEntry';

/**
 * Browsers play no sound before a tap, so a Session may only start from a tap on a Home-screen
 * Game card. Every other way into a game route must land on the Home screen instead.
 */

const pathname = (page: Page) => new URL(page.url()).pathname;

async function expectHomeScreen(page: Page): Promise<void> {
  await expect.poll(() => pathname(page)).toBe('/');
  await expect(page.getByRole('heading', { name: 'Písmená a slová' })).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Hrať|Hrát)$/ })).toHaveCount(0);
}

test.describe('Sessions start only from a tap', () => {
  test('a game URL opened directly lands on the Home screen', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/alphabet');

    await expectHomeScreen(page);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('reloading a game sends the child home', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await openGameFromHome(page, '/alphabet');
    await page.reload();

    await expectHomeScreen(page);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('Forward into a left game redirects home', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await openGameFromHome(page, '/alphabet');
    await page.goBack();
    await expectHomeScreen(page);

    // Prove the Forward traversal really happened, so a redirect cannot be confused with "still home".
    await page.evaluate(() => {
      (window as unknown as { __popped?: boolean }).__popped = false;
      window.addEventListener('popstate', () => { (window as unknown as { __popped?: boolean }).__popped = true; });
    });
    await page.goForward();
    await page.waitForFunction(() => (window as unknown as { __popped?: boolean }).__popped === true);

    await expectHomeScreen(page);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('leaving a game does not leave it ahead of the Home screen', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await openGameFromHome(page, '/alphabet');
    await page.getByRole('button', { name: 'Späť' }).click();
    await expectHomeScreen(page);

    // The phone's back gesture on Home must leave the app, not re-enter the game just left.
    await page.goBack();
    await expect.poll(() => page.url()).toBe('about:blank');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a double tap on a card opens the game once', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');
    await page.locator('[data-testid="game-card"][href="/alphabet"]').dblclick();
    await page.waitForURL((url) => url.pathname === '/alphabet');
    await expect(page.getByRole('button', { name: /^(Hrať|Hrát)$/ })).toBeVisible();

    // A second history entry for the same game would make Späť land back in it.
    await page.getByRole('button', { name: 'Späť' }).click();
    await expectHomeScreen(page);
    await page.goBack();
    await expect.poll(() => page.url()).toBe('about:blank');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('two cards tapped in quick succession open only the first game', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');
    await expect(page.locator('[data-testid="game-card"][href="/syllables"]')).toBeVisible();
    // Both clicks land in one task, before the first game's lazy chunk can commit.
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-testid="game-card"][href="/alphabet"]')?.click();
      document.querySelector<HTMLElement>('[data-testid="game-card"][href="/syllables"]')?.click();
    });
    await page.waitForURL((url) => url.pathname === '/alphabet');
    await expect(page.getByRole('button', { name: /^(Hrať|Hrát)$/ })).toBeVisible();

    await page.getByRole('button', { name: 'Späť' }).click();
    await expectHomeScreen(page);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a card opened from the keyboard starts the game', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');
    await page.locator('[data-testid="game-card"][href="/alphabet"]').focus();
    await page.keyboard.press('Enter');

    await page.waitForURL((url) => url.pathname === '/alphabet');
    await expect(page.getByRole('button', { name: /^(Hrať|Hrát)$/ })).toBeVisible();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
