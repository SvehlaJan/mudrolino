import { expect, test } from './support/fixtures';
import { expectMinimumTarget } from './support/layoutAssertions';
import { getE2EState } from './support/e2eHook';
import { clearAudioEvents, getAudioEvents, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import { AssemblyE2EState, ASSEMBLY_JAHODA, ASSEMBLY_MAMA, seedSingleAssemblyWord, expectEventsInOrder } from './support/literacyHarness';

test('Skladaj uses the shared literacy shell with a tap-to-place felt tray and word rail', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skladaj' })).toBeVisible();
  await expect(page.getByText('Usporiadaj slabiky')).toBeVisible();
  await expect(page.getByTestId('picture-card')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();

  const tray = page.getByTestId('play-tray');
  await expect(tray).toBeVisible();
  const trayButtons = tray.locator('[data-tile-id]');
  await expect(trayButtons).toHaveCount(3);
  await expect(trayButtons.first()).toHaveAttribute('data-material', 'felt');
  await expectMinimumTarget(page, trayButtons.first(), 48);

  const rail = page.getByTestId('word-rail');
  await expect(rail).toBeVisible();
  await expect(rail.locator('[data-slot-state="pending"]')).toHaveCount(3);
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);

  const state = await getE2EState<AssemblyE2EState>(page);
  expect(state.gameId).toBe('ASSEMBLY');
  expect(state.trayTileIds).toHaveLength(3);
  expect(new Set(state.trayTileIds).size).toBe(3);
  expect(state.correctTileOrder).toHaveLength(3);
  expect(new Set(state.correctTileOrder)).toEqual(new Set(state.trayTileIds));
});

test('Skladaj fills the first open rail slot on a tray tap and returns the exact tile on a rail tap', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const firstTileId = state.trayTileIds[0];
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${firstTileId}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(1);
  await expect(rail.locator(`[data-tile-id="${firstTileId}"]`)).toHaveCount(1);
  await expect(tray.locator(`[data-tile-id="${firstTileId}"]`)).toHaveCount(0);

  const midState = await getE2EState<AssemblyE2EState>(page);
  expect(midState.roundsPlayed).toBe(0);
  expect(midState.totalTaps).toBe(0);

  await rail.locator(`[data-tile-id="${firstTileId}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await expect(tray.locator(`[data-tile-id="${firstTileId}"]`)).toHaveCount(1);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);
});

test('Skladaj settles a correct full rail before success, speaking the final syllable once before praise', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${state.correctTileOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${state.correctTileOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await clearAudioEvents(page);
  await tray.locator(`[data-tile-id="${state.correctTileOrder[2]}"]`).click();
  await waitForGamePhase(page, 'answered-correctly');

  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(3);
  await expect(page.getByRole('status')).toBeVisible();

  // Phase advances on ANSWER_CORRECT before the praise verdict audio is awaited — wait for both
  // the selection clip (2 events) and the praise clip (2 events) to actually land.
  await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(4);
  const events = await getAudioEvents(page);
  expectEventsInOrder(events, [
    /^start:sk\/syllables\//,
    /^finish:sk\/syllables\//,
    /^start:sk\/praise\//,
    /^finish:sk\/praise\//,
  ]);
  expect(events.filter((e) => e.startsWith('start:sk/syllables/'))).toHaveLength(1);

  const finalState = await getE2EState<AssemblyE2EState>(page);
  expect(finalState.roundsPlayed).toBe(1);
  expect(finalState.totalTaps).toBe(1);
});

test('Skladaj announces retry without a visible banner on a wrong full rail, plays its special sequence once, then returns every tile without counting a completed round', async ({ page }) => {
  await stubAudioPlayback(page);
  await stubSpeechSynthesis(page);
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const wrongOrder = [second, first, third];
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');
  const status = page.getByRole('status');

  await tray.locator(`[data-tile-id="${wrongOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${wrongOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  await clearAudioEvents(page);
  await tray.locator(`[data-tile-id="${wrongOrder[2]}"]`).click();
  await waitForGamePhase(page, 'answered-incorrectly');

  await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
  await expect(status).toContainText('Skús ešte raz');

  // The documented exception: exactly the wrong syllable, then retry, then the target word —
  // no immediate selected-syllable call precedes this sequence, and nothing duplicates it.
  await expect.poll(async () => (await getAudioEvents(page)).length).toBeGreaterThanOrEqual(6);
  const events = await getAudioEvents(page);
  expectEventsInOrder(events, [
    /^start:sk\/syllables\//,
    /^finish:sk\/syllables\//,
    'start:sk/phrases/skus-to-znova',
    'finish:sk/phrases/skus-to-znova',
    'start:sk/words/jahoda',
    'finish:sk/words/jahoda',
  ]);
  expect(events.filter((e) => e.startsWith('start:sk/syllables/'))).toHaveLength(1);

  const midState = await getE2EState<AssemblyE2EState>(page);
  expect(midState.roundsPlayed).toBe(0);
  expect(midState.totalTaps).toBe(1);

  await waitForGamePhase(page, 'awaiting-answer');
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);
  await expect(rail.locator('[data-slot-state="pending"]')).toHaveCount(3);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);

  const finalState = await getE2EState<AssemblyE2EState>(page);
  expect(finalState.roundsPlayed).toBe(0);
});

