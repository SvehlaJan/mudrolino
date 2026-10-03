import { expect, test, type Page } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { waitForGamePhase } from './support/gameHarness';
import { ASSEMBLY_JAHODA, LONG_LABEL_WORDS, seedSingleLiteracyWord, type AssemblyE2EState, type CompleteLetterE2EState, type CompleteSyllableE2EState } from './support/literacyHarness';

const games = ['assembly', 'complete-letter', 'complete-syllable'] as const;

async function start(page: Page, game: typeof games[number], word?: typeof ASSEMBLY_JAHODA) {
  await seedSingleLiteracyWord(page, word ?? (game === 'complete-syllable' ? LONG_LABEL_WORDS['complete-syllable'] : ASSEMBLY_JAHODA));
  await page.goto(`/${game}`);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  const state = await getE2EState<AssemblyE2EState | CompleteLetterE2EState | CompleteSyllableE2EState>(page);
  return state.gameId === 'ASSEMBLY'
    ? page.getByTestId('play-tray').locator(`[data-tile-id="${state.correctTileOrder[0]}"]`)
    : page.locator(`[data-answer-id="${state.correctItemId}"]`);
}

for (const game of games) {
  test(`${game} visibly transfers the selected tile toward its empty question slot`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const answer = await start(page, game);
    const rail = page.getByTestId('word-rail');
    const targetIndex = await rail.locator('[data-slot-state]').evaluateAll((nodes, assembly) => nodes.findIndex((node) => node.getAttribute('data-slot-state') === (assembly ? 'pending' : 'active')), game === 'assembly');
    const target = rail.locator('[data-slot-state]').nth(targetIndex);
    const sourceRect = (await answer.boundingBox())!;
    const targetRect = (await target.boundingBox())!;
    const label = (await answer.textContent())!.trim();
    await answer.click();
    const flight = page.locator('[data-tile-flight]');
    await expect(flight).toHaveCount(1);
    await expect(flight).toBeVisible();
    await expect(flight).toContainText(label);
    await expect(flight).toHaveAttribute('aria-hidden', 'true');
    if (game !== 'assembly') expect(await answer.evaluate(node => getComputedStyle(node).visibility)).toBe('hidden');
    if (game !== 'assembly') await expect(target).toHaveAttribute('data-slot-state', 'active');
    await expect(page.getByRole('status')).toHaveCount(0);
    const samples = await flight.evaluate(async (node) => {
      const points: { x: number; y: number; width: number; height: number }[] = [];
      while (node.isConnected) {
        const rect = node.getBoundingClientRect();
        points.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      return points;
    });
    expect(samples.length).toBeGreaterThan(3);
    const distance = (rect: { x: number; y: number; width: number; height: number }) => Math.hypot(
      rect.x + rect.width / 2 - targetRect.x - targetRect.width / 2,
      rect.y + rect.height / 2 - targetRect.y - targetRect.height / 2,
    );
    expect(distance(samples[0])).toBeGreaterThan(40);
    expect(distance(samples.at(-1)!)).toBeLessThan(10);
    if (game !== 'assembly') {
      expect(samples.at(-1)!.width).toBeLessThanOrEqual(targetRect.width + 2);
      expect(samples.at(-1)!.height).toBeLessThanOrEqual(targetRect.height + 2);
    }
    expect(distance(samples.at(-1)!)).toBeLessThan(distance(sourceRect) / 4);
    await expect(flight).toHaveCount(0);
    await expect(target).toHaveAttribute('data-slot-state', 'filled');
    expect((await target.textContent())!.trim().toUpperCase()).toBe(label.toUpperCase());
  });

  test(`${game} removes travelling tiles when leaving during placement`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const answer = await start(page, game);
    await answer.click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Späť', exact: true }).click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    // A cancelled promise must not settle the old question after its component unmounts.
    await page.waitForTimeout(700);
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  });

  test(`${game} places immediately without travel under reduced motion`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const answer = await start(page, game);
    await answer.click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(1);
  });
}

for (const game of games) {
  test(`${game} cancels travel when replaying and leaves the question ready to answer`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const answer = await start(page, game);
    await answer.click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await waitForGamePhase(page, 'awaiting-answer');
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(0);
    await expect(answer).toBeVisible();
    await expect(answer).toBeEnabled();
  });
}

