import { test, expect } from './support/fixtures';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';
import { getE2EState } from './support/e2eHook';
import { pressAnswerById, waitForGamePhase } from './support/gameHarness';
import { unlockParentGate } from './support/parentGate';
import { PRAISE_ENTRIES } from '../src/shared/locales/cs';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

const CZECH_PRAISE = new RegExp(PRAISE_ENTRIES.map(entry => entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hrave-ucenie-app-settings', JSON.stringify({ locale: 'cs', fontFamily: 'nunito' }));
  });
});

test('a Czech family plays with Czech prompts, letters and praise', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrát' }).click();

  await expect(page.getByText('Najdi písmeno, které slyšíš.')).toBeVisible();
  const state = await getE2EState<E2EGlobalState & { correctItemId: string | null; gridItemIds: string[] }>(page);
  // The Czech alphabet has Ř and Ů; Slovak-only letters never appear.
  expect(state.gridItemIds.some(id => ['Ä', 'Ľ', 'Ĺ', 'Ô', 'Ŕ', 'DZ', 'DŽ'].includes(id))).toBe(false);
  await pressAnswerById(page, state.correctItemId!);
  await waitForGamePhase(page, 'answered-correctly');
  await expect(page.getByRole('status')).toContainText(CZECH_PRAISE);

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('the parent zone and custom content speak Czech', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto('/settings');
  await expect(page.getByRole('dialog', { name: 'Pro rodiče' })).toBeVisible();
  await unlockParentGate(page);

  await expect(page.getByRole('link', { name: /Nastavení her/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Doporučit přátelům/ })).toBeVisible();

  await page.getByRole('link', { name: /Vlastní obsah/ }).click();
  await expect(page.getByRole('heading', { name: 'Vlastní obsah' })).toBeVisible();
  await page.getByRole('tab', { name: /Slova/ }).click();
  await expect(page.getByRole('button', { name: 'Přidat slovo' })).toBeVisible();
  await expect(page.getByText('Babička')).toBeVisible();
  expectNoConsoleErrors(errors);
});
