import { expect, test, type Page } from '@playwright/test';
import {
  expectNoConsoleErrors,
  expectNoFailedRequests,
  trackConsoleErrors,
  trackFailedRequests,
} from './support/assertions';
import { stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';

async function startFromHome(page: Page, title: string): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: new RegExp(title, 'i') }).click();
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  await expect(page.getByTestId('lobby-instruction')).toBeVisible();
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
  await expect(page.getByTestId('game-answer-region').getByRole('button')).not.toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');
  await expectNoHorizontalOverflow(page);
}

test('WebKit renders home, the parent gate, and representative child rounds', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await stubSpeechSynthesis(page);

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Hravé Učenie' })).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Nastavenia' }).click();
  await expect(page.getByRole('dialog', { name: 'Pre rodičov' })).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await startFromHome(page, 'Abeceda');
  await startFromHome(page, 'Spočítaj');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
