import { expect, test as base, type Locator, type Page } from './support/fixtures';
import { getE2EState } from './support/e2eHook';
import { ASSEMBLY_JAHODA, LONG_LABEL_WORDS, seedSingleLiteracyWord, type CompleteLetterE2EState, type CompleteSyllableE2EState } from './support/literacyHarness';
import { seedLocalStorage } from './support/persistenceFixtures';
import { clearAudioEvents, getAudioEvents, waitForGamePhase } from './support/gameHarness';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';

const test = base.extend<{ cleanBrowser: void }>({
  cleanBrowser: [async ({ page }, use) => {
    const errors = trackConsoleErrors(page);
    const failures = trackFailedRequests(page);
    await use();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failures);
  }, { auto: true }],
});
type State = CompleteLetterE2EState | CompleteSyllableE2EState;
const games = ['complete-letter', 'complete-syllable'] as const;

async function start(page: Page, game: typeof games[number], missingCount = 1) {
  await seedSingleLiteracyWord(page, game === 'complete-syllable' ? LONG_LABEL_WORDS['complete-syllable'] : ASSEMBLY_JAHODA);
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: missingCount } });
  await page.goto(`/${game}`);
  await page.getByRole('button', { name: 'Hrať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  return getE2EState<State>(page);
}

function answer(page: Page, id: string) {
  return page.getByTestId('play-tray').locator(`[data-answer-id="${id}"]`);
}
async function beginDrag(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Missing drag geometry');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
}

for (const game of games) {
  test(`${game}: dragging the correct choice continues the same tile into the answer and speaks it once`, async ({ page }) => {
    const state = await start(page, game);
    const target = page.getByTestId('word-rail').locator('[data-slot-state="active"]');
    await clearAudioEvents(page);
    await beginDrag(page, answer(page, state.correctItemId!), target);
    const flight = page.locator('[data-tile-flight]');
    await expect(flight).toHaveCount(1);
    await flight.evaluate(node => node.setAttribute('data-original-drag', 'true'));
    await page.mouse.up();
    await expect(page.locator('[data-tile-flight][data-original-drag="true"]')).toHaveCount(1);
    await waitForGamePhase(page, 'answered-correctly');
    await expect(flight).toHaveCount(0);
    const result = await getE2EState<State>(page);
    expect(result.roundsPlayed).toBe(1);
    expect(result.wrongAttempts).toBe(0);
    const kind = game === 'complete-letter' ? 'letters' : 'syllables';
    const events = await getAudioEvents(page);
    expect(events.filter(event => event.startsWith(`start:sk/${kind}/`))).toHaveLength(1);
  });

  test(`${game}: a wrong dropped choice returns to its source without filling the slot`, async ({ page }) => {
    const state = await start(page, game);
    const wrongId = state.answerItemIds.find(id => id !== state.correctItemId)!;
    const source = answer(page, wrongId);
    await beginDrag(page, source, page.getByTestId('word-rail').locator('[data-slot-state="active"]'));
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await page.mouse.up();
    await expect.poll(async () => (await getE2EState<State>(page)).wrongAttempts).toBe(1);
    await waitForGamePhase(page, 'awaiting-answer');
    await expect(source).toBeVisible();
    await expect(source).toBeEnabled();
    await expect(page.getByTestId('word-rail').locator('[data-slot-state="active"]')).toHaveCount(1);
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    expect((await getE2EState<State>(page)).roundsPlayed).toBe(0);
  });

  test(`${game}: dropping outside the active slot does not submit an answer`, async ({ page }) => {
    const state = await start(page, game);
    const source = answer(page, state.correctItemId!);
    await beginDrag(page, source, page.getByTestId('picture-card'));
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await page.mouse.up();
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await expect(source).toBeVisible();
    const result = await getE2EState<State>(page);
    expect(result.roundsPlayed).toBe(0);
    expect(result.wrongAttempts).toBe(0);
    expect(result.gamePhase).toBe('awaiting-answer');
  });

  test(`${game}: replay cancels a gesture and a subsequent click still answers`, async ({ page }) => {
    const state = await start(page, game);
    const source = answer(page, state.correctItemId!);
    await beginDrag(page, source, page.getByTestId('picture-card'));
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Zopakovať zadanie' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    await page.mouse.up();
    await waitForGamePhase(page, 'awaiting-answer');
    await source.click();
    await waitForGamePhase(page, 'answered-correctly');
    expect((await getE2EState<State>(page)).roundsPlayed).toBe(1);
  });

  test(`${game}: native touch dragging works on a phone under reduced motion`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const state = await start(page, game);
    const from = await answer(page, state.correctItemId!).boundingBox();
    const to = await page.getByTestId('word-rail').locator('[data-slot-state="active"]').boundingBox();
    const client = await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from!.x + from!.width / 2, y: from!.y + from!.height / 2 }] });
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to!.x + to!.width / 2, y: to!.y + to!.height / 2 }] });
    await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await waitForGamePhase(page, 'answered-correctly');
    await expect(page.locator('[data-tile-flight]')).toHaveCount(0);
    expect((await getE2EState<State>(page)).roundsPlayed).toBe(1);
  });
}

test('complete-letter: only the active blank accepts a drop and successive drags complete the word', async ({ page }) => {
  await start(page, 'complete-letter', 2);
  let state = await getE2EState<CompleteLetterE2EState>(page);
  await beginDrag(page, answer(page, state.correctItemId!), page.getByTestId('word-rail').locator('[data-slot-state="pending"]'));
  await expect(page.locator('[data-tile-flight]')).toHaveCount(1);
  await page.mouse.up();
  expect((await getE2EState<CompleteLetterE2EState>(page)).filledMissingCount).toBe(0);
  for (let count = 1; count <= 2; count += 1) {
    state = await getE2EState<CompleteLetterE2EState>(page);
    await beginDrag(page, answer(page, state.correctItemId!), page.getByTestId('word-rail').locator('[data-slot-state="active"]'));
    await page.mouse.up();
    await expect.poll(async () => (await getE2EState<CompleteLetterE2EState>(page)).filledMissingCount).toBe(count);
    await waitForGamePhase(page, count === 2 ? 'answered-correctly' : 'awaiting-answer');
  }
  expect((await getE2EState<CompleteLetterE2EState>(page)).roundsPlayed).toBe(1);
});
