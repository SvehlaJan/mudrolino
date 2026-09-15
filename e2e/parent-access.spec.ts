import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { unlockParentGate, solveParentGate } from './support/parentGate';

test.describe('Parent Access Gate', () => {
  test('direct navigation to /settings shows gate without revealing protected content', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('direct navigation to /content shows gate without revealing custom content', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/content');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('direct navigation to /recordings shows gate without revealing content', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/recordings');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  for (const route of [
    '/settings/games',
    '/settings/games/ALPHABET',
    '/settings/app',
    '/settings/help',
  ]) {
    test(`direct navigation to ${route} stays guarded until unlock`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);

      await page.goto(route);
      await expect(page).toHaveURL(new RegExp(`${route.replaceAll('/', '\\/')}$`));
      await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

      await unlockParentGate(page);
      await expect(page).toHaveURL(/\/settings$/);
      await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }

  test('home settings entry requires the parent gate', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Nastavenia' }).click();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('leaving protected route and revisiting asks for gate again', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    // Leave to home via in-app back navigation
    await page.getByRole('button', { name: 'Späť' }).click();
    await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();

    // Revisit protected settings via browser back
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('browser Forward returns to the protected route but keeps it locked', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Nastavenia' }).click();
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await page.goForward();

    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('a fresh browser context is locked on a protected route', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
    await context.close();
  });

  test('unknown settings game entry stays guarded and unlocks only to the safe parent destination', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings/games/not-a-catalogued-game');
    await expect(page).toHaveURL(/\/settings\/games\/not-a-catalogued-game$/);
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    await unlockParentGate(page);
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('wrong answer fails and does not unlock gate', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await page.waitForFunction(() => typeof window.__E2E__?.parentGate?.answer === 'number');
    const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
    if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');

    const wrongDigit = String((answer + 1) % 10);
    await page.getByRole('button', { name: wrongDigit, exact: true }).click();
    await page.getByRole('button', { name: 'Potvrdiť' }).click();

    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('correct keypad answer unlocks and displays protected content', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();

    await solveParentGate(page);

    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('direct cancel falls back to home', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();

    await page.getByRole('button', { name: 'Späť' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('lobby deep-link with a catalogued child returnTo stays guarded and cancels back to that lobby', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/alphabet');
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await page.evaluate(() => {
      window.history.pushState(
        { usr: { returnTo: '/alphabet' }, key: 'synthetic-return', idx: 1 },
        '',
        '/settings',
      );
      window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
    });

    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    await page.getByRole('button', { name: 'Späť' }).click();

    await expect(page).toHaveURL(/\/alphabet$/);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('protected-to-protected transition preserves unlocked status', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    await page.getByRole('button', { name: /vlastný obsah/i }).click();

    await expect(page).toHaveURL(/\/content$/);
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('page reload locks again and shows gate', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('legacy /recordings route redirects to /content after unlocking', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/recordings');
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();

    await unlockParentGate(page);

    await expect(page).toHaveURL(/\/content$/);
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).not.toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
