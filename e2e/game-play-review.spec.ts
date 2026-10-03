import { expect, test, type Locator } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { waitForGamePhase } from './support/gameHarness';
import { GAME_DEFINITIONS } from '../src/shared/gameCatalog';

async function expectUnclippedShadows(controls: Locator) {
  const clipping = await controls.evaluateAll(elements => elements.flatMap(element => {
    const box = element.getBoundingClientRect();
    const problems: string[] = [];
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      const bounds = parent.getBoundingClientRect();
      if (['auto', 'hidden', 'scroll', 'clip'].includes(style.overflowY) && box.bottom + 5 > bounds.bottom + 1) {
        problems.push(`${element.getAttribute('aria-label')}: bottom shadow clipped by ${parent.getAttribute('role') ?? parent.tagName}`);
      }
    }
    return problems;
  }));
  expect(clipping).toEqual([]);
}

for (const { path } of GAME_DEFINITIONS) {
  test(`visual roles: ${path} has raised answers and flat task content @geometry`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('hrave-ucenie-settings', JSON.stringify({
      compareMode: 'objects', additionRepresentation: 'objects', additionSumRange: 5,
    })));
    await page.goto(path);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    const answers = page.getByTestId('game-answer-region').locator('button');
    await expect(answers.first()).toBeVisible();
    const styles = await answers.evaluateAll(buttons => buttons.map(button => {
      const css = getComputedStyle(button);
      const box = button.getBoundingClientRect();
      return { radius: parseFloat(css.borderTopLeftRadius), shadow: css.boxShadow,
        width: box.width, height: box.height, fill: css.backgroundColor,
        borderWidths: [css.borderTopWidth, css.borderRightWidth, css.borderBottomWidth, css.borderLeftWidth],
        borderStyle: css.borderTopStyle };
    }));
    for (const style of styles) {
      expect(style.radius).toBe(22);
      expect(style.radius).toBeLessThan(Math.min(style.width, style.height) / 2);
      expect(style.shadow).toContain('0px 5px');
      expect(style.fill).toBe('rgb(255, 255, 255)');
      expect(style.borderWidths).toEqual(['1px', '1px', '1px', '1px']);
      expect(style.borderStyle).toBe('solid');
      expect(style.width).toBeGreaterThanOrEqual(48);
      expect(style.height).toBeGreaterThanOrEqual(48);
    }
    await expectUnclippedShadows(answers);

    if (['/counting', '/compare', '/addition'].includes(path)) {
      await expect(page.locator('[data-material="counter"]').first()).toBeVisible();
    }
    for (const task of await page.locator('[data-material="counter"], [data-testid="word-rail"], [data-testid="picture-card"]').all()) {
      await expect(task).toHaveCSS('box-shadow', 'none');
    }
    for (const picture of await page.getByTestId('picture-card').getByRole('img').all()) {
      await expect(picture).toHaveCSS('box-shadow', 'none');
      const shape = await picture.evaluate(element => {
        const box = element.getBoundingClientRect();
        return { width: box.width, height: box.height, radius: parseFloat(getComputedStyle(element).borderTopLeftRadius) };
      });
      expect(Math.abs(shape.width - shape.height)).toBeLessThanOrEqual(1);
      expect(shape.radius).toBeGreaterThanOrEqual(shape.width / 2);
    }
  });
}

test('visual roles: Assembly placed tiles remain raised operable answers @geometry', async ({ page }) => {
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  const state = await getE2EState<{ correctTileOrder: string[] }>(page);
  await page.getByTestId('play-tray').locator(`[data-tile-id="${state.correctTileOrder[0]}"]`).click();
  const placed = page.getByTestId('word-rail').getByRole('button').first();
  await expect(placed).toBeVisible();
  await expect(placed).toBeEnabled();
  expect(await placed.evaluate(element => getComputedStyle(element).boxShadow)).toContain('0px 5px');
  await expectUnclippedShadows(placed);
  await placed.click();
  await expect(page.getByTestId('word-rail').getByRole('button')).toHaveCount(0);
});

