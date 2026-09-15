import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { unlockParentGate } from './support/parentGate';
import {
  seedLocalStorage,
  seedIndexedDBAudio,
  getIndexedDBAudio,
} from './support/persistenceFixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDataV1 = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/local-data-v1.json'), 'utf-8'),
) as Record<string, unknown>;

test.describe('Persistence and Backward Compatibility', () => {
  test('seeded v1 settings apply font to root and load into settings screen', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await seedLocalStorage(page, localDataV1);
    await page.goto('/settings');

    // Font attribute on root is loaded from app settings
    await expect(page.locator('html')).toHaveAttribute('data-font', 'shantell');

    // Unlock parent gate
    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();

    // Verify font family option is visible
    const fontButton = page.getByRole('button', { name: /Hravé \(Shantell\)/i });
    await expect(fontButton).toBeVisible();

    // Verify localStorage has persisted game settings correctly preserved
    const storedSettings = await page.evaluate(() => {
      const raw = localStorage.getItem('hrave-ucenie-settings');
      return raw ? JSON.parse(raw) : null;
    });
    expect(storedSettings).toMatchObject({
      alphabetGridSize: 6,
      alphabetAccents: false,
      syllablesGridSize: 4,
      numbersRange: { start: 1, end: 20 },
      countingRange: { start: 1, end: 10 },
      completeLetterMissingCount: 'adaptive',
      compareRange: { start: 1, end: 10 },
      compareMode: 'numerals',
      additionSumRange: 20,
      additionRepresentation: 'numerals',
    });

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('custom words and praise are visible on /content after unlocking', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await seedLocalStorage(page, localDataV1);
    await page.goto('/content');

    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).toBeVisible();

    // Check custom words
    await page.getByRole('button', { name: 'Slová' }).click();
    await expect(page.getByText('auto', { exact: false })).toBeVisible();

    // Check custom praise
    await page.getByRole('button', { name: 'Pochvaly' }).click();
    await expect(page.getByText('Super robota!', { exact: false })).toBeVisible();

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('IndexedDB audio override can be stored and retrieved via audioOverrideStore', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/');

    const testKey = 'sk/words/custom-1';
    const testAudioData = 'custom-audio-recording-test-payload';
    await seedIndexedDBAudio(page, testKey, testAudioData);

    const retrieved = await getIndexedDBAudio(page, testKey);
    expect(retrieved).toBe(testAudioData);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
