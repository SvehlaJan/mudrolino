import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './support/fixtures';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';
import { unlockParentGate } from './support/parentGate';
import { getIndexedDBAudio, seedIndexedDBAudioFixture, seedLocalStorage } from './support/persistenceFixtures';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDataV1 = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/local-data-v1.json'), 'utf-8'),
) as Record<string, unknown>;

test('a backup moves custom words, recordings and settings to a fresh device', async ({ page, browser, baseURL }, testInfo) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await seedLocalStorage(page, localDataV1);
  // Desktop browsers without a file share sheet download the backup directly.
  await page.addInitScript(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  await page.goto('/settings/app');
  const audio = await seedIndexedDBAudioFixture(page, localDataV1);
  await unlockParentGate(page);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Uložiť zálohu' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^mudrolino-zaloha-\d{4}-\d{2}-\d{2}\.json$/);
  const backupPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(backupPath);
  await expect(page.getByRole('status').filter({ hasText: 'Záloha je uložená.' })).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);

  const freshContext = await browser.newContext({ baseURL });
  try {
    const fresh = await freshContext.newPage();
    const freshErrors = trackConsoleErrors(fresh);
    await fresh.goto('/settings/app');
    await unlockParentGate(fresh);
    await expect(fresh.locator('html')).toHaveAttribute('data-font', 'nunito');

    await fresh.getByLabel('Súbor zálohy').setInputFiles(backupPath);
    const review = fresh.getByTestId('backup-review');
    await expect(review).toContainText('nahrávky 1, vlastné slová 1, vlastné pochvaly 1');
    await review.getByRole('button', { name: 'Obnoviť' }).click();

    await expect(fresh.getByRole('status').filter({ hasText: 'Záloha je obnovená.' })).toBeVisible();
    await expect(fresh.locator('html')).toHaveAttribute('data-font', 'shantell');
    expect(await getIndexedDBAudio(fresh, audio.key)).toBe(audio.text);
    const words = await fresh.evaluate(() => JSON.parse(localStorage.getItem('hrave-ucenie-user-words-sk') ?? '{}').items as Array<{ id: string }>);
    expect(words.map(word => word.id)).toContain('custom-1');
    expectNoConsoleErrors(freshErrors);
  } finally {
    await freshContext.close();
  }
});

test('a file that is not a backup is rejected without changing anything', async ({ page }, testInfo) => {
  await page.goto('/settings/app');
  await unlockParentGate(page);
  const notBackup = testInfo.outputPath('notes.json');
  fs.writeFileSync(notBackup, JSON.stringify({ hello: 'world' }));

  await page.getByLabel('Súbor zálohy').setInputFiles(notBackup);
  await expect(page.getByRole('alert')).toHaveText('Tento súbor nie je záloha Mudrolína.');
  await expect(page.getByTestId('backup-review')).toHaveCount(0);
});
