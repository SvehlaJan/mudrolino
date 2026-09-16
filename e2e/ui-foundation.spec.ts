import { test, expect } from '@playwright/test';

test.describe('UI foundation: core controls', () => {
  test('core controls expose semantic states and minimum sizes', async ({ page }) => {
    await page.goto('/ui-kit');
    const child = page.getByTestId('ui-child-primary');
    const parent = page.getByTestId('ui-parent-neutral');
    await expect(child).toHaveAttribute('data-tone', 'primary');
    await expect(parent).toHaveAttribute('data-tone', 'neutral');
    const childBox = await child.boundingBox();
    const parentBox = await parent.boundingBox();
    expect(childBox!.width).toBeGreaterThanOrEqual(48);
    expect(childBox!.height).toBeGreaterThanOrEqual(48);
    expect(parentBox!.width).toBeGreaterThanOrEqual(44);
    expect(parentBox!.height).toBeGreaterThanOrEqual(44);
  });

  test('choice tile selection and feedback states use semantics, not color alone', async ({ page }) => {
    await page.goto('/ui-kit');
    const selected = page.getByTestId('ui-choice-selected');
    const correct = page.getByTestId('ui-choice-correct');
    const wrong = page.getByTestId('ui-choice-wrong');

    await expect(selected).toHaveAttribute('aria-pressed', 'true');
    await expect(correct.getByTestId('choice-tile-correct-icon')).toBeVisible();
    await expect(wrong.getByTestId('choice-tile-wrong-icon')).toBeVisible();
  });

  test('prompt badge is a native button when interactive and a static surface otherwise', async ({ page }) => {
    await page.goto('/ui-kit');
    const section = page.getByRole('heading', { name: 'Prompt Badge' }).locator('..');
    const badges = section.getByTestId('prompt-badge');
    await expect(badges).toHaveCount(2);
    expect(await badges.nth(0).evaluate((el) => el.tagName)).toBe('DIV');
    expect(await badges.nth(1).evaluate((el) => el.tagName)).toBe('BUTTON');

    await badges.nth(1).focus();
    await expect(badges.nth(1)).toBeFocused();
  });

  test('legacy button variant adapter keeps rendering without new tone/size props', async ({ page }) => {
    await page.goto('/ui-kit');
    const legacyPrimary = page.getByRole('button', { name: 'Primárne' }).last();
    await expect(legacyPrimary).toBeVisible();
    await expect(legacyPrimary).toHaveAttribute('data-tone', 'primary');
  });
});
