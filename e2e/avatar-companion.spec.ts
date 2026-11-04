import { expect, test, type Page } from './support/fixtures';
import { BEAR_FIXTURE_URL, captureCompanionReview, installCompanionFixture, measureCompanionCharacter } from './support/companionFixture';
import { completeCurrentRound, getAudioEvents, pressAnswerById, stubAudioPlayback, waitForGamePhase } from './support/gameHarness';
import { resolveChromiumExecutable } from './browserResolver';
import { RELEASE_GAME_CASES } from './support/releaseMatrix';
import { getE2EState } from './support/e2eHook';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';
import { expectNoHorizontalOverflow, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { seedLocalStorage } from './support/persistenceFixtures';
import { startGame } from './support/gameEntry';

// Playwright requires worker-scoped launchOptions at file scope. This companion-only
// file preserves the normal suite configuration and does not apply flags to WebKit.
test.use({ launchOptions: {
  executablePath: resolveChromiumExecutable(),
  args: ['--mute-audio', '--enable-unsafe-swiftshader', '--use-gl=angle'],
} });

async function start(page: Page, path = '/alphabet') {
  await startGame(page, path);
  await waitForGamePhase(page, 'awaiting-answer');
}
async function releasePraise(page: Page) {
  await page.evaluate(() => {
    const audio = (window as typeof window & { __heldAudio?: HTMLMediaElement[] }).__heldAudio?.pop();
    if (!audio) throw new Error('Expected held praise');
    audio.dispatchEvent(new Event('ended'));
  });
}
async function observeEvents(page: Page) {
  await page.evaluate(() => {
    const keys: string[] = [];
    const record = () => {
      const key = document.querySelector('[data-testid="learning-companion"]')?.getAttribute('data-celebration-key');
      if (key && !keys.includes(key)) keys.push(key);
    };
    record();
    const observer = new MutationObserver(record);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-celebration-key'] });
    (window as typeof window & { bearKeys?: string[] }).bearKeys = keys;
  });
}
async function eventKeys(page: Page) {
  return page.evaluate(() => (window as typeof window & { bearKeys?: string[] }).bearKeys ?? []);
}
async function expect3D(page: Page) {
  // The whole reaction is capped at 1600ms. Playwright's default 1000ms late
  // polling interval can skip a cold first canvas. Capture all proof in one
  // browser observation so transport delays cannot turn expiry into a failure.
  const snapshot = await page.waitForFunction(() => {
    const companion = document.querySelector('[data-testid="learning-companion"]');
    const canvas = companion?.querySelector('canvas');
    if (!companion || !canvas || companion.getAttribute('data-companion-representation') !== 'rendered3D') return null;
    const bounds = canvas.getBoundingClientRect();
    return {
      ariaHidden: companion.getAttribute('aria-hidden'),
      pointerEvents: getComputedStyle(companion).pointerEvents,
      width: canvas.width, height: canvas.height,
      visible: bounds.width > 0 && bounds.height > 0 && getComputedStyle(canvas).visibility !== 'hidden',
      focusStops: companion.querySelectorAll('[tabindex="0"]').length,
    };
  }, undefined, { polling: 20 });
  const proof = await snapshot.jsonValue();
  expect(proof).toMatchObject({ ariaHidden: 'true', pointerEvents: 'none', visible: true, focusStops: 0 });
  expect(proof!.width).toBeGreaterThan(0);
  expect(proof!.height).toBeGreaterThan(0);
}

for (const game of RELEASE_GAME_CASES) {
  test(`${game.id} completed answer renders one actual bear`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const requests = trackFailedRequests(page);
    await installCompanionFixture(page);
    await start(page, game.path);
    await observeEvents(page);
    await expect(page.getByTestId('learning-companion')).toHaveCount(0);
    await completeCurrentRound(page, game.id);
    await expect3D(page);
    expect(await eventKeys(page)).toHaveLength(1);
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(requests);
  });
}

