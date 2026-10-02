import { expect, test } from './support/fixtures';
import { waitForGamePhase } from './support/gameHarness';
import { expectNoHorizontalOverflow } from './support/layoutAssertions';
import { unlockParentGate } from './support/parentGate';

test('@viewport-loop a portrait to landscape rotation preserves an active round and focused answer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  const answer = page.getByTestId('game-answer-region').getByRole('button').first();
  await answer.focus();
  await expect(answer).toBeFocused();
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page).toHaveURL('/alphabet');
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(answer).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test('@viewport-loop a portrait to landscape rotation preserves an open parent word editor, draft text, and focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/content');
  await unlockParentGate(page);
  await page.getByRole('tab', { name: 'Slová' }).click();
  await page.getByRole('button', { name: 'Pridať slovo', exact: true }).click();

  const editor = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Pridať slovo' }) });
  const word = editor.getByLabel(/^Slovo\b/);
  await word.fill('Neuložené slovo');
  await word.focus();
  await expect(word).toBeFocused();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page).toHaveURL('/content');
  await expect(editor).toBeVisible();
  await expect(word).toHaveValue('Neuložené slovo');
  await expect(word).toBeFocused();
  await expectNoHorizontalOverflow(page);
});
