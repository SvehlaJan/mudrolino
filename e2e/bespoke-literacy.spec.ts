import { expect, test } from '@playwright/test';
import { expectMinimumTarget, expectNoHorizontalOverflow } from './support/layoutAssertions';

test('UI kit exposes the literacy material vocabulary', async ({ page }) => {
  await page.goto('/ui-kit');
  const section = page.getByRole('region', { name: 'Literárne materiály' });
  await expect(section.getByTestId('picture-card')).toBeVisible();
  await expect(section.getByTestId('word-rail')).toBeVisible();
  await expect(section.getByTestId('inset-slot-active')).toHaveAttribute('data-slot-state', 'active');
  await expect(section.getByTestId('inset-slot-filled')).toHaveAttribute('data-slot-state', 'filled');
  await expectMinimumTarget(page, section.getByRole('button', { name: 'Slabika MA' }), 48);
  await expectNoHorizontalOverflow(page);
});
