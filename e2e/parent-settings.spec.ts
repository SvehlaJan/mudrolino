import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import { unlockParentGate } from './support/parentGate';

test.describe('Parent dashboard and game settings', () => {
  test('dashboard exposes the four parent destinations', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
    for (const name of ['Nastavenia hier', 'Vlastný obsah', 'Aplikácia a vzhľad', 'Pomoc a spätná väzba']) {
      await expect(page.getByRole('link', { name: new RegExp(name) })).toBeVisible();
    }

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('game detail renders only catalogued settings', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    const detail = page.getByTestId('game-settings-detail');
    await expect(page.getByRole('switch', { name: /dĺžňami a mäkčeňmi/ })).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Počet kariet' })).toBeVisible();
    await expect(detail.getByText(/Rozsah súčtu/)).toHaveCount(0);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('games overview lists only games with catalogued settings', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games');
    await unlockParentGate(page);
    await expect(page.getByRole('link', { name: /Abeceda/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Slová/ })).toHaveCount(0);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('an uncatalogued game id shows a safe parent not-found state with a route back', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/not-a-real-game');
    await unlockParentGate(page);
    await expect(page).toHaveURL(/\/settings\/games\/not-a-real-game$/);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
    await expect(page.getByText('Nastavenia hry sa nenašli')).toBeVisible();
    await expect(page.getByTestId('game-settings-not-found')).toBeVisible();

    const overviewLink = page.getByRole('link', { name: 'Prehľad nastavení hier' });
    await expect(overviewLink).toBeVisible();
    await overviewLink.click();
    await expect(page).toHaveURL(/\/settings\/games$/);
    await expect(page.getByRole('link', { name: /Abeceda/ })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a catalogued game without settings remains safe', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/WORDS');
    await unlockParentGate(page);
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('closing game settings entered from a lobby returns to that lobby with focus restored', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/syllables');
    const trigger = page.getByRole('button', { name: 'Nastavenia' });
    await trigger.click();
    await unlockParentGate(page);
    await expect(page).toHaveURL(/\/settings\/games\/SYLLABLES$/);

    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page).toHaveURL('/syllables');
    await expect(trigger).toBeFocused();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('closing the dashboard replaces history so browser back cannot reopen it', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Nastavenia' }).click();
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();

    await page.goBack();
    await expect(page).not.toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('changing a setting updates immediately, with no separate save action', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    const option6 = page.getByRole('radio', { name: '6', exact: true });
    await expect(option6).not.toBeChecked();
    await option6.click();
    await expect(option6).toBeChecked();
    await expect(page.getByRole('button', { name: /uložiť|save/i })).toHaveCount(0);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('forced addition ranges explain their visible numeral representation', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/ADDITION');
    await unlockParentGate(page);
    const objectsOption = page.getByRole('radio', { name: 'Predmety' });
    const numeralsOption = page.getByRole('radio', { name: 'Čísla' });
    await expect(objectsOption).toBeChecked();

    for (const [index, range] of ['20', '100'].entries()) {
      if (index > 0) {
        await page.getByRole('radio', { name: '5', exact: true }).click();
        await objectsOption.click();
        await expect(objectsOption).toBeChecked();
      }
      await page.getByRole('radio', { name: range, exact: true }).click();
      await expect(numeralsOption).toBeChecked();
      await expect(page.getByTestId('setting-dependency-notice')).toContainText(
        'Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.',
      );
    }

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a storage failure is surfaced through the autosave status', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem = () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      };
    });

    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    await page.getByRole('switch', { name: /dĺžňami a mäkčeňmi/ }).click();

    await expect(page.getByTestId('autosave-status')).toHaveText(/nepodarilo uložiť/);
  });

  test('a changed setting survives a reload', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    const option6 = page.getByRole('radio', { name: '6', exact: true });
    await option6.click();
    await expect(option6).toBeChecked();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await unlockParentGate(page);
    await expect(page.getByRole('radio', { name: '6', exact: true })).toBeChecked();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('320px viewport stacks the game detail without the games list pane', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.setViewportSize(CANONICAL_VIEWPORTS.narrowPhone);
    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Počet kariet' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Slabiky/ })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('667x375 short landscape stacks the game detail without the games list pane', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.setViewportSize(CANONICAL_VIEWPORTS.shortLandscape);
    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Počet kariet' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Slabiky/ })).toHaveCount(0);
    await expectNoHorizontalOverflow(page);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('wide viewports show the games list alongside the selected game detail', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.setViewportSize(CANONICAL_VIEWPORTS.desktopWide);
    await page.goto('/settings/games/ALPHABET');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Počet kariet' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Slabiky/ })).toBeVisible();
    await expectNoHorizontalOverflow(page);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
