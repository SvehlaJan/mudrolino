import { test, expect } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import { unlockParentGate } from './support/parentGate';
import { openGameFromHome } from './support/gameEntry';

test.describe('Catalog, home, and lobbies', () => {
  test('home renders ordered catalog groups and every game once', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Písmená a slová' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Čísla a počítanie' })).toBeVisible();
    await expect(main.getByRole('link', { name: /Čítaj písmenká/ })).toHaveCount(1);
    await expect(main.getByTestId('game-card')).toHaveCount(11);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('home cards support keyboard focus', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.getByRole('link', { name: /Čítaj písmenká/ });
    await firstCard.focus();
    await expect(firstCard).toBeFocused();
  });

  test('home renders cleanly at narrow phone viewport (320x568)', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.narrowPhone);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Písmená a slová' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Čísla a počítanie' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('ui-kit renders game card examples and narrow layout demo', async ({ page }) => {
    await page.goto('/ui-kit');
    const heading = page.getByRole('heading', { name: 'Game Cards & Grouped Home' });
    await expect(heading).toBeVisible();
    const section = heading.locator('..');
    await expect(section.getByText('Jednotlivá karta (GameCard)')).toBeVisible();
    await expect(section.getByText('Karta s dlhým zalamovaným názvom')).toBeVisible();
    await expect(section.getByText('Rozloženie na úzkej obrazovke (320px layout)')).toBeVisible();
  });
});

const LOBBY_CASES = [
  { id: 'ALPHABET', path: '/alphabet' },
  { id: 'SYLLABLES', path: '/syllables' },
  { id: 'NUMBERS', path: '/numbers' },
  { id: 'COUNTING_ITEMS', path: '/counting' },
  { id: 'COMPARE_QUANTITIES', path: '/compare' },
  { id: 'ADDITION', path: '/addition' },
  { id: 'WORDS', path: '/words' },
  { id: 'FIRST_LETTER', path: '/first-letter' },
  { id: 'ASSEMBLY', path: '/assembly' },
  { id: 'COMPLETE_SYLLABLE', path: '/complete-syllable' },
  { id: 'COMPLETE_LETTER', path: '/complete-letter' },
];

test.describe('Game lobby semantic contract', () => {
  for (const game of LOBBY_CASES) {
    test(`lobby for ${game.id} (${game.path}) fulfills semantic contract`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);
      await openGameFromHome(page, game.path);
      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(main.getByTestId('lobby-instruction')).toBeVisible();
      await expect(main.getByTestId('lobby-tactile-preview')).toHaveCount(0);
      await expect(main.getByRole('button', { name: 'Hrať' })).toHaveCount(1);
      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }

  test('lobbies offer no settings shortcut', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    for (const game of LOBBY_CASES) {
      await openGameFromHome(page, game.path);
      await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Nastavenia' })).toHaveCount(0);
    }
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('game settings are reached through the Parent area: cancel goes home, unlock drills down to the game, and Back returns to the overview', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/');
    const gear = page.getByRole('button', { name: 'Nastavenia' });

    // 1. Open the Parent gate from the Home screen and cancel it
    await gear.click();
    await expect(page.getByRole('dialog', { name: 'Pre rodičov' })).toBeVisible();
    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Mudrolíno' })).toBeVisible();

    // 2. Open it again, unlock, and drill down: dashboard, games overview, the game
    await gear.click();
    await unlockParentGate(page);
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole('link', { name: /Nastavenia hier/ }).click();
    await expect(page).toHaveURL(/\/settings\/games$/);
    await page.getByRole('link', { name: /Čítaj písmenká/ }).click();
    await expect(page).toHaveURL(/\/settings\/games\/ALPHABET$/);
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Čítaj písmenká' })).toBeVisible();
    await expect(main.getByText('Hra s písmenami')).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Počet kariet' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Písmená s dĺžňami a mäkčeňmi' })).toBeVisible();

    // 3. Update behavior: change grid size option to 6
    const option6 = main.getByRole('radio', { name: '6' });
    await option6.click();
    await expect(option6).toBeChecked();

    // 4. Back steps to the games overview, never into a game
    await main.getByRole('button', { name: 'Späť' }).click();
    await expect(page).toHaveURL(/\/settings\/games$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Nastavenia hier' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('lobby sources locale from ContentContext and shows Czech copy', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.addInitScript(() => {
      localStorage.setItem(
        'hrave-ucenie-app-settings',
        JSON.stringify({ locale: 'cs', fontFamily: 'nunito' }),
      );
    });

    await openGameFromHome(page, '/alphabet');
    const main = page.getByRole('main');
    await expect(page.getByTestId('lobby-body')).toHaveAttribute('data-locale', 'cs');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Čti písmenka');
    await expect(main.getByTestId('lobby-instruction')).toHaveText('Najdi správné písmenko.');
    await expect(main.getByRole('button', { name: 'Hrát' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'cs');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('lobby renders cleanly at short landscape (667x375) and narrow phone (320x568)', async ({ page }) => {
    // 320x568
    await page.setViewportSize(CANONICAL_VIEWPORTS.narrowPhone);
    await openGameFromHome(page, '/alphabet');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await expect(page.getByTestId('lobby-tactile-preview')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // 667x375
    await page.setViewportSize(CANONICAL_VIEWPORTS.shortLandscape);
    await openGameFromHome(page, '/alphabet');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await expect(page.getByTestId('lobby-tactile-preview')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
