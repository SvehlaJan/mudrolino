import { expect, test, type Locator, type Page } from './support/fixtures';
import { seedLocalStorage } from './support/persistenceFixtures';
import { stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';

const WORD = { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' };
const LONG_SYLLABLE_WORD = { word: 'Dlhý strom', syllables: 'dlo-hý-stro', emoji: '🌳', audioKey: 'dlhy-strom' };
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'narrow phone', width: 320, height: 568 },
  { name: 'short landscape', width: 667, height: 375 },
];
const LONG_LABEL_VIEWPORTS = [
  { name: 'narrow phone', width: 320, height: 568 },
  { name: 'short landscape', width: 667, height: 375 },
  { name: 'phone landscape', width: 844, height: 390 },
];

async function seedWord(page: Page, word = WORD) {
  await stubSpeechSynthesis(page);
  await stubAudioPlayback(page);
  await seedLocalStorage(page, {
    'hrave-ucenie-seeded-sk': 'true',
    'hrave-ucenie-user-words-sk': {
      version: 2,
      items: [{
        id: 'e2e-assembly-layout', ...word, status: 'ready', enabled: true,
        isDefault: false, locale: 'sk', order: 0,
      }],
    },
  });
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByTestId('word-rail')).toBeVisible();
}

async function expectLabelInsideTile(label: Locator, context: string) {
  const geometry = await label.evaluate((element) => {
    const tile = element.closest('[data-tile-id]');
    if (!tile) throw new Error('Assembly label is missing its tile');
    const tileRect = tile.getBoundingClientRect();
    const labelRect = element.getBoundingClientRect();
    return {
      tileLeft: tileRect.left,
      tileRight: tileRect.right,
      tileTop: tileRect.top,
      tileBottom: tileRect.bottom,
      labelLeft: labelRect.left,
      labelRight: labelRect.right,
      labelTop: labelRect.top,
      labelBottom: labelRect.bottom,
    };
  });
  expect(geometry.labelLeft, `${context}: label extends left of tile`).toBeGreaterThanOrEqual(geometry.tileLeft - 0.5);
  expect(geometry.labelRight, `${context}: label extends right of tile`).toBeLessThanOrEqual(geometry.tileRight + 0.5);
  expect(geometry.labelTop, `${context}: label extends above tile`).toBeGreaterThanOrEqual(geometry.tileTop - 0.5);
  expect(geometry.labelBottom, `${context}: label extends below tile`).toBeLessThanOrEqual(geometry.tileBottom + 0.5);
}

async function rect(locator: Locator) {
  return locator.evaluate((element) => {
    const { x, y, width, height } = element.getBoundingClientRect();
    return { x, y, width, height };
  });
}

function expectSameRect(actual: Awaited<ReturnType<typeof rect>>, expected: Awaited<ReturnType<typeof rect>>) {
  expect(actual.x).toBeCloseTo(expected.x, 0);
  expect(actual.y).toBeCloseTo(expected.y, 0);
  expect(actual.width).toBeCloseTo(expected.width, 0);
  expect(actual.height).toBeCloseTo(expected.height, 0);
}