test('intermediate assembly and multiple-letter progress do not celebrate', async ({ page }) => {
  await installCompanionFixture(page);
  await start(page, '/assembly');
  const assembly = await getE2EState(page);
  const tiles = assembly.correctTileOrder as string[];
  expect(tiles.length).toBeGreaterThan(1);
  await page.locator(`[data-tile-id=${JSON.stringify(tiles[0])}]`).click();
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: 2 } });
  await start(page, '/complete-letter');
  const letter = await getE2EState(page);
  await pressAnswerById(page, String(letter.correctItemId));
  await expect.poll(async () => (await getE2EState(page)).filledMissingCount).toBe(1);
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await completeCurrentRound(page, 'COMPLETE_LETTER');
  await expect3D(page);
});

for (const id of ['ALPHABET', 'ASSEMBLY'] as const) {
  test(`${id} final correct keeps one event through completion and restart`, async ({ page }) => {
    await installCompanionFixture(page);
    await stubAudioPlayback(page, { holdPraise: true });
    await start(page, id === 'ALPHABET' ? '/alphabet' : '/assembly');
    await observeEvents(page);
    for (let round = 0; round < 5; round += 1) {
      await completeCurrentRound(page, id);
      await waitForGamePhase(page, 'answered-correctly');
      if (round < 4) {
        await page.getByRole('button', { name: 'Pokračovať' }).click();
        await waitForGamePhase(page, 'awaiting-answer');
      }
    }
    const key = await page.getByTestId('learning-companion').getAttribute('data-celebration-key');
    await releasePraise(page);
    await waitForGamePhase(page, 'session-complete');
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-celebration-key', key!);
    expect(await eventKeys(page)).toHaveLength(5);
    await page.getByRole('button', { name: 'Hrať znova' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    await completeCurrentRound(page, id);
    await expect(page.getByTestId('learning-companion')).not.toHaveAttribute('data-celebration-key', key!);
    await expect.poll(async () => (await eventKeys(page)).length).toBe(6);
  });
}

test('final exhausted failure after successes has no bear', async ({ page }) => {
  await installCompanionFixture(page);
  await start(page);
  for (let round = 0; round < 4; round += 1) {
    await completeCurrentRound(page, 'ALPHABET');
    await page.getByRole('button', { name: 'Pokračovať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await getE2EState(page);
    await pressAnswerById(page, (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!);
    if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
  }
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
});

test('held item then praise and original 1000ms progression are unchanged', async ({ page }) => {
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  await page.clock.install();
  await completeCurrentRound(page, 'ALPHABET');
  await expect.poll(async () => (await getAudioEvents(page)).some(e => e.startsWith('start:sk/praise/'))).toBe(true);
  const events = await getAudioEvents(page);
  const praise = events.findIndex(e => e.startsWith('start:sk/praise/'));
  expect(events.slice(0, praise).some(e => e.startsWith('finish:sk/letters/'))).toBe(true);
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(1700);
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.getByTestId('companion-feedback-slot')).toBeVisible();
  await waitForGamePhase(page, 'answered-correctly');
  await releasePraise(page);
  await expect.poll(async () => (await getAudioEvents(page)).some(e => e.startsWith('finish:sk/praise/'))).toBe(true);
  await page.clock.runFor(999);
  expect((await getE2EState(page)).gamePhase).toBe('answered-correctly');
  await page.clock.runFor(1);
  expect((await getE2EState(page)).gamePhase).toBe('ready');
  await page.clock.resume();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.getByTestId('companion-feedback-slot')).toHaveCount(0);
});

test('panel clicks do not dismiss; Continue, backdrop and route exit remove canvas', async ({ page }) => {
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  await observeEvents(page);
  await completeCurrentRound(page, 'ALPHABET');
  const key = await page.getByTestId('learning-companion').getAttribute('data-celebration-key');
  await page.getByRole('status').click();
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-celebration-key', key!);
  expect(await eventKeys(page)).toHaveLength(1);
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.locator('canvas')).toHaveCount(0);
  await completeCurrentRound(page, 'ALPHABET');
  await expect(page.getByRole('status')).toBeVisible();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(el => getComputedStyle(el).opacity === '1'));
  await page.mouse.click(4, 4);
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.locator('canvas')).toHaveCount(0);
  await completeCurrentRound(page, 'ALPHABET');
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('repeated answer taps resolve one round and one celebration', async ({ page }) => {
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  await observeEvents(page);
  const state = await getE2EState(page);
  await page.locator(`[data-answer-id=${JSON.stringify(state.correctItemId)}]`).dblclick();
  await expect.poll(async () => (await getE2EState(page)).roundsPlayed).toBe(1);
  expect(await eventKeys(page)).toHaveLength(1);
});

test('reduced motion uses the still without model or lazy renderer requests', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installCompanionFixture(page);
  const requested: string[] = [];
  page.on('request', request => requested.push(request.url()));
  await start(page);
  await completeCurrentRound(page, 'ALPHABET');
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
  await expect(page.getByTestId('learning-companion').locator('img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requested.filter(url => url.includes(BEAR_FIXTURE_URL) || /AvatarScene.*\.js/.test(url))).toEqual([]);
});

test('the reduced-motion gallery specimen forces a still with normal system motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await installCompanionFixture(page);
  const requested: string[] = [];
  page.on('request', request => requested.push(request.url()));
  await page.goto('/ui-kit?example=game-shell&state=companion-reduced-motion');
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
  await expect(page.getByTestId('learning-companion').locator('img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requested.filter(url => url.includes(BEAR_FIXTURE_URL) || /AvatarScene.*\.js/.test(url))).toEqual([]);
});

test('the still and canvas occupy the same reserved feedback area', async ({ page }) => {
  await installCompanionFixture(page);
  await start(page);
  await completeCurrentRound(page, 'ALPHABET');
  await expect3D(page);
  const canvas = await page.getByTestId('learning-companion').locator('canvas').boundingBox();
  const renderedCharacter = await measureCompanionCharacter(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // motion/react reads this media preference on mount in the installed release.
  await start(page);
  await completeCurrentRound(page, 'ALPHABET');
  const image = page.getByTestId('learning-companion').locator('img');
  await expect(image).toBeVisible();
  const still = await image.boundingBox();
  const stillCharacter = await measureCompanionCharacter(page);
  expect(still?.width).toBe(canvas?.width);
  expect(still?.height).toBe(canvas?.height);
  expect(Math.abs(stillCharacter.height - renderedCharacter.height)).toBeLessThanOrEqual(renderedCharacter.height * .08);
});

for (const failure of ['404', 'invalid', 'parse', 'chunk', 'no-webgl'] as const) {
  test(`${failure} failure keeps feedback usable and does not retry each round`, async ({ page }) => {
    await installCompanionFixture(page);
    const expectedErrors = trackConsoleErrors(page);
    const uncaughtErrors: string[] = [];
    page.on('pageerror', error => uncaughtErrors.push(error.message));
    const expectedRequests = trackFailedRequests(page);
    let modelRequests = 0;
    page.on('request', request => { if (request.url().includes(BEAR_FIXTURE_URL)) modelRequests += 1; });
    if (failure === '404' || failure === 'invalid' || failure === 'parse') await page.route(`**${BEAR_FIXTURE_URL}`, route => route.fulfill({
      status: failure === '404' ? 404 : 200, contentType: 'model/gltf-binary', body: failure === 'parse' ? 'glTFbroken-model' : 'invalid',
    }));
    if (failure === 'chunk') await page.route('**/AvatarScene-*.js', route => route.abort('failed'));
    if (failure === 'no-webgl') await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: function (this: HTMLCanvasElement, ...args: Parameters<typeof original>) {
        if (String(args[0]).startsWith('webgl')) return null;
        return original.apply(this, args);
      } });
    });
    await start(page);
    await completeCurrentRound(page, 'ALPHABET');
    if (failure === 'no-webgl') await expect.poll(() => expectedErrors.some(error => /WebGL|Error creating/.test(error))).toBe(true);
    if (failure === 'chunk') await expect.poll(() => expectedRequests.some(request => request.includes('AvatarScene-'))).toBe(true);
    if (failure === 'parse') {
      await expect.poll(() => modelRequests).toBe(1);
      await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-resource-status', 'failed');
      await expect(page.locator('canvas')).toHaveCount(0);
    }
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
    await page.getByRole('button', { name: 'Pokračovať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    const count = modelRequests;
    await completeCurrentRound(page, 'ALPHABET');
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
    expect(modelRequests).toBe(count);
    expect(modelRequests).toBe(1);
    // Injection errors are observed separately; normal cases above retain strict zero errors.
    expect(expectedErrors.filter(error => !/404|Failed to fetch|WebGL|Error creating|dynamically imported|Importing a module script|net::ERR_FAILED|GLTF|JSON|version|bounds|length/i.test(error))).toEqual([]);
    expect(expectedRequests.filter(request => !request.includes(BEAR_FIXTURE_URL) && !request.includes('AvatarScene-'))).toEqual([]);
    expect(uncaughtErrors).toEqual([]);
  });
}

test('pause consumes the current celebration and resume does not replay it', async ({ page }) => {
  await installCompanionFixture(page);
  await page.goto('/ui-kit?example=game-shell&state=companion-success');
  await expect(page.getByTestId('learning-companion')).toBeVisible();
  const toggle = page.getByTestId('game-pause-demo-toggle');
  await toggle.evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);
  await toggle.evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
});

test('a React shell rerender preserves the current celebration identity', async ({ page }) => {
  await installCompanionFixture(page);
  await page.goto('/ui-kit?example=game-shell&state=companion-success');
  await expect(page.getByTestId('learning-companion')).toBeVisible();
  const key = await page.getByTestId('learning-companion').getAttribute('data-celebration-key');
  await observeEvents(page);
  await page.getByTestId('game-companion-rerender').evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-celebration-key', key!);
  expect(await eventKeys(page)).toEqual([key]);
});

test('200 percent zoom retains feedback and completion controls', async ({ page }) => {
  await installCompanionFixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const state of ['companion-success', 'companion-final-correct']) {
    await page.goto(`/ui-kit?example=game-shell&state=${state}`);
    await page.evaluate(() => { document.body.style.zoom = '2'; });
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('status').getByRole('button')).toHaveCount(state === 'companion-success' ? 1 : 2);
    await expectNoHorizontalOverflow(page);
    for (const control of await page.getByRole('status').getByRole('button').all()) await expectWithinViewport(page, control);
  }
});

