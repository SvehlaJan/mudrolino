import { expect, test as base, type Locator, type Page } from './support/fixtures';
import { trackConsoleErrors, trackFailedRequests, expectNoConsoleErrors, expectNoFailedRequests } from './support/assertions';
import { seedSingleAssemblyWord, ASSEMBLY_JAHODA, type AssemblyE2EState } from './support/literacyHarness';
import { getE2EState } from './support/e2eHook';
import { waitForGamePhase } from './support/gameHarness';

const test = base.extend<{ cleanBrowser: void }>({
  cleanBrowser: [async ({ page }, use) => {
    const errors = trackConsoleErrors(page);
    const failures = trackFailedRequests(page);
    await use();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failures);
  }, { auto: true }],
});

async function assembly(page: Page) {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  return getE2EState<AssemblyE2EState>(page);
}

async function drag(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Missing drag geometry');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

test('reviewed home cards show only icons and descriptive names', async ({ page }) => {
  await page.goto('/');
  for (const title of ['Čítaj písmenká', 'Čítaj slabiky', 'Čítaj slová', 'Čítaj čísla', 'Spočítaj predmety', 'Skladaj slabiky']) {
    await expect(page.getByRole('link', { name: title, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId('game-card').locator('p')).toHaveCount(0);
  await expect(page.getByTestId('game-card').locator('svg')).toHaveCount(11);
});

test('settled pieces keep accessible feedback without banners', async ({ page }) => {
  await page.goto('/ui-kit?example=game-materials');
  const piece = page.getByRole('region', { name: 'Materiály hier' }).getByRole('button', { name: 'Písmeno A' });
  await expect(piece).toHaveAttribute('aria-description', 'Uložené');
  await expect(piece).toHaveText('A');
});

test('assembly tray cards are centered and a placed card fits the rail without an inner frame', async ({ page }) => {
  const state = await assembly(page);
  const tray = page.getByTestId('play-tray');
  const bounds = await tray.boundingBox();
  const boxes = await tray.locator('[data-tile-id]').evaluateAll(nodes => nodes.map(node => {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    return { left, right, top, bottom };
  }));
  expect(bounds).toBeTruthy();
  expect((Math.min(...boxes.map(b => b.left)) + Math.max(...boxes.map(b => b.right))) / 2).toBeCloseTo(bounds!.x + bounds!.width / 2, 0);
  expect((Math.min(...boxes.map(b => b.top)) + Math.max(...boxes.map(b => b.bottom))) / 2).toBeCloseTo(bounds!.y + bounds!.height / 2, 0);
  await tray.locator(`[data-tile-id="${state.trayTileIds[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  const placed = page.getByTestId('word-rail').locator('[data-tile-id]');
  const styles = await placed.evaluate(node => ({ shadow: getComputedStyle(node).boxShadow, radius: getComputedStyle(node).borderRadius, slotRadius: getComputedStyle(node.closest('li')!).borderRadius }));
  expect(styles.shadow).toBe('none');
  expect(Number.parseFloat(styles.radius)).toBe(Number.parseFloat(styles.slotRadius) - 3);
});

test('mouse dragging targets any empty slot and returns a placed syllable to the tray', async ({ page }) => {
  const state = await assembly(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');
  const id = state.correctTileOrder[2];
  await drag(page, tray.locator(`[data-tile-id="${id}"]`), rail.locator('li').nth(2));
  await expect.poll(async () => (await getE2EState<AssemblyE2EState>(page)).placedTileIds).toEqual([null, null, id]);
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  await drag(page, rail.locator(`[data-tile-id="${id}"]`), tray);
  await expect(tray.locator(`[data-tile-id="${id}"]`)).toBeVisible();
  await expect.poll(async () => (await getE2EState<AssemblyE2EState>(page)).placedTileIds).toEqual([null, null, null]);
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
});

test('invalid and cancelled drags preserve the board and remove floating pieces', async ({ page }) => {
  const state = await assembly(page);
  const tray = page.getByTestId('play-tray');
  const tile = tray.locator(`[data-tile-id="${state.trayTileIds[0]}"]`);
  await drag(page, tile, page.getByTestId('picture-card'));
  await expect(tile).toBeVisible();
  expect((await getE2EState<AssemblyE2EState>(page)).placedTileIds).toEqual([null, null, null]);
  const box = await tile.boundingBox();
  await page.mouse.move(box!.x + 10, box!.y + 10);
  await page.mouse.down();
  await page.mouse.move(box!.x + 50, box!.y - 30);
  await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
  await tile.dispatchEvent('pointercancel', { pointerId: 1 });
  await page.mouse.up();
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  await expect(tile).toBeVisible();
  expect((await getE2EState<AssemblyE2EState>(page)).placedTileIds).toEqual([null, null, null]);
});

test('touch dragging completes a word with the same answer contract', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await assembly(page);
  const client = await page.context().newCDPSession(page);
  for (const [index, id] of state.correctTileOrder.entries()) {
    const source = await page.getByTestId('play-tray').locator(`[data-tile-id="${id}"]`).boundingBox();
    const target = await page.getByTestId('word-rail').locator('li').nth(index).boundingBox();
    if (!source || !target) throw new Error('Missing touch geometry');
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: source.x + source.width / 2, y: source.y + source.height / 2 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 2 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    if (index < 2) await waitForGamePhase(page, 'awaiting-answer');
  }
  await waitForGamePhase(page, 'answered-correctly');
  expect((await getE2EState<AssemblyE2EState>(page)).totalTaps).toBe(1);
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
});

test('an occupied drop target preserves both syllables, and replay cancels an active drag', async ({ page }) => {
  const state = await assembly(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');
  const [first, second] = state.correctTileOrder;
  await drag(page, tray.locator(`[data-tile-id="${first}"]`), rail.locator('li').first());
  await waitForGamePhase(page, 'awaiting-answer');
  await drag(page, tray.locator(`[data-tile-id="${second}"]`), rail.locator('li').first());
  expect((await getE2EState<AssemblyE2EState>(page)).placedTileIds).toEqual([first, null, null]);
  await expect(tray.locator(`[data-tile-id="${second}"]`)).toBeVisible();
  const tile = tray.locator(`[data-tile-id="${second}"]`);
  const box = await tile.boundingBox();
  await page.mouse.move(box!.x + 10, box!.y + 10);
  await page.mouse.down();
  await page.mouse.move(box!.x + 50, box!.y - 30);
  await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Zopakovať zadanie' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  await page.mouse.up();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(tile).toBeVisible();
  expect((await getE2EState<AssemblyE2EState>(page)).placedTileIds).toEqual([first, null, null]);
});

test('dragging with reduced motion lands immediately without stale flights', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = await assembly(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');
  const id = state.correctTileOrder[1];
  await drag(page, tray.locator(`[data-tile-id="${id}"]`), rail.locator('li').nth(1));
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(rail.locator(`[data-tile-id="${id}"]`)).toBeVisible();
  await expect(rail.locator(`[data-tile-id="${id}"]`)).toBeEnabled();
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  await drag(page, rail.locator(`[data-tile-id="${id}"]`), tray);
  await expect(tray.locator(`[data-tile-id="${id}"]`)).toBeVisible();
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
});

test('native touch cancellation leaves the next Back click operable', async ({ page }) => {
  const state = await assembly(page);
  const tile = page.getByTestId('play-tray').locator(`[data-tile-id="${state.trayTileIds[0]}"]`);
  const box = await tile.boundingBox();
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box!.x + 10, y: box!.y + 10 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box!.x + 50, y: box!.y - 30 }] });
  await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
  await client.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Späť', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
});