test('Skladaj keeps repeated syllables independently operable by stable tile ID', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_MAMA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  expect(state.trayTileIds).toHaveLength(2);
  const [tileA, tileB] = state.trayTileIds;

  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  await tray.locator(`[data-tile-id="${tileA}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(rail.locator(`[data-tile-id="${tileA}"]`)).toHaveCount(1);
  await expect(tray.locator(`[data-tile-id="${tileB}"]`)).toHaveCount(1);

  // Returning tile A must not disturb tile B, which stays independently available by its own id.
  await rail.locator(`[data-tile-id="${tileA}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(tray.locator(`[data-tile-id="${tileA}"]`)).toHaveCount(1);
  await expect(tray.locator(`[data-tile-id="${tileB}"]`)).toHaveCount(1);
  await expect(rail.locator('[data-slot-state="filled"]')).toHaveCount(0);

  // Placing B before A still completes the word correctly — both tiles carry the same text.
  await tray.locator(`[data-tile-id="${tileB}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${tileA}"]`).click();
  await waitForGamePhase(page, 'answered-correctly');

  await expect(rail.locator(`[data-tile-id="${tileB}"]`)).toHaveCount(1);
  await expect(rail.locator(`[data-tile-id="${tileA}"]`)).toHaveCount(1);
});

test('Skladaj tray and rail form two independent roving-tabstop keyboard groups', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');
  const rail = page.getByTestId('word-rail');

  const trayButtons = tray.locator('[data-tile-id]');
  await trayButtons.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(trayButtons.nth(1)).toBeFocused();

  await tray.locator(`[data-tile-id="${state.correctTileOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${state.correctTileOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');

  const railButtons = rail.locator('[data-tile-id]');
  await expect(railButtons).toHaveCount(2);
  await railButtons.first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(railButtons.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await expect(railButtons.first()).toBeFocused();

  // Returning the focused rail tile restores logical focus to it back in the tray.
  await page.keyboard.press('Enter');
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(tray.locator(`[data-tile-id="${state.correctTileOrder[0]}"]`)).toBeFocused();
});

test('Skladaj reaches the correct final board under reduced motion with no stale floating tiles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');

  for (const tileId of state.correctTileOrder) {
    await tray.locator(`[data-tile-id="${tileId}"]`).click();
    await page.waitForFunction(
      () => window.__E2E__?.gamePhase !== 'resolving-answer',
      undefined,
      { polling: 20 },
    );
  }
  await waitForGamePhase(page, 'answered-correctly');

  await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(3);

  // Reduced motion never clones a tile — every id must appear exactly once in the live DOM.
  const ids = await page.locator('[data-tile-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
  expect(ids).toHaveLength(3);
  expect(new Set(ids).size).toBe(3);
});

test('Skladaj leaves no stale floating tile clones after a wrong full rail resets', async ({ page }) => {
  await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
  await page.goto('/assembly');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const tray = page.getByTestId('play-tray');

  for (const tileId of [second, first, third]) {
    await tray.locator(`[data-tile-id="${tileId}"]`).click();
    await page.waitForFunction(
      () => window.__E2E__?.gamePhase !== 'resolving-answer',
      undefined,
      { polling: 20 },
    );
  }

  // The automatic retry -> reset cycle settles the board back to a full tray; poll past the
  // GSAP flight duration so no floating clone is still mid-flight when nodes are counted.
  await waitForGamePhase(page, 'awaiting-answer');
  await expect.poll(() => page.locator('[data-tile-id]').count()).toBe(3);
  const ids = await page.locator('[data-tile-id]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-tile-id')));
  expect(new Set(ids).size).toBe(3);
  await expect(tray.locator('[data-tile-id]')).toHaveCount(3);
});
