import { test, expect, type Locator, type Page } from './support/fixtures';
import { trackConsoleErrors, expectNoConsoleErrors, trackFailedRequests, expectNoFailedRequests } from './support/assertions';
import { unlockParentGate } from './support/parentGate';
import { expectNoHorizontalOverflow, expectMinimumTarget, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { INTEGRATION_VIEWPORTS } from './support/viewports';

const viewportEntries = Object.entries(INTEGRATION_VIEWPORTS) as Array<[
  keyof typeof INTEGRATION_VIEWPORTS,
  (typeof INTEGRATION_VIEWPORTS)[keyof typeof INTEGRATION_VIEWPORTS],
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
        await expectWithinViewport(page, button);
        keypadButtons.push(button);
      }
      const backButton = page.getByRole('button', { name: 'Späť', exact: true });
      const backspaceButton = page.getByRole('button', { name: 'Zmazať' });
      const confirmButton = page.getByRole('button', { name: 'Potvrdiť' });
      await expectMinimumTarget(page, backButton, 44);
      await expectWithinViewport(page, backButton);
      await expectMinimumTarget(page, backspaceButton, 44);
      await expectWithinViewport(page, backspaceButton);
      await expectMinimumTarget(page, confirmButton, 44);
      await expectWithinViewport(page, confirmButton);
      keypadButtons.push(backspaceButton, confirmButton);
      await expectNoPairwiseOverlap(keypadButtons);

      await unlockParentGate(page);
      await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await assertReachableAction(page, page.getByRole('link', { name: /^Vlastný obsah/ }));
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

      const wordsTab = page.getByRole('tab', { name: /Slová/ });
      await expectMinimumTarget(page, wordsTab, 44);
      await wordsTab.scrollIntoViewIfNeeded();
      await wordsTab.click();
      await assertReachableAction(page, page.getByRole('button', { name: 'Pridať slovo', exact: true }));

      const praiseTab = page.getByRole('tab', { name: /Pochvaly/ });
      await praiseTab.scrollIntoViewIfNeeded();
      await expectMinimumTarget(page, praiseTab, 44);
      await praiseTab.click();
      await assertReachableAction(page, page.getByRole('button', { name: 'Pridať pochvalu', exact: true }));
      expectNoConsoleErrors(errors);
      expectNoFailedRequests(failedRequests);
    });
  }
});
