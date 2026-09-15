import { test, expect, type Locator, type Page } from '@playwright/test';
import { trackConsoleErrors, expectNoConsoleErrors, trackFailedRequests, expectNoFailedRequests } from './support/assertions';
import { unlockParentGate } from './support/parentGate';
import { expectNoHorizontalOverflow, expectMinimumTarget, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';

const viewportEntries = Object.entries(CANONICAL_VIEWPORTS) as Array<[
  keyof typeof CANONICAL_VIEWPORTS,
  (typeof CANONICAL_VIEWPORTS)[keyof typeof CANONICAL_VIEWPORTS],
]>;

async function assertReachableAction(page: Page, action: Locator) {
  await action.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }));
  await expectMinimumTarget(page, action, 44);
  await expectWithinViewport(page, action);
}

test.describe('Responsive Baseline Layout', () => {
  for (const [viewportName, viewport] of viewportEntries) {
    test(`/settings gate and post-unlock at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);
      await page.setViewportSize(viewport);
      await page.goto('/settings');
      await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const keypadButtons: Locator[] = [];
      for (let digit = 0; digit <= 9; digit++) {
        const button = page.getByRole('button', { name: String(digit), exact: true });
        await expectMinimumTarget(page, button, 44);
        keypadButtons.push(button);
      }
      const backButton = page.getByRole('button', { name: 'Späť', exact: true });
      const backspaceButton = page.getByRole('button', { name: 'Zmazať' });
      const confirmButton = page.getByRole('button', { name: 'Potvrdiť' });
      await expectMinimumTarget(page, backButton, 44);
      await expectWithinViewport(page, backButton);
      await expectMinimumTarget(page, backspaceButton, 44);
      await expectMinimumTarget(page, confirmButton, 44);
      await expectWithinViewport(page, confirmButton);
      keypadButtons.push(backspaceButton, confirmButton);
      await expectNoPairwiseOverlap(keypadButtons);

      await unlockParentGate(page);
      await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await assertReachableAction(page, page.getByRole('button', { name: /^Vlastný obsah/ }));
      await assertReachableAction(page, page.getByRole('button', { name: 'Späť', exact: true }));
      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });

    test(`/content actions at ${viewportName} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const failedRequests = trackFailedRequests(page);
      await page.setViewportSize(viewport);
      await page.goto('/content');
      await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
      await unlockParentGate(page);
      await expect(page.getByRole('heading', { name: 'Vlastný obsah' })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const wordsTab = page.getByRole('button', { name: 'Slová', exact: true });
      await expectMinimumTarget(page, wordsTab, 44);
      await wordsTab.scrollIntoViewIfNeeded();
      await wordsTab.click();
      await assertReachableAction(page, page.getByRole('button', { name: 'Pridať slovo', exact: true }));

      const praiseTab = page.getByRole('button', { name: 'Pochvaly', exact: true });
      await praiseTab.scrollIntoViewIfNeeded();
      await expectMinimumTarget(page, praiseTab, 44);
      await praiseTab.click();
      await assertReachableAction(page, page.getByRole('button', { name: 'Pridať pochvalu', exact: true }));
      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }
});
