import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';

test.describe('UI/UX Enhancements', () => {
  test('replay control: renders in alphabet game and is clickable', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/alphabet');
    await page.getByRole('button', { name: 'Hrať' }).click();

    // Phase 5's shared GamePrompt replaced the audio-only AuditoryPromptBadge with a
    // visible instruction plus this replay control for every FindIt-based game.
    const replayButton = page.getByRole('button', { name: 'Zopakovať zadanie' });
    await expect(replayButton).toBeVisible();
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();

    await replayButton.click();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('counting game: items render in collision-free grid and are clickable with pop sound', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/counting');
    await page.getByRole('button', { name: 'Hrať' }).click();

    const items = page.getByRole('button', { name: 'Spočítateľný predmet' });
    await expect(items.first()).toBeVisible();

    const initialCount = await items.count();
    expect(initialCount).toBeGreaterThan(0);
    expect(initialCount).toBeLessThanOrEqual(10);

    // Tap the first item — should trigger pop without submitting or throwing
    await items.first().click();

    // Confirm game is still in playing state
    await expect(page.getByRole('button', { name: 'Nové kolo' })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('prompt badge: rendered in ui-kit screen', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/ui-kit');
    await expect(page.getByRole('heading', { name: 'Prompt Badge' })).toBeVisible();
    await expect(page.getByText('🚗', { exact: true })).toBeVisible();
    await expect(page.getByText('🍎', { exact: true })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('assembly: prompt badge and answer slots render with thumb layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/assembly');
    await page.getByRole('button', { name: 'Hrať' }).click();

    // Prompt badge is visible
    const promptBadge = page.getByTestId('prompt-badge');
    await expect(promptBadge.first()).toBeVisible();

    // Empty slot with question mark placeholder is visible
    await expect(page.getByText('?').first()).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