test('Continue disposes the WebGL context and stops actual draw calls', async ({ page }) => {
  await page.addInitScript(() => {
    const observed = window as typeof window & { companionDrawCalls?: number };
    observed.companionDrawCalls = 0;
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const method of ['drawElements', 'drawArrays'] as const) {
        const original = prototype[method];
        Object.defineProperty(prototype, method, { value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          observed.companionDrawCalls! += 1;
          return Reflect.apply(original, this, args);
        } });
      }
    }
  });
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  await completeCurrentRound(page, 'ALPHABET');
  await expect3D(page);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls)).toBeGreaterThan(0);
  const canvas = await page.locator('canvas').elementHandle();
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  const before = await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls);
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0;
    const next = () => { if (++frames === 8) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
  expect(await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls)).toBe(before);
  expect(await canvas!.evaluate((el: HTMLCanvasElement) => el.getContext('webgl2')?.isContextLost())).toBe(true);
});

test('context loss falls back, removes canvas and remains failed next round', async ({ page }) => {
  await installCompanionFixture(page);
  await start(page);
  await completeCurrentRound(page, 'ALPHABET');
  await expect3D(page);
  await page.locator('canvas').evaluate(canvas => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })));
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await completeCurrentRound(page, 'ALPHABET');
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('companion canvas follows the reserved slot across a live viewport breakpoint', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const requests = trackFailedRequests(page);
  await page.setViewportSize({ width: 667, height: 375 });
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  await page.waitForLoadState('networkidle');
  await completeCurrentRound(page, 'ALPHABET');
  await expect3D(page);
  const key = await page.getByTestId('learning-companion').getAttribute('data-celebration-key');
  await page.setViewportSize({ width: 568, height: 320 });
  await expect.poll(() => page.evaluate(() => {
    const slot = document.querySelector('[data-testid="companion-feedback-slot"]');
    const canvas = slot?.querySelector('canvas');
    if (!slot || !canvas) return null;
    return { slotWidth: slot.clientWidth, slotHeight: slot.clientHeight,
      canvasWidth: canvas.clientWidth, canvasHeight: canvas.clientHeight };
  }), { intervals: [20], timeout: 1000 }).toEqual({ slotWidth: 112, slotHeight: 128, canvasWidth: 112, canvasHeight: 128 });
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-celebration-key', key!);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(requests);
});

