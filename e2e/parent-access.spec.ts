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
      if (route === '/settings/games/ALPHABET') {
        await expect(page).toHaveURL(/\/settings\/games\/ALPHABET$/);
      } else {
        await expect(page).toHaveURL(/\/settings$/);
      }
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

test.describe('Parent Gate Dialog', () => {
  test('parent gate is a modal dialog with visible and announced errors', async ({ page }) => {
    await page.goto('/settings');
    const dialog = page.getByRole('dialog', { name: 'Pre rodičov' });
    await expect(dialog).toBeVisible();

    await page.waitForFunction(() => typeof window.__E2E__?.parentGate?.answer === 'number');
    const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
    if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');
    const wrongDigit = String((answer + 1) % 10);

    await page.getByRole('button', { name: wrongDigit, exact: true }).click();
    await page.getByRole('button', { name: 'Potvrdiť' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Skús to ešte raz');
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'visible');
  });

  test('initial focus lands inside the dialog and Tab never escapes it', async ({ page }) => {
    await page.goto('/settings');
    const dialog = page.getByRole('dialog', { name: 'Pre rodičov' });
    await expect(dialog).toBeVisible();

    await expect(page.locator(':focus')).toHaveJSProperty('nodeName', 'BUTTON');
    const focusIsInsideDialog = await page.evaluate(() =>
      document.querySelector('[role="dialog"]')?.contains(document.activeElement),
    );
    expect(focusIsInsideDialog).toBe(true);

    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const stillInside = await page.evaluate(() =>
        document.querySelector('[role="dialog"]')?.contains(document.activeElement),
      );
      expect(stillInside).toBe(true);
    }
  });

  test('Escape cancels the gate and falls back to the same route as clicking Späť', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('dialog', { name: 'Pre rodičov' })).toBeVisible();

    await page.keyboard.press('Escape');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();
  });

  test('the physical keyboard drives digits, Backspace and Enter', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForFunction(() => typeof window.__E2E__?.parentGate?.answer === 'number');
    const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
    if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');

    // A stray leading digit, removed with Backspace — deterministic regardless of
    // whether the real answer below is one or two digits long.
    await page.keyboard.press('5');
    await page.keyboard.press('Backspace');

    for (const digit of String(answer)) {
      await page.keyboard.press(digit);
    }
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
  });

  test('closing the gate over a game route restores focus to the settings trigger', async ({ page }) => {
    await page.goto('/alphabet');
    const trigger = page.getByRole('button', { name: 'Nastavenia' });
    await trigger.click();

    const dialog = page.getByRole('dialog', { name: 'Pre rodičov' });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');

    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('reduced motion truly disables the wrong-answer shake, not just speeds it up', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/settings');
    const dialog = page.getByRole('dialog', { name: 'Pre rodičov' });

    await page.waitForFunction(() => typeof window.__E2E__?.parentGate?.answer === 'number');
    const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
    if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');
    const wrongDigit = String((answer + 1) % 10);

    const equation = dialog.getByTestId('parent-gate-equation');
    await page.getByRole('button', { name: wrongDigit, exact: true }).click();
    await page.getByRole('button', { name: 'Potvrdiť' }).click();

    await expect(dialog.getByRole('alert')).toContainText('Skús to ešte raz');
    await expect(equation).not.toHaveClass(/animate-shake/);
    await expect(equation).toHaveCSS('animation-name', 'none');
  });

  test('digit, Backspace, and Enter keydowns are prevented so focused buttons cannot double-submit and Backspace cannot navigate, while unhandled keys keep their default behavior', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('dialog', { name: 'Pre rodičov' })).toBeVisible();

    const notCanceled = await page.evaluate(() => {
      const dispatch = (key: string) =>
        window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true }));
      return {
        digit: dispatch('5'),
        backspace: dispatch('Backspace'),
        enter: dispatch('Enter'),
        tab: dispatch('Tab'),
      };
    });

    expect(notCanceled).toEqual({ digit: false, backspace: false, enter: false, tab: true });
  });

  test('a duplicated wrong-answer submission clears the pending error timer instead of stacking another', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForFunction(() => typeof window.__E2E__?.parentGate?.answer === 'number');
    const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
    if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');
    const wrongDigit = String((answer + 1) % 10);

    await page.getByRole('button', { name: wrongDigit, exact: true }).click();
    // Two Enter keydowns dispatched synchronously in the same task, bypassing any
    // native button click synthesis, so both reach handleConfirm before React
    // commits the first setError(true) — the only way to reproduce the race
    // deterministically instead of relying on real timing.
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });

    const dialog = page.getByRole('dialog', { name: 'Pre rodičov' });
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog.getByRole('alert')).toHaveCount(0);

    // A generous settle window: proves no second, staggered timer fires later
    // and bumps the count again, without pinning to the exact ~500ms delay.
    await expect
      .poll(() => page.evaluate(() => window.__E2E__?.parentGate?.errorRecoveries), { timeout: 2000 })
      .toBe(1);
    await page.waitForTimeout(800);
    const errorRecoveries = await page.evaluate(() => window.__E2E__?.parentGate?.errorRecoveries);
    expect(errorRecoveries).toBe(1);
  });
});
