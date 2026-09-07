import { test, expect } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
  waitForOverlay,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

interface AdditionE2EState extends E2EGlobalState {
  correctSum: number | null;
  optionValues: number[];
}

async function tapCorrectOption(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<AdditionE2EState>(page);
  expect(state.correctSum, 'expected an active round').not.toBeNull();
  await page.getByRole('button', { name: String(state.correctSum), exact: true }).click();
}

async function tapWrongOption(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<AdditionE2EState>(page);
  const wrongValue = state.optionValues.find((v) => v !== state.correctSum);
  expect(wrongValue, 'expected at least one distractor option').toBeDefined();
  await page.getByRole('button', { name: String(wrongValue), exact: true }).click();
}

test('addition: correct answer reaches the success overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/addition');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await tapCorrectOption(page);
  await waitForOverlay(page, 'success');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('addition: three wrong answers reach the failure overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/addition');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await tapWrongOption(page);
  await tapWrongOption(page);
  await tapWrongOption(page);
  await waitForOverlay(page, 'failure');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