for (const delayed of ['model', 'scene']) test(`late ${delayed} after Continue never appears in the next question`, async ({ page }) => {
  await installCompanionFixture(page);
  let finish!: () => void;
  const held = new Promise<void>(resolve => { finish = resolve; });
  await page.route(delayed === 'model' ? `**${BEAR_FIXTURE_URL}` : '**/AvatarScene-*.js', async route => {
    await held;
    await route.fallback();
  });
  await start(page);
  await completeCurrentRound(page, 'ALPHABET');
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  finish();
  await page.waitForLoadState('networkidle');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
});

async function expectCompanionControlsFit(page: Page, locale: 'sk' | 'cs') {
  await installCompanionFixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedLocalStorage(page, { 'hrave-ucenie-app-settings': { locale } });
  for (const state of ['companion-success', 'companion-final-correct', 'companion-final-failure']) {
    await page.goto(`/ui-kit?example=game-shell&state=${state}`);
    await expect(page.getByRole('status')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const controls = page.getByRole('status').getByRole('button');
    for (const control of await controls.all()) await expectWithinViewport(page, control);
    await expectNoPairwiseOverlap(controls);
    if (state !== 'companion-final-failure') await expect(page.getByTestId('learning-companion')).toBeVisible();
  }
}

for (const locale of ['sk', 'cs'] as const) {
  test(`@geometry ${locale} companion feedback and completion controls fit`, async ({ page }) => {
    await expectCompanionControlsFit(page, locale);
  });

  // This combined breakpoint is smaller than the representative short-landscape
  // profile; exercise its completion buttons once rather than repeating every matrix entry.
  test(`${locale} companion feedback and completion controls fit a narrow short viewport`, async ({ page }) => {
    await page.setViewportSize({ width: 568, height: 320 });
    await expectCompanionControlsFit(page, locale);
  });
}

for (const locale of ['sk', 'cs'] as const) {
  test(`@geometry ${locale} real-game companion review scenes`, async ({ page }, testInfo) => {
    const errors = trackConsoleErrors(page);
    const requests = trackFailedRequests(page);
    await installCompanionFixture(page);
    await stubAudioPlayback(page, { holdPraise: true });
    // Missing draft Czech recordings can emit a native decode error even while
    // play() is held, releasing praise through TTS and remounting the final view.
    // This visual test controls completion with releasePraise; native audio and
    // fallback contracts have their own suites.
    await page.route('**/audio/*/praise/*.mp3', route => route.fulfill({
      path: 'public/audio/sk/praise/vyborne.mp3', contentType: 'audio/mpeg',
    }));
    await seedLocalStorage(page, { 'hrave-ucenie-app-settings': { locale } });
    await startGame(page, '/alphabet');
    await waitForGamePhase(page, 'awaiting-answer');
    await completeCurrentRound(page, 'ALPHABET');
    await expect3D(page);
    const character = await captureCompanionReview(page, testInfo, 'success', locale, { errors, failedRequests: requests });
    const viewport = page.viewportSize()!;
    const minimumHeight = viewport.width < 640 && viewport.height <= 480 ? 85 : viewport.width < 640 || viewport.height <= 480 ? 110 : 140;
    expect(character.height, 'the bear itself must be large enough to read, beyond canvas dimensions').toBeGreaterThanOrEqual(minimumHeight);
    expect(character.height).toBeLessThan(character.canvasHeight - 2);
    expect(character.width).toBeLessThan(character.canvasWidth - 2);
    await page.getByRole('button', { name: /^(Pokračovať|Pokračovat)$/ }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    for (let round = 1; round < 4; round += 1) {
      await completeCurrentRound(page, 'ALPHABET');
      await page.getByRole('button', { name: /^(Pokračovať|Pokračovat)$/ }).click();
      await waitForGamePhase(page, 'awaiting-answer');
    }
    await completeCurrentRound(page, 'ALPHABET');
    await expect3D(page);
    await captureCompanionReview(page, testInfo, 'final-before-results', locale, { errors, failedRequests: requests });
    await releasePraise(page);
    await waitForGamePhase(page, 'session-complete');
    await captureCompanionReview(page, testInfo, 'results', locale, { errors, failedRequests: requests });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startGame(page, '/alphabet');
    await waitForGamePhase(page, 'awaiting-answer');
    await completeCurrentRound(page, 'ALPHABET');
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-representation', 'still');
    await captureCompanionReview(page, testInfo, 'reduced-motion', locale, { errors, failedRequests: requests });
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(requests);
  });
}