test('review: number answers keep retry feedback off the card', async ({ page }) => {
  await page.setViewportSize({ width: 1107, height: 853 });
  await page.goto('/numbers');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const state = await getE2EState<{ correctItemId: string; gridItemIds: string[] }>(page);
  const wrong = state.gridItemIds.find(id => id !== state.correctItemId)!;
  const tile = page.locator(`[data-answer-id=${JSON.stringify(wrong)}]`);
  await tile.click();
  await page.waitForFunction(() => window.__E2E__?.gamePhase === 'answered-incorrectly', undefined, { polling: 10 });
  expect(await tile.textContent()).not.toContain('Skús ešte raz');
  await expect(page.getByTestId('game-retry-status')).toContainText('Skús ešte raz');
});

test('review: ten counting items remain tappable at narrow and short sizes', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ countingRange: { start: 1, end: 10 } })));
  await page.goto('/counting');
  await page.evaluate(() => { let first = true; Math.random = () => { if (first) { first = false; return 0; } return 0.999; }; });
  await page.getByRole('button', { name: 'Hrať' }).click();
  for (const viewport of [{ width: 320, height: 568 }, { width: 667, height: 375 }]) {
    await page.setViewportSize(viewport);
    const counters = page.getByRole('button', { name: /^Predmet \d+ z 10$/ });
    await expect(counters).toHaveCount(10);
    for (const counter of await counters.all()) {
      const box = await counter.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(48);
      expect(box!.height).toBeGreaterThanOrEqual(48);
    }
  }
});

for (const route of ['/counting', '/compare']) {
  test(`review: ${route} answer shadows are not cut off`, async ({ page }) => {
    await page.setViewportSize({ width: 1107, height: 853 });
    await page.goto(route);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    await expectUnclippedShadows(page.locator('[data-testid="game-answer-region"] > button'));
  });

  test(`review: ${route} has scattered stable counters and complete answer shadows`, async ({ page }) => {
    await page.setViewportSize({ width: 1107, height: 853 });
    await page.addInitScript(() => {
      localStorage.setItem('hrave-ucenie-settings', JSON.stringify({ countingRange: { start: 1, end: 5 }, compareRange: { start: 1, end: 5 }, compareMode: 'objects' }));
    });
    await page.goto(route);
    await page.evaluate(path => {
      let calls = 0;
      Math.random = path === '/counting'
        ? () => calls++ === 0 ? 0 : 0.999999
        : () => calls++ === 0 ? 0.999999 : 0;
    }, route);
    await page.getByRole('button', { name: 'Hrať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    const tray = page.locator('[data-quantity-mode="objects"]').first();
    const tokens = tray.locator('[data-quantity-token]');
    await expect(tokens).not.toHaveCount(0);
    const positions = () => tokens.evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, size: box.width };
    }));
    const before = await positions();
    expect(new Set(before.map(position => position.y)).size).toBe(before.length);
    if (route === '/counting') await tokens.first().click();
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeEnabled();
    await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    await expect.poll(positions).toEqual(before);
    const state = await getE2EState<{ correctItemId?: string; optionValues?: number[]; correctSide?: 'left' | 'right' }>(page);
    const wrong = route === '/counting'
      ? page.locator(`[data-answer-id="${state.optionValues!.find(value => String(value) !== state.correctItemId)}"]`)
      : page.locator(`[data-answer-side="${state.correctSide === 'left' ? 'right' : 'left'}"]`);
    await wrong.click();
    await expect(page.getByTestId('game-retry-status')).toContainText('Skús');
    await waitForGamePhase(page, 'awaiting-answer');
    await expect.poll(positions).toEqual(before);
    await expectUnclippedShadows(page.locator('[data-testid="game-answer-region"] > button'));
  });
}
