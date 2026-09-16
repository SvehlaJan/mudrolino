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

  test('compact density keeps the icon button at its semantic minimum tap target', async ({ page }) => {
    await page.goto('/ui-kit');
    const compactIcon = page.getByTestId('ui-icon-compact-parent');
    const box = await compactIcon.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test('a semantic size alone opts a button into the typed variant with a default tone', async ({ page }) => {
    await page.goto('/ui-kit');
    const sizeOnly = page.getByTestId('ui-child-size-only');
    await expect(sizeOnly).toHaveAttribute('data-tone', 'neutral');
    const box = await sizeOnly.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
  });
});

test.describe('UI foundation: Radix wrappers', () => {
  test('dialog traps and restores focus', async ({ page }) => {
    await page.goto('/ui-kit');
    const trigger = page.getByRole('button', { name: 'Otvoriť ukážkový dialóg' });
    await trigger.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Shift+Tab');
    await expect(page.getByRole('dialog')).toContainText('Ukážkový dialóg');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
  });

  test('alert dialog requires an explicit choice and ignores backdrop clicks', async ({ page }) => {
    await page.goto('/ui-kit');
    await page.getByRole('button', { name: 'Otvoriť potvrdenie' }).click();
    const alert = page.getByRole('alertdialog');
    await expect(alert).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(alert).toBeVisible();
    await page.getByRole('button', { name: 'Vymazať', exact: true }).click();
    await expect(alert).not.toBeVisible();
  });

  test('radio, switch, tabs and menu support keyboard contracts', async ({ page }) => {
    await page.goto('/ui-kit');
    const radio = page.getByRole('radio', { name: 'Šesť' });
    await radio.focus();
    // Radix's roving-focus radio only commits the arrow-driven selection once
    // its own keydown-tracking listener has run before keyup resets it; a bare
    // `.press()` fires both back-to-back with no task-queue turn between them.
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.up('ArrowRight');
    await expect(page.getByRole('radio', { name: 'Osem' })).toBeChecked();
    await page.getByRole('switch', { name: 'Diakritika' }).press('Space');
    await expect(page.getByRole('switch', { name: 'Diakritika' })).toBeChecked();
  });

  test('segmented choice renders as an accessible radio group, not choice-tile buttons', async ({ page }) => {
    await page.goto('/ui-kit');
    const six = page.getByRole('radio', { name: '6 kariet' });
    const eight = page.getByRole('radio', { name: '8 kariet' });
    await expect(six).toBeChecked();
    await six.focus();
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(50);
    await page.keyboard.up('ArrowRight');
    await expect(eight).toBeChecked();
  });

  test('tabs switch panels with arrow keys and move focus with them', async ({ page }) => {
    await page.goto('/ui-kit');
    const wordsTab = page.getByRole('tab', { name: 'Slová (ukážka)' });
    const praiseTab = page.getByRole('tab', { name: 'Pochvaly (ukážka)' });
    await wordsTab.focus();
    await expect(wordsTab).toHaveAttribute('data-state', 'active');
    await page.keyboard.press('ArrowRight');
    await expect(praiseTab).toHaveAttribute('data-state', 'active');
    await expect(praiseTab).toBeFocused();
    await expect(page.getByRole('tabpanel')).toContainText('Pochvaly');
  });

  test('dropdown menu opens on the trigger and closes back onto it with Escape', async ({ page }) => {
    await page.goto('/ui-kit');
    const trigger = page.getByRole('button', { name: 'Ďalšie možnosti (ukážka)' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Upraviť' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('field wrapper links label, help, and error text, and exposes required state', async ({ page }) => {
    await page.goto('/ui-kit');
    const input = page.getByLabel('Vlastné slovo');
    await expect(input).toBeVisible();
    await expect(input).toHaveAttribute('required', '');
    await expect(input).toHaveAttribute('aria-required', 'true');
    await input.fill('toto je velmi dlhe skusobne slovo pre test');
    await expect(page.getByRole('alert')).toContainText('príliš dlhé');
  });
});
