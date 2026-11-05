import { test, expect, type Page } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { startGame } from './support/gameEntry';
import { getE2EState } from './support/e2eHook';
import { pressAnswerById, waitForGamePhase } from './support/gameHarness';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';

/**
 * Browsers play no sound before a tap, so a Session may only start from a tap on a Home-screen
 * Game card. Every other way into a game route must land on the Home screen instead.
 */

interface FindItState extends E2EGlobalState {
  gameId: string;
  gamePhase: GamePhase;
  correctItemId: string | null;
  wrongAttempts: number;
  roundsPlayed: number;
}

const pathname = (page: Page) => new URL(page.url()).pathname;

async function expectHomeScreen(page: Page): Promise<void> {
  await expect.poll(() => pathname(page)).toBe('/');
  await expect(page.getByRole('heading', { name: 'Písmená a slová' })).toBeVisible();
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

    await startGame(page, '/alphabet');
    await page.reload();

    await expectHomeScreen(page);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('Forward into a left game redirects home', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await startGame(page, '/alphabet');
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

    await startGame(page, '/alphabet');
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
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();

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
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();

    await page.getByRole('button', { name: 'Späť' }).click();
    await expectHomeScreen(page);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a card tap that opens no game leaves no entry armed for a later Forward', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    // A ctrl- or cmd-click arms the card but the browser opens a new tab. Close it: only this page matters.
    page.context().on('page', (opened) => { void opened.close(); });

    await startGame(page, '/alphabet');
    await page.getByRole('button', { name: 'Späť' }).click();
    await expectHomeScreen(page);

    await page.locator('[data-testid="game-card"][href="/alphabet"]').click({
      modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'],
    });
    await expectHomeScreen(page);

    await page.evaluate(() => {
      (window as unknown as { __popped?: boolean }).__popped = false;
      window.addEventListener('popstate', () => { (window as unknown as { __popped?: boolean }).__popped = true; });
    });
    await page.goForward();
    await page.waitForFunction(() => (window as unknown as { __popped?: boolean }).__popped === true);

    // Armed by the modified click and never consumed, the entry would let this Forward start a Session.
    await expectHomeScreen(page);
    await expect(page.getByTestId('game-visible-instruction')).toHaveCount(0);
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
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});

test.describe('The first moments of a game', () => {
  test('the second half of a double tap on a card does not answer the first Round', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const card = page.locator('[data-testid="game-card"][href="/numbers"]');
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    if (!box) throw new Error('The Numbers card has no box');
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;

    // A child's second tap lands where the card was, on the game that has just replaced Home. Raw
    // mouse clicks, not startGame, which would also wait out the shield. React holds a lazy screen
    // back for about 300 ms after it shows its blank fallback, so a second tap sooner than that falls
    // on the blank screen and harms nothing; the harmful one arrives just after the game appears.
    await page.mouse.click(x, y);
    // waitForFunction polls every animation frame; a locator wait or an expect() poll can notice the
    // game half a second late, after the shield has already gone.
    await page.waitForFunction(() => document.querySelector('[data-testid="game-visible-instruction"]') !== null);
    await page.waitForTimeout(100);
    await page.mouse.click(x, y);

    await page.waitForFunction(() => (window as unknown as { __E2E__?: { gameId?: string } }).__E2E__?.gameId === 'NUMBERS');
    // Judge the game only after the shield's window has passed, so a swallowed tap and an answered
    // Round can be told apart.
    await expect(page.getByTestId('game-input-shield')).toHaveCount(0);

    const state = await getE2EState<FindItState>(page);
    expect(state.wrongAttempts).toBe(0);
    expect(state.roundsPlayed).toBe(0);
    expect(state.gamePhase).not.toBe('resolving-answer');
    expect(state.gamePhase).not.toMatch(/^answered-/);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('answers are accepted once the shield has gone', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await startGame(page, '/numbers');
    await waitForGamePhase(page, 'awaiting-answer');
    const state = await getE2EState<FindItState>(page);
    await pressAnswerById(page, state.correctItemId!);

    // If the shield outlived its window it would swallow this tap and the phase would never advance.
    await waitForGamePhase(page, 'answered-correctly');
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
