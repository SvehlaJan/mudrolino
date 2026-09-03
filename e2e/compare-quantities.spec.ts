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

interface CompareE2EState extends E2EGlobalState {
  correctSide: 'left' | 'right' | null;
  wrongSide: 'left' | 'right' | null;
}

const SIDE_LABEL: Record<'left' | 'right', string> = {
  left: 'Ľavá skupina',
  right: 'Pravá skupina',
};

function otherSide(side: 'left' | 'right'): 'left' | 'right' {
  return side === 'left' ? 'right' : 'left';
}

test('compare quantities: correct tap reaches the success overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('button', { name: SIDE_LABEL.left })).toBeVisible();

  const state = await getE2EState<CompareE2EState>(page);
  expect(state.correctSide, 'expected an active round').not.toBeNull();
  await page.getByRole('button', { name: SIDE_LABEL[state.correctSide!] }).click();
  await waitForOverlay(page, 'success');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('compare quantities: wrong tap disables that pile and lets the child self-correct', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('button', { name: SIDE_LABEL.left })).toBeVisible();

  const state = await getE2EState<CompareE2EState>(page);
  expect(state.correctSide, 'expected an active round').not.toBeNull();
  const wrong = otherSide(state.correctSide!);

  const wrongButton = page.getByRole('button', { name: SIDE_LABEL[wrong] });
  await wrongButton.click();
  await expect(wrongButton).toBeDisabled();

  const correctButton = page.getByRole('button', { name: SIDE_LABEL[state.correctSide!] });
  await expect(correctButton).toBeEnabled();
  await correctButton.click();
  await waitForOverlay(page, 'success');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
