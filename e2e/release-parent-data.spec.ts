import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import {
  expectNoConsoleErrors,
  expectNoFailedRequests,
  trackConsoleErrors,
  trackFailedRequests,
} from './support/assertions';
import { installFakeRecorder } from './support/fakeRecorder';
import {
  getIndexedDBAudio,
  seedIndexedDBAudioFixture,
} from './support/persistenceFixtures';
import { solveParentGate } from './support/parentGate';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const localDataV1 = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'fixtures/local-data-v1.json'), 'utf-8'),
) as Record<string, unknown>;

async function audioHash(page: Page, key: string): Promise<string | null> {
  const audio = await getIndexedDBAudio(page, key);
  return audio === null ? null : createHash('sha256').update(audio).digest('hex');
}

async function openProtectedRoute(page: Page, route: string) {
  await page.goto(route);
  await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
  await solveParentGate(page);
}

async function reloadProtectedRoute(page: Page) {
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
  await solveParentGate(page);
}

test('legacy parent data stays editable across protected-route reloads and expires on child exit', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);

  await installFakeRecorder(page);
  // IndexedDB requires a real same-origin document; the gate protects content
  // while the legacy fixture is installed before any parent route is unlocked.
  await page.goto('/content');
  await page.evaluate((items) => {
    for (const [key, value] of Object.entries(items)) {
      if (key === 'indexedDBAudio') continue;
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  }, localDataV1);
  const audioFixture = await seedIndexedDBAudioFixture(page, localDataV1);

  await openProtectedRoute(page, '/settings/games/NUMBERS');
  await expect(page.getByRole('radio', { name: /^1\s*[-–]\s*20$/ })).toBeChecked();
  await page.getByRole('radio', { name: /^1\s*[-–]\s*10$/ }).click();
  await reloadProtectedRoute(page);
  await expect(page.getByRole('radio', { name: /^1\s*[-–]\s*10$/ })).toBeChecked();

  await openProtectedRoute(page, '/settings/games/ADDITION');
  await expect(page.getByRole('radio', { name: 'Čísla' })).toBeChecked();

  await openProtectedRoute(page, '/settings/app');
  await expect(page.locator('html')).toHaveAttribute('data-font', 'shantell');
  await page.getByRole('radio', { name: /Zaoblené \(Nunito\)/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-font', 'nunito');
  await reloadProtectedRoute(page);
  await expect(page.getByRole('radio', { name: /Zaoblené \(Nunito\)/ })).toBeChecked();

  await openProtectedRoute(page, '/content');
  await page.getByRole('tab', { name: 'Slová' }).click();
  await expect(page.getByText('Vlastné', { exact: true })).toBeVisible();
  const wordRow = page.getByText('auto 🚗', { exact: true }).locator('xpath=../..');
  await expect(wordRow.getByRole('button', { name: 'Prehrať' })).toBeEnabled();
  await wordRow.getByRole('button', { name: 'Ďalšie možnosti' }).click();
  await page.getByRole('menuitem', { name: 'Upraviť' }).click();
  await page.getByLabel(/^Slovo\b/).fill('Autíčko');
  await page.getByLabel(/^Slabiky\b/).fill('au-tič-ko');
  await page.getByRole('button', { name: 'Uložiť', exact: true }).click();

  const editedWordRow = page.getByText('Autíčko 🚗', { exact: true }).locator('xpath=../..');
  await editedWordRow.getByRole('button', { name: 'Nahrať' }).click();
  await page.getByRole('button', { name: 'Zastaviť' }).click();
  await expect(editedWordRow.getByRole('button', { name: 'Zmazať nahrávku' })).toBeVisible();
  const replacementAudioHash = await audioHash(page, audioFixture.key);
  expect(replacementAudioHash).not.toBeNull();
  expect(replacementAudioHash).not.toBe(createHash('sha256').update('audio').digest('hex'));

  await page.getByRole('tab', { name: 'Pochvaly' }).click();
  const praiseRow = page.getByText(/Super robota!$/).locator('xpath=../..');
  await praiseRow.getByRole('button', { name: 'Ďalšie možnosti' }).click();
  await page.getByRole('menuitem', { name: 'Upraviť' }).click();
  await page.getByLabel(/^Text pochvaly\b/).fill('Super jazda!');
  await page.getByRole('button', { name: 'Uložiť', exact: true }).click();

  await reloadProtectedRoute(page);
  await page.getByRole('tab', { name: 'Slová' }).click();
  await expect(page.getByText('Autíčko 🚗', { exact: true })).toBeVisible();
  await expect(page.getByText('AU-TIČ-KO', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prehrať' }).first()).toBeEnabled();
  await page.getByRole('tab', { name: 'Pochvaly' }).click();
  await expect(page.getByText(/Super jazda!$/)).toBeVisible();
  expect(await audioHash(page, audioFixture.key)).toBe(replacementAudioHash);

  await page.goto('/numbers');
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  await page.goto('/content');
  await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).not.toBeVisible();
  await solveParentGate(page);
  await page.getByRole('tab', { name: 'Slová' }).click();
  await expect(page.getByText('Autíčko 🚗', { exact: true })).toBeVisible();
  expect(await audioHash(page, audioFixture.key)).toBe(replacementAudioHash);

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
