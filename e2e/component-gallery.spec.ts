import { test, expect } from './support/fixtures';
import { appComponentInventory } from '../src/shared/ui/gallery/componentInventory.generated';
import { trackConsoleErrors, trackFailedRequests, expectNoConsoleErrors, expectNoFailedRequests } from './support/assertions';

test('development gallery lists the complete source inventory and explains composed previews', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failures = trackFailedRequests(page);
  await page.goto('/ui-kit');
  const gallery = page.getByTestId('component-gallery');
  await expect(gallery.getByRole('heading', { name: 'Katalóg všetkých komponentov' })).toBeVisible();
  await expect(gallery.getByTestId('gallery-component')).toHaveCount(appComponentInventory.length);
  const actual = await gallery.getByTestId('gallery-component').evaluateAll(entries => entries.map(entry => entry.getAttribute('data-component')).sort());
  expect(actual).toEqual(appComponentInventory.map(component => component.name).sort());
  for (const name of ['WordEditor', 'RecordingListItem', 'SettingsRenderer', 'GroupedHomeScreen', 'AvatarScene', 'AssemblyPlayfield']) {
    await expect(gallery.locator(`[data-component="${name}"]`)).toHaveCount(1);
  }
  await expect(gallery.locator('[data-component="WordEditor"]')).toContainText('Kompozícia v aplikácii; bez samostatnej živej ukážky.');
  await expect(gallery.locator('[data-component="ToggleControl"]')).toContainText('Iba v zdroji');
  await expect(page.locator('canvas')).toHaveCount(0);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failures);
});

test('gallery search finds names, source and usage paths and combines with categories', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failures = trackFailedRequests(page);
  await page.goto('/ui-kit');
  const gallery = page.getByTestId('component-gallery');
  const search = gallery.getByRole('textbox', { name: 'Hľadať komponent, zdroj alebo použitie' });
  await search.fill('  tactilepiece  ');
  await expect(gallery.getByTestId('gallery-component')).toHaveCount(1);
  const piece = gallery.locator('[data-component="TactilePiece"]');
  await expect(piece).toContainText('src/shared/game/materials/TactilePiece.tsx');
  await piece.getByText('Miesta použitia', { exact: true }).click();
  await expect(piece).toContainText('src/games/assembly/AssemblyGame.tsx');
  await gallery.getByRole('combobox', { name: 'Kategória komponentov' }).selectOption('content');
  await expect(gallery.getByText('Žiadne komponenty nezodpovedajú hľadaniu.')).toBeVisible();
  await gallery.getByRole('button', { name: 'Vymazať hľadanie komponentov' }).click();
  await expect(gallery.getByTestId('gallery-component')).toHaveCount(appComponentInventory.filter(component => component.category === 'content').length);
  await search.fill('src/content/WordEditor.tsx');
  await expect(gallery.locator('[data-component="WordEditor"]')).toHaveCount(1);
  await search.fill('src/content/CustomContentScreen.tsx');
  await expect(gallery.locator('[data-component="WordEditor"]')).toHaveCount(1);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failures);
});

test('gallery opens the preserved task and answer material demo', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failures = trackFailedRequests(page);
  await page.goto('/ui-kit');
  const gallery = page.getByTestId('component-gallery');
  await gallery.getByRole('textbox', { name: 'Hľadať komponent, zdroj alebo použitie' }).fill('TactilePiece');
  await gallery.getByRole('link', { name: 'Živá ukážka materiálov' }).click();
  await expect(page).toHaveURL('/ui-kit?example=game-materials');
  await expect(page.getByTestId('ui-materials-task').locator('[data-visual-role="task"]')).toHaveCount(6);
  await expect(page.getByTestId('ui-materials-answer').locator('[data-visual-role="answer"]')).toHaveCount(6);
  await page.getByRole('button', { name: 'Písmeno A' }).click();
  await expect(page.getByTestId('ui-piece-press-count')).toHaveText('1');
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failures);
});


test('gallery preview links lead to the named native controls in their actual demo section', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failures = trackFailedRequests(page);
  await page.goto('/ui-kit');
  const gallery = page.getByTestId('component-gallery');
  const search = gallery.getByRole('textbox', { name: 'Hľadať komponent, zdroj alebo použitie' });

  for (const [component, controlName] of [['BackButton', 'Späť'], ['IconMenuButton', 'Ďalšie možnosti']]) {
    await search.fill(component);
    const entry = gallery.locator(`[data-component="${component}"]`);
    const link = entry.getByRole('link', { name: 'Živá ukážka na tejto stránke' });
    const target = await link.getAttribute('href');
    expect(target).toMatch(/^#ui-demo-/);
    await link.click();
    const demo = page.locator(target!);
    const control = demo.getByRole('button', { name: controlName, exact: true }).last();
    await expect(control).toBeVisible();
    await control.focus();
    await expect(control).toBeFocused();
    if (component === 'IconMenuButton') {
      await control.press('Enter');
      await expect(page.getByRole('menuitem', { name: 'Zmazať slovo' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(control).toBeFocused();
    }
  }

  await search.fill('AutosaveNotice');
  const notice = gallery.locator('[data-component="AutosaveNotice"]');
  await expect(notice.getByRole('link', { name: /Živá ukážka/ })).toHaveCount(0);
  await expect(notice.getByRole('link', { name: 'Otvoriť rodičovský priebeh' })).toHaveAttribute('href', '/settings/app');
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failures);
});