for (const viewport of VIEWPORTS) {
  test(`assembly keeps board geometry stable while cards fit their destination at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedWord(page);

    const tray = page.getByTestId('play-tray');
    const rail = page.getByTestId('word-rail');
    await waitForGamePhase(page, 'awaiting-answer');
    const trayTile = tray.locator('[data-tile-id]').first();
    const tileId = await trayTile.getAttribute('data-tile-id');
    expect(tileId).toBeTruthy();
    const selectedTrayIndex = await trayTile.getAttribute('data-tray-index');
    const initialTiles = tray.locator('[data-tray-index]');
    await expect(initialTiles).toHaveCount(3);
    const sourceOrder = await initialTiles.evaluateAll((items) => items.map((item) => item.getAttribute('data-tray-index')));
    const trayRects = await initialTiles.evaluateAll((items) => items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }));
    const answerRect = await rect(tray.locator('[data-testid="game-answer-region"]'));
    const railRect = await rect(rail);
    const initialSlots = rail.locator('li[data-slot-state]');
    const slotRects = await initialSlots.evaluateAll((items) => items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }));
    const sourceLabel = trayTile.locator('span').first();
    const sourceStyle = await sourceLabel.evaluate((element) => {
      const style = getComputedStyle(element);
      return { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
    });
    const sourceRect = await rect(trayTile);
    expect(sourceRect.width, 'tray answer remains square before the morph').toBeCloseTo(sourceRect.height, 0);
    const sourceFontSize = Number.parseFloat(sourceStyle.fontSize);
    expect(sourceFontSize).toBeGreaterThanOrEqual(16);
    expect(sourceFontSize).toBeLessThanOrEqual(32);
    if (viewport.name === 'desktop') expect(sourceFontSize).toBeGreaterThanOrEqual(24);

    await trayTile.click({ force: true });
    await page.waitForFunction((id) => {
      const state = (window as typeof window & { __E2E__?: { placedTileIds?: string[] } }).__E2E__;
      return state?.placedTileIds?.includes(id) ?? false;
    }, tileId!);
    await waitForGamePhase(page, 'awaiting-answer');

    await expect(tray.locator('[data-tray-index]')).toHaveCount(3);
    // Moved source location persists as a decorative, hidden cell with no button target.
    const movedSource = tray.locator('[data-answer-layout-placeholder="true"]');
    await expect(movedSource).toHaveCount(1);
    await expect(movedSource).toHaveAttribute('data-tray-index', selectedTrayIndex!);
    await expect(movedSource).toHaveAttribute('aria-hidden', 'true');
    await expect(movedSource.locator('button')).toHaveCount(0);
    const placeholderStyle = await movedSource.evaluate((element) => {
      const style = getComputedStyle(element);
      return { borderStyle: style.borderStyle, backgroundColor: style.backgroundColor };
    });
    expect(placeholderStyle.borderStyle).toBe('dashed');
    expect(placeholderStyle.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(await tray.locator('[data-tray-index]').evaluateAll((items) => items.map((item) => item.getAttribute('data-tray-index')))).toEqual(sourceOrder);
    const placedTile = rail.locator(`[data-tile-id="${tileId}"]`);
    await expect(placedTile).toBeVisible();
    const filledStyle = await placedTile.locator('span').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
    });
    expect(filledStyle).toEqual(sourceStyle);
    const filledRect = await rect(placedTile);
    const filledSlotRect = await rect(placedTile.locator('..'));
    expect(filledRect.x, 'placed syllable should align with its rail cell').toBeCloseTo(filledSlotRect.x, 0);
    expect(filledRect.y, 'placed syllable should align with its rail cell').toBeCloseTo(filledSlotRect.y, 0);
    expectSameRect(filledRect, filledSlotRect);
    expectSameRect(await rect(rail), railRect);
    expectSameRect(await rect(tray.locator('[data-testid="game-answer-region"]')), answerRect);
    const movedTrayRects = await tray.locator('[data-tray-index]').evaluateAll((items) => items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }));
    movedTrayRects.forEach((box, index) => expectSameRect(box, trayRects[index]));
    const movedSlots = await rail.locator('li[data-slot-state]').evaluateAll((items) => items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }));
    expect(movedSlots).toHaveLength(slotRects.length);
    movedSlots.forEach((box, index) => expectSameRect(box, slotRects[index]));

    await placedTile.click({ force: true });
    await page.waitForFunction((id) => {
      const state = (window as typeof window & { __E2E__?: { trayTileIds?: string[] } }).__E2E__;
      return state?.trayTileIds?.includes(id) ?? false;
    }, tileId!);
    await waitForGamePhase(page, 'awaiting-answer');
    await expect(tray.locator('[data-tray-index]')).toHaveCount(3);
    await expect(tray.locator(`[data-tile-id="${tileId}"]`)).toBeVisible();
    expectSameRect(await rect(rail), railRect);
    const returnedRects = await tray.locator('[data-tray-index]').evaluateAll((items) => items.map((item) => {
      const { x, y, width, height } = item.getBoundingClientRect();
      return { x, y, width, height };
    }));
    returnedRects.forEach((box, index) => expectSameRect(box, trayRects[index]));

    const viewMetrics = await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewMetrics.scrollWidth, 'page should not overflow horizontally').toBeLessThanOrEqual(viewMetrics.width);
    for (const region of [rail, tray]) {
      const box = await rect(region);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewMetrics.width);
      expect(box.y + box.height).toBeLessThanOrEqual(viewMetrics.height);
    }
  });
}

for (const viewport of LONG_LABEL_VIEWPORTS) {
  test(`assembly long syllable fits tray and rail at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await seedWord(page, LONG_SYLLABLE_WORD);
    await waitForGamePhase(page, 'awaiting-answer');

    const tray = page.getByTestId('play-tray');
    const rail = page.getByTestId('word-rail');
    const trayLabel = tray.getByText('STRO', { exact: true });
    await expect(trayLabel).toBeVisible();
    await expectLabelInsideTile(trayLabel, `STRO in tray at ${viewport.name}`);

    await trayLabel.click({ force: true });
    const placedLabel = rail.getByText('STRO', { exact: true });
    await expect(placedLabel).toBeVisible();
    await expectLabelInsideTile(placedLabel, `STRO in rail at ${viewport.name}`);
  });
}

