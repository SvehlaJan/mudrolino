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

test.describe('Catalog, home, and lobbies', () => {
  test('home renders ordered catalog groups and every game once', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/');
    const main = page.getByRole('main');
    await expect(main.getByRole('heading', { name: 'Písmená a slová' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Čísla a počítanie' })).toBeVisible();
    await expect(main.getByRole('link', { name: /Abeceda/ })).toHaveCount(1);
    await expect(main.getByTestId('game-card')).toHaveCount(11);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('home cards support keyboard focus', async ({ page }) => {
    await page.goto('/');
    const firstCard = page.getByRole('link', { name: /Abeceda/ });
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
  { id: 'ALPHABET', path: '/alphabet', hasSettings: true },
  { id: 'SYLLABLES', path: '/syllables', hasSettings: true },
  { id: 'NUMBERS', path: '/numbers', hasSettings: true },
  { id: 'COUNTING_ITEMS', path: '/counting', hasSettings: true },
  { id: 'COMPARE_QUANTITIES', path: '/compare', hasSettings: true },
  { id: 'ADDITION', path: '/addition', hasSettings: true },
  { id: 'WORDS', path: '/words', hasSettings: false },
  { id: 'FIRST_LETTER', path: '/first-letter', hasSettings: true },
  { id: 'ASSEMBLY', path: '/assembly', hasSettings: false },
  { id: 'COMPLETE_SYLLABLE', path: '/complete-syllable', hasSettings: false },
  { id: 'COMPLETE_LETTER', path: '/complete-letter', hasSettings: true },
];

test.describe('Game lobby semantic contract', () => {
  for (const game of LOBBY_CASES) {
    test(`lobby for ${game.id} (${game.path}) fulfills semantic contract`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);
      await page.goto(game.path);
      const main = page.getByRole('main');
      await expect(main.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(main.getByTestId('lobby-instruction')).toBeVisible();
      await expect(main.getByTestId('lobby-tactile-preview')).toHaveCount(0);
      await expect(main.getByRole('button', { name: 'Hrať' })).toHaveCount(1);

      const settingsBtn = page.getByRole('button', { name: 'Nastavenia' });
      if (game.hasSettings) {
        await expect(settingsBtn).toBeVisible();
      } else {
        await expect(settingsBtn).toHaveCount(0);
      }
      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }

  test('alphabet lobby settings flow: cancel returns to /alphabet with focus, unlock opens the routed game settings screen, saves updates, and close returns with focus', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/alphabet');
    const settingsBtn = page.getByRole('button', { name: 'Nastavenia' });
    await expect(settingsBtn).toBeVisible();

    // 1. Open settings and cancel gate
    await settingsBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page).toHaveURL('/alphabet');
    await expect(settingsBtn).toBeFocused();

    // 2. Open settings and unlock
    await settingsBtn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await unlockParentGate(page);

    // After unlock, must stay on route /settings/games/ALPHABET and render the routed settings screen for Alphabet
    await expect(page).toHaveURL(/\/settings\/games\/ALPHABET$/);
    const main = page.getByRole('main');
    await expect(main).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Abeceda' })).toBeVisible();
    await expect(main.getByText('Hra s písmenami')).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Počet kariet' })).toBeVisible();
    await expect(main.getByRole('heading', { name: 'Písmená s dĺžňami a mäkčeňmi' })).toBeVisible();

    // 3. Update behavior: change grid size option to 6
    const option6 = main.getByRole('radio', { name: '6' });
    await option6.click();
    await expect(option6).toBeChecked();

    // 4. Close settings via the back action
    await main.getByRole('button', { name: 'Späť' }).click();

    // Must return to originating lobby and restore focus to Settings button
    await expect(page).toHaveURL('/alphabet');
    await expect(settingsBtn).toBeFocused();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('lobby sources locale from ContentContext and preserves Czech fallback', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.addInitScript(() => {
      localStorage.setItem(
        'hrave-ucenie-app-settings',
        JSON.stringify({ locale: 'cs', fontFamily: 'nunito' }),
      );
    });

    await page.goto('/alphabet');
    const main = page.getByRole('main');
    await expect(page.getByTestId('lobby-body')).toHaveAttribute('data-locale', 'cs');
    await expect(main.getByRole('heading', { level: 1 })).toHaveText('Abeceda');
    await expect(main.getByTestId('lobby-instruction')).toHaveText('Nájdi správne písmenko.');
    await expect(main.getByRole('button', { name: 'Hrať' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('lobby renders cleanly at short landscape (667x375) and narrow phone (320x568)', async ({ page }) => {
    // 320x568
    await page.setViewportSize(CANONICAL_VIEWPORTS.narrowPhone);
    await page.goto('/alphabet');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await expect(page.getByTestId('lobby-tactile-preview')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    // 667x375
    await page.setViewportSize(CANONICAL_VIEWPORTS.shortLandscape);
    await page.goto('/alphabet');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await expect(page.getByTestId('lobby-tactile-preview')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
