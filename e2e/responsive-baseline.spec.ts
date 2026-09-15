import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { unlockParentGate } from './support/parentGate';
import {
  expectNoHorizontalOverflow,
  expectMinimumTarget,
} from './support/layoutAssertions';
import {
  CANONICAL_VIEWPORTS,
  CanonicalViewportName,
} from './support/viewports';

const KEY_VIEWPORTS: CanonicalViewportName[] = [
  'narrowPhone',
  'smallPhone',
  'phonePortrait',
  'shortLandscape',
  'phoneLandscape',
  'tabletPortrait',
  'desktop',
];

test.describe('Responsive Baseline Layout', () => {
  for (const viewportName of KEY_VIEWPORTS) {
    const viewport = CANONICAL_VIEWPORTS[viewportName];

    test(`/settings gate and post-unlock at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);

      await page.setViewportSize(viewport);
      await page.goto('/settings');

      // 1. Verify gate layout and touch targets
      await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      for (let digit = 0; digit <= 9; digit++) {
        const button = page.getByRole('button', { name: String(digit), exact: true });
        await expectMinimumTarget(page, button, 44);
      }

      const backspaceBtn = page.getByRole('button', { name: 'Zmazať' });
      await expectMinimumTarget(page, backspaceBtn, 44);

      const confirmBtn = page.getByRole('button', { name: 'Potvrdiť' });
      await expectMinimumTarget(page, confirmBtn, 44);

      // 2. Unlock gate and verify post-unlock layout
      await unlockParentGate(page);
      await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }
});
