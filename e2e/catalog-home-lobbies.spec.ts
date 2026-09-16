import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';

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