for (const game of ['complete-letter', 'complete-syllable'] as const) {
  test(`${game} leaves wrong answers in the tray and the question slot empty`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await start(page, game);
    const state = await getE2EState<CompleteLetterE2EState | CompleteSyllableE2EState>(page);
    const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId)!;
    const answer = page.locator(`[data-answer-id="${wrongId}"]`);
    const before = (await answer.boundingBox())!;
    await answer.click();
    await page.waitForFunction(() => window.__E2E__?.wrongAttempts === 1, undefined, { polling: 20 });
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(0);
    const after = (await answer.boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThan(2);
    expect(Math.abs(after.y - before.y)).toBeLessThan(2);
  });
}

test('Assembly waits for the final tile to land before showing success', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await start(page, 'assembly');
  const state = await getE2EState<AssemblyE2EState>(page);
  for (const tileId of state.correctTileOrder.slice(0, -1)) {
    await page.getByTestId('play-tray').locator(`[data-tile-id="${tileId}"]`).click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await waitForGamePhase(page, 'awaiting-answer');
  }
  await page.getByTestId('play-tray').locator(`[data-tile-id="${state.correctTileOrder.at(-1)}"]`).click();
  await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
  await waitForGamePhase(page, 'answered-correctly');
  await expect(page.getByRole('status')).toBeVisible();
});

const heldSyllableWord = { word: 'Jahodama', syllables: 'ja-ho-da-ma', emoji: '🍓', audioKey: 'jahodama' };

async function holdItemAudio(page: Page) {
  await page.evaluate(() => {
    (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = ['/letters/', '/syllables/'];
  });
}

async function releaseItemAudio(page: Page) {
  await page.evaluate(() => {
    const state = window as typeof window & { __heldAudio?: HTMLMediaElement[]; __holdAudioPaths?: string[] };
    state.__holdAudioPaths = [];
    state.__heldAudio?.shift()?.dispatchEvent(new Event('ended'));
  });
}

for (const game of ['complete-letter', 'complete-syllable'] as const) {
  test(`${game} keeps its landed tile visible while selection audio is held, then hands it to the filled slot`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const answer = await start(page, game, game === 'complete-syllable' ? heldSyllableWord : undefined);
    const label = (await answer.textContent())!.trim();
    const target = page.getByTestId('word-rail').locator('[data-slot-state="active"]');
    const targetRect = (await target.boundingBox())!;
    await holdItemAudio(page);
    await answer.click();
    const flight = page.locator('[data-tile-flight]');
    await expect(flight).toHaveCount(1);
    await expect.poll(async () => {
      const rect = await flight.boundingBox();
      return rect ? Math.hypot(rect.x + rect.width / 2 - targetRect.x - targetRect.width / 2, rect.y + rect.height / 2 - targetRect.y - targetRect.height / 2) : Infinity;
    }).toBeLessThan(1);
    await page.waitForTimeout(300);
    await expect(flight).toBeVisible();
    await expect(flight).toContainText(label);
    await expect(answer).toBeHidden();
    await expect(target).toHaveAttribute('data-slot-state', 'active');
    await expect(page.getByRole('status')).toHaveCount(0);
    await waitForGamePhase(page, 'resolving-answer');
    await releaseItemAudio(page);
    await expect(flight).toHaveCount(0);
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]').filter({ hasText: label })).toHaveCount(1);
  });

  test(`${game} cancels a landed tile during held audio without filling a stale question`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const answer = await start(page, game, game === 'complete-syllable' ? heldSyllableWord : undefined);
    await holdItemAudio(page);
    await answer.click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await page.waitForTimeout(800);
    await expect(answer).toBeHidden();
    await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();
    await releaseItemAudio(page);
    await waitForGamePhase(page, 'awaiting-answer');
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(0);
    await expect(answer).toBeVisible();
    await expect(answer).toBeEnabled();
  });

  test(`${game} shows immediate reduced-motion placement during held audio and rolls back on replay`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const answer = await start(page, game, game === 'complete-syllable' ? heldSyllableWord : undefined);
    const label = (await answer.textContent())!.trim();
    await holdItemAudio(page);
    await answer.click();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toContainText(label);
    await expect(answer).toBeHidden();
    await waitForGamePhase(page, 'resolving-answer');
    await expect(page.getByRole('status')).toHaveCount(0);
    await page.getByRole('button', { name: 'Zopakovať zadanie' }).click();
    await releaseItemAudio(page);
    await waitForGamePhase(page, 'awaiting-answer');
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="filled"]')).toHaveCount(0);
    await expect(answer).toBeVisible();
  });
}