test('assembly tray keyboard navigation crosses rows with an empty indexed cell', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seedWord(page);

  const tray = page.getByTestId('play-tray');
  const answerRegion = tray.getByTestId('game-answer-region');
  await tray.locator('[data-testid="game-critical-controls"]').evaluate((element) => {
    (element as HTMLElement).style.cssText += ';width:135px!important;flex:none;align-self:center';
  });
  await expect.poll(() => answerRegion.evaluate((element) => getComputedStyle(element).getPropertyValue('--grid-cols'))).toBe('2');
  await waitForGamePhase(page, 'awaiting-answer');

  const movedId = await tray.locator('[data-tray-index="1"]').getAttribute('data-tile-id');
  const downTargetId = await tray.locator('[data-tray-index="2"]').getAttribute('data-tile-id');
  expect(movedId).toBeTruthy();
  expect(downTargetId).toBeTruthy();

  await tray.locator(`[data-tile-id="${movedId}"]`).click({ force: true });
  await page.waitForFunction((id) => {
    const state = (window as typeof window & { __E2E__?: { placedTileIds?: string[] } }).__E2E__;
    return state?.placedTileIds?.includes(id) ?? false;
  }, movedId!);
  await waitForGamePhase(page, 'awaiting-answer');

  const sourceCell = tray.locator('[data-tray-index="0"]');
  const downTarget = tray.locator(`[data-tile-id="${downTargetId}"]`);
  await sourceCell.focus();
  await sourceCell.press('ArrowDown');
  await expect(downTarget).toBeFocused();
  await downTarget.press('Enter');
  await page.waitForFunction((id) => {
    const state = (window as typeof window & { __E2E__?: { placedTileIds?: string[] } }).__E2E__;
    return state?.placedTileIds?.includes(id) ?? false;
  }, downTargetId!);
  await waitForGamePhase(page, 'awaiting-answer');

  const placedTarget = page.getByTestId('word-rail').locator(`[data-tile-id="${downTargetId}"]`);
  await placedTarget.focus();
  await placedTarget.press('Enter');
  await page.waitForFunction((id) => {
    const state = (window as typeof window & { __E2E__?: { trayTileIds?: string[] } }).__E2E__;
    return state?.trayTileIds?.includes(id) ?? false;
  }, downTargetId!);
  await expect(tray.locator(`[data-tile-id="${downTargetId}"]`)).toBeVisible();
});
