import { test, expect } from './support/fixtures';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { readFile } from 'node:fs/promises';
import { unlockParentGate } from './support/parentGate';

test.describe('Printable worksheets', () => {
  test('parents reach worksheets from the dashboard and pick games, answer mode and page count', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto('/settings');
    await unlockParentGate(page);
    await page.getByRole('link', { name: /Pracovné listy/ }).click();
    await expect(page).toHaveURL(/\/settings\/worksheets$/);

    const preview = page.getByTestId('worksheet-preview');
    // Six games, one page each.
    await expect(preview.getByTestId('worksheet-sheet')).toHaveCount(6);
    await expect(page.getByTestId('worksheet-sheet-count')).toHaveText('Počet strán: 6');

    await page.getByRole('switch', { name: /Spočítaj predmety/ }).click();
    await expect(preview.getByTestId('worksheet-sheet')).toHaveCount(5);
    await expect(preview.locator('[data-game="COUNTING_ITEMS"]')).toHaveCount(0);

    await page.getByRole('radio', { name: '2' }).click();
    await expect(preview.getByTestId('worksheet-sheet')).toHaveCount(10);

    await expect(preview.getByTestId('ws-write-box')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Píše' }).click();
    await expect(preview.getByTestId('ws-write-box').first()).toBeVisible();


    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test('the same seed prints the same tasks and only the sheets reach the printer', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto('/settings/worksheets?seed=42');
    await unlockParentGate(page);
    const firstSheet = page.getByTestId('worksheet-preview').getByTestId('worksheet-sheet').first();
    const firstText = await firstSheet.textContent() ?? "";

    await page.reload();
    await unlockParentGate(page);
    await expect(firstSheet).toHaveText(firstText);

    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('heading', { name: 'Pracovné listy' })).toBeHidden();
    await expect(page.locator('#worksheet-print-root [data-testid="worksheet-sheet"]').first()).toBeVisible();
    // Every A4 sheet fills exactly one printed page.
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
    const pageCount = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
    expect(pageCount).toBe(6);
    expectNoConsoleErrors(errors);
  });
  test('a downloaded PDF holds every sheet and each download gets a new Mudrolino file name', async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/settings/worksheets?seed=42');
    await unlockParentGate(page);
    await expect(page.getByTestId('worksheet-preview').getByTestId('worksheet-sheet').first()).toBeVisible();

    const names: string[] = [];
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Stiahnuť PDF' }).click(),
      ]);
      names.push(download.suggestedFilename());
      const pdf = (await readFile(await download.path())).toString('latin1');
      expect(pdf.startsWith('%PDF-')).toBe(true);
      expect(pdf.match(/\/Type \/Page /g)).toHaveLength(6);
      await expect(page.getByTestId('worksheet-sheet-count')).toHaveText('Počet strán: 6');
    }
    expect(names).toEqual(['Mudrolino-pracovne-listy-001.pdf', 'Mudrolino-pracovne-listy-002.pdf']);
    await expect(page.locator('#worksheet-pdf-root')).toHaveCount(0);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
});
