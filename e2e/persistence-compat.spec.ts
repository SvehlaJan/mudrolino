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
  seedIndexedDBAudioFixture,
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
    const fontButton = page.getByRole('radio', { name: /Hravé \(Shantell\)/i });
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

  test('seeded content and audio override are consumed on /content after unlocking', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await seedLocalStorage(page, localDataV1);
    await page.goto('/content');

    const audioFixture = await seedIndexedDBAudioFixture(page, localDataV1);
    expect(await getIndexedDBAudio(page, audioFixture.key)).toBe(audioFixture.text);
    await page.reload();
    expect(await page.evaluate(() => localStorage.getItem('indexedDBAudio'))).toBeNull();

    await unlockParentGate(page);
    await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).toBeVisible();

    // Check custom words
    await page.getByRole('button', { name: 'Slová' }).click();
    await expect(page.getByText('Mama 👩', { exact: true })).toBeVisible();
    await expect(page.getByText('auto', { exact: false })).toBeVisible();
    const customWordRow = page.getByText('auto 🚗', { exact: true }).locator('xpath=../..');
    await expect(customWordRow.getByRole('button', { name: 'Zmazať nahrávku' })).toBeVisible();
    expect(audioFixture.key).toBe('sk/words/custom-custom-1');

    // Check custom praise
    await page.getByRole('button', { name: 'Pochvaly' }).click();
    await expect(page.getByText('Výborne!', { exact: false })).toBeVisible();
    await expect(page.getByText('Super robota!', { exact: false })).toBeVisible();

    const storedWords = await page.evaluate(() => JSON.parse(localStorage.getItem('hrave-ucenie-user-words-sk') ?? '[]'));
    const storedPraises = await page.evaluate(() => JSON.parse(localStorage.getItem('hrave-ucenie-user-praises-sk') ?? '[]'));
    expect(storedWords).toEqual(expect.arrayContaining([
      expect.objectContaining({ word: 'Mama', isDefault: true, audioKey: 'mama' }),
      expect.objectContaining({ word: 'auto', isDefault: false, audioKey: 'custom-custom-1' }),
    ]));
    expect(storedPraises).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: 'Výborne!', isDefault: true, audioKey: 'vyborne' }),
      expect.objectContaining({ text: 'Super robota!', isDefault: false }),
    ]));

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

});
