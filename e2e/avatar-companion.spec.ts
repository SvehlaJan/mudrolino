import { expect, test, type Page } from './support/fixtures';
import { BEAR_FIXTURE_URL, captureCompanionReview, installCompanionFixture, measureCompanionCharacter } from './support/companionFixture';
import { completeCurrentRound, getAudioEvents, pressAnswerById, stubAudioPlayback, waitForGamePhase } from './support/gameHarness';
import { resolveChromiumExecutable } from './browserResolver';
import { RELEASE_GAME_CASES } from './support/releaseMatrix';
import { getE2EState } from './support/e2eHook';
import { expectNoConsoleErrors, expectNoFailedRequests, trackConsoleErrors, trackFailedRequests } from './support/assertions';
import { expectNoHorizontalOverflow, expectNoPairwiseOverlap, expectWithinViewport } from './support/layoutAssertions';
import { unlockParentGate } from './support/parentGate';
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
    await stubAudioPlayback(page, { holdPraise: true });
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
  test.setTimeout(60_000);
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
    test.setTimeout(id === 'ASSEMBLY' ? 90_000 : 60_000);
    await installCompanionFixture(page);
    await stubAudioPlayback(page, { holdPraise: true });
    await start(page, id === 'ALPHABET' ? '/alphabet' : '/assembly');
    await observeEvents(page);
    const expectedClips = ['celebrate', 'wave', 'clap', 'jump', 'finale'] as const;
    for (let round = 0; round < 5; round += 1) {
      await completeCurrentRound(page, id);
      await waitForGamePhase(page, 'answered-correctly');
      await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-animation', expectedClips[round]);
      if (round < 4) {
        await page.getByRole('button', { name: 'Pokračovať' }).click();
        await waitForGamePhase(page, 'awaiting-answer');
      }
    }
    const key = await page.getByTestId('learning-companion').getAttribute('data-celebration-key');
    await releasePraise(page);
    await waitForGamePhase(page, 'session-complete');
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-celebration-key', key!);
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-animation', 'finale');
    expect(await eventKeys(page)).toHaveLength(5);
    await page.getByRole('button', { name: 'Hrať znova' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
    await completeCurrentRound(page, id);
    await expect(page.getByTestId('learning-companion')).not.toHaveAttribute('data-celebration-key', key!);
    await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-animation', 'flex');
    await expect.poll(async () => (await eventKeys(page)).length).toBe(6);
  });
}

test('final exhausted failure after successes still shows the finale bear on session-complete', async ({ page }) => {
  test.setTimeout(60_000);
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
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
  await expect(page.getByTestId('learning-companion')).toBeVisible();
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-animation', 'finale');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
});

test('exhausted round failure and 0/5 session-complete show empathetic encourage companion', async ({ page }) => {
  test.setTimeout(90_000);
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);

  const setHoldPhrases = (hold: boolean) =>
    page.evaluate((shouldHold) => {
      (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = shouldHold
        ? ['/phrases/nevadi']
        : [];
    }, hold);

  // Round 1: exhaust 3 wrong attempts
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 2) await setHoldPhrases(true);
    const state = await getE2EState(page);
    const wrongId = (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!;
    await pressAnswerById(page, wrongId);
    if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
  }
  await waitForGamePhase(page, 'answered-incorrectly');
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Nevadí, poďme ďalej');
  await expect(page.getByTestId('learning-companion')).toBeVisible();
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-animation', 'encourage');

  // Continue to round 2
  await setHoldPhrases(false);
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');

  // Exhaust rounds 2, 3, 4, 5 to achieve 0 / 5 correct
  for (let round = 1; round < 5; round += 1) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (attempt === 2 && round < 4) await setHoldPhrases(true);
      const state = await getE2EState(page);
      const wrongId = (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!;
      await pressAnswerById(page, wrongId);
      if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
    }
    if (round < 4) {
      await waitForGamePhase(page, 'answered-incorrectly');
      await setHoldPhrases(false);
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'awaiting-answer');
    }
  }

  // Round 5 exhausted failure advances directly to session-complete
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByTestId('learning-companion')).toBeVisible();
  await expect(page.getByTestId('learning-companion')).toHaveAttribute('data-companion-animation', 'encourage');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
});

test('held item then praise and original 1000ms progression are unchanged while bear stays in idle pose', async ({ page }) => {
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  await page.clock.install();
  await completeCurrentRound(page, 'ALPHABET');
  await expect.poll(async () => (await getAudioEvents(page)).some(e => e.startsWith('start:sk/praise/'))).toBe(true);
  const events = await getAudioEvents(page);
  const praise = events.findIndex(e => e.startsWith('start:sk/praise/'));
  expect(events.slice(0, praise).some(e => e.startsWith('finish:sk/letters/'))).toBe(true);
  const browserNow = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(browserNow + 15_000);
  await page.clock.runFor(1700);
  await expect(page.getByTestId('learning-companion')).toBeVisible();
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

test('panel clicks do not dismiss; Continue, backdrop and route exit hand stage cleanly and clear canvas off-companion routes', async ({ page }) => {
  test.setTimeout(60_000);
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
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.getByTestId('prompt-companion').locator('canvas')).toHaveCount(1);
  await expect(page.locator('canvas')).toHaveCount(1);
  await completeCurrentRound(page, 'ALPHABET');
  await expect(page.getByRole('status')).toBeVisible();
  await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(el => getComputedStyle(el).opacity === '1'));
  await page.mouse.click(4, 4);
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.getByTestId('prompt-companion').locator('canvas')).toHaveCount(1);
  await expect(page.locator('canvas')).toHaveCount(1);
  await completeCurrentRound(page, 'ALPHABET');
  await page.goto('/content');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.goto('/');
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.getByTestId('home-companion')).toBeVisible();
  await expect(page.getByTestId('home-companion').locator('canvas')).toHaveCount(1);
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
  await stubAudioPlayback(page, { holdPraise: true });
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
  await stubAudioPlayback(page, { holdPraise: true });
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
    await stubAudioPlayback(page, { holdPraise: true });
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

test('single persistent WebGL context moves across home, prompt and overlay and disposes off-companion routes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.addInitScript(() => {
    const observed = window as typeof window & {
      companionDrawCalls?: number;
      companionWebglCreations?: number;
      trackedCanvas?: HTMLCanvasElement | null;
      trackedContext?: WebGLRenderingContext | WebGL2RenderingContext | null;
    };
    observed.companionDrawCalls = 0;
    observed.companionWebglCreations = 0;
    observed.trackedContext = null;
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, ...args: Parameters<typeof origGetContext>) {
        const ctx = origGetContext.apply(this, args);
        if (ctx && (args[0] === 'webgl' || args[0] === 'webgl2')) {
          observed.trackedContext = ctx as WebGLRenderingContext | WebGL2RenderingContext;
          if (!this.dataset.webglTracked) {
            this.dataset.webglTracked = '1';
            observed.companionWebglCreations! += 1;
          }
        }
        return ctx;
      },
    });
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
  await page.goto('/');

  const home = page.getByTestId('home-companion');
  await expect(home).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(home.locator('canvas')).toBeVisible();
  await page.evaluate(() => {
    const w = window as typeof window & { trackedCanvas?: HTMLCanvasElement | null };
    w.trackedCanvas = document.querySelector('[data-testid="home-companion"] canvas');
  });
  expect(await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations)).toBe(1);

  await page.locator('[data-testid="game-card"][href="/alphabet"]').click();
  await page.waitForURL((url) => url.pathname === '/alphabet');
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.getByTestId('game-input-shield')).toHaveCount(0);

  const promptCompanion = page.getByTestId('prompt-companion');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => {
    const w = window as typeof window & { trackedCanvas?: HTMLCanvasElement | null };
    return document.querySelector('[data-testid="prompt-companion"] canvas') === w.trackedCanvas;
  })).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations)).toBe(1);

  await completeCurrentRound(page, 'ALPHABET');
  await expect3D(page);
  await expect(page.getByTestId('learning-companion').locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => {
    const w = window as typeof window & { trackedCanvas?: HTMLCanvasElement | null };
    return document.querySelector('[data-testid="learning-companion"] canvas') === w.trackedCanvas;
  })).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations)).toBe(1);

  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => {
    const w = window as typeof window & { trackedCanvas?: HTMLCanvasElement | null };
    return document.querySelector('[data-testid="prompt-companion"] canvas') === w.trackedCanvas;
  })).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations)).toBe(1);

  await page.getByRole('button', { name: 'Späť' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(home).toBeVisible();
  await expect(home).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(home.locator('canvas')).toBeVisible();
  expect(await page.evaluate(() => {
    const w = window as typeof window & { trackedCanvas?: HTMLCanvasElement | null };
    return document.querySelector('[data-testid="home-companion"] canvas') === w.trackedCanvas;
  })).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations)).toBe(1);

  await page.getByRole('button', { name: 'Nastavenia' }).click();
  await page.waitForURL((url) => url.pathname === '/settings');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect.poll(async () => page.evaluate(() => {
    const w = window as typeof window & {
      trackedContext?: WebGLRenderingContext | WebGL2RenderingContext | null;
    };
    return w.trackedContext?.isContextLost() ?? false;
  }), { timeout: 2500 }).toBe(true);
  const before = await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls);
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0;
    const next = () => { if (++frames === 8) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
  expect(await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls)).toBe(before);
});

test('round 5 failure to session-complete transition reuses the same overlay canvas without recreating WebGL', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    const observed = window as typeof window & { companionWebglCreations?: number };
    observed.companionWebglCreations = 0;
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, ...args: Parameters<typeof origGetContext>) {
        const ctx = origGetContext.apply(this, args);
        if (ctx && (args[0] === 'webgl' || args[0] === 'webgl2') && !this.dataset.webglTracked) {
          this.dataset.webglTracked = '1';
          observed.companionWebglCreations! += 1;
        }
        return ctx;
      },
    });
  });
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await start(page);
  for (let round = 0; round < 4; round += 1) {
    await completeCurrentRound(page, 'ALPHABET');
    await page.getByRole('button', { name: 'Pokračovať' }).click();
    await waitForGamePhase(page, 'awaiting-answer');
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 2) {
      await page.evaluate(() => {
        (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = ['/phrases/nevadi'];
      });
    }
    const state = await getE2EState(page);
    await pressAnswerById(page, (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!);
    if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
  }
  await waitForGamePhase(page, 'answered-incorrectly');
  await expect3D(page);
  const creationsBefore = await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations);
  await page.evaluate(() => {
    (window as typeof window & { overlayCanvasBefore?: Element | null }).overlayCanvasBefore =
      document.querySelector('[data-testid="learning-companion"] canvas');
    (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = [];
  });
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'session-complete');
  await expect3D(page);
  expect(await page.evaluate(() => {
    const w = window as typeof window & { overlayCanvasBefore?: Element | null };
    return document.querySelector('[data-testid="learning-companion"] canvas') === w.overlayCanvasBefore;
  })).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { companionWebglCreations?: number }).companionWebglCreations)).toBe(creationsBefore);
});

test('context loss falls back, removes canvas and remains failed next round', async ({ page }) => {
  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
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

for (const delayed of ['model', 'scene']) test(`late ${delayed} after Continue never opens overlay in the next question`, async ({ page }) => {
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
  await expect(page.getByTestId('prompt-companion')).toHaveAttribute('data-companion-representation', 'still');
  await expect(page.locator('canvas')).toHaveCount(0);
  finish();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await expect(page.getByTestId('prompt-companion')).toHaveAttribute('data-companion-representation', 'rendered3D');
});

test('home screen welcome, tap cycling, rendered3D canvas and reduced motion', async ({ page }) => {
  await installCompanionFixture(page);
  await page.goto('/');

  const homeCompanion = page.getByTestId('home-companion');
  await expect(homeCompanion).toBeVisible();
  // Initial animation is wave
  await expect(homeCompanion).toHaveAttribute('data-companion-animation', 'wave');
  await expect(homeCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  const homeCanvasBox = await homeCompanion.locator('canvas').boundingBox();
  expect(homeCanvasBox).not.toBeNull();
  expect(homeCanvasBox!.width).toBeGreaterThan(0);
  expect(homeCanvasBox!.height).toBeGreaterThan(0);
  const box = await homeCompanion.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(48);
  expect(box!.height).toBeGreaterThanOrEqual(48);
  await expect(homeCompanion).toHaveAttribute('aria-label', 'Zamávaj medvedíkovi');
  await expectNoHorizontalOverflow(page);

  const settingsButton = page.getByRole('button', { name: 'Nastavenia' });
  await expectNoPairwiseOverlap([homeCompanion, settingsButton]);
  const firstCard = page.getByTestId('game-card').first();
  await expectNoPairwiseOverlap([homeCompanion, firstCard]);

  // Tapping cycles to peekaboo then stretch
  await homeCompanion.click();
  await expect(homeCompanion).toHaveAttribute('data-companion-animation', 'peekaboo');
  await homeCompanion.click();
  await expect(homeCompanion).toHaveAttribute('data-companion-animation', 'stretch');

  // CS locale aria-label
  await seedLocalStorage(page, { 'hrave-ucenie-app-settings': { locale: 'cs' } });
  await page.goto('/');
  await expect(page.getByTestId('home-companion')).toHaveAttribute('aria-label', 'Zamávat medvídkovi');

  // Reduced motion uses still without GLB or scene requests
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const requested: string[] = [];
  page.on('request', req => requested.push(req.url()));
  await page.goto('/');
  const stillCompanion = page.getByTestId('home-companion');
  await expect(stillCompanion).toHaveAttribute('data-companion-representation', 'still');
  await expect(stillCompanion.locator('img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  expect(requested.filter(url => url.includes(BEAR_FIXTURE_URL) || /AvatarScene.*\.js/.test(url))).toEqual([]);
});

test('in-round prompt companion replays prompt on tap and reacts inline to 1st and 2nd wrong attempts', async ({ page }) => {
  await installCompanionFixture(page);
  await stubAudioPlayback(page);
  await start(page, '/alphabet');

  const promptCompanion = page.getByTestId('prompt-companion');
  await expect(promptCompanion).toBeVisible();
  await expect(promptCompanion).toHaveAttribute('aria-label', 'Medvedík zopakuje zadanie');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion.locator('canvas')).toBeVisible();

  const eventsBeforeTap = (await getAudioEvents(page)).length;
  await promptCompanion.click();
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'listen');
  await expect(promptCompanion).toHaveAttribute('data-companion-reason', 'tap');
  await expect.poll(async () => (await getAudioEvents(page)).slice(eventsBeforeTap).some(e => e.startsWith('start:sk/'))).toBe(true);
  await waitForGamePhase(page, 'awaiting-answer');

  // 1st wrong attempt triggers inline gentle_try_again without opening overlay
  let state = await getE2EState(page);
  const wrongId1 = (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!;
  await pressAnswerById(page, wrongId1);
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'gentle_try_again');
  await expect(promptCompanion).toHaveAttribute('data-companion-reason', 'retry');
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');

  // 2nd wrong attempt triggers inline encourage without opening overlay
  state = await getE2EState(page);
  const wrongId2 = (state.gridItemIds as string[]).find(id => id !== state.correctItemId && id !== wrongId1) ?? wrongId1;
  await pressAnswerById(page, wrongId2);
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'encourage');
  await expect(promptCompanion).toHaveAttribute('data-companion-reason', 'retry');
  await expect(page.getByTestId('learning-companion')).toHaveCount(0);
  await waitForGamePhase(page, 'awaiting-answer');

  // 3rd wrong attempt opens exhausted failure overlay with learning-companion
  await page.evaluate(() => {
    (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = ['/phrases/nevadi'];
  });
  state = await getE2EState(page);
  const wrongId3 = (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!;
  await pressAnswerById(page, wrongId3);
  await waitForGamePhase(page, 'answered-incorrectly');
  await expect(page.getByTestId('learning-companion')).toBeVisible();
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'still');
});

test('12-second inactivity nudge activates think on prompt-companion and clears on user activity', async ({ page }) => {
  await installCompanionFixture(page);
  await page.clock.install();
  await start(page, '/alphabet');
  const promptCompanion = page.getByTestId('prompt-companion');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 2_000);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));

  const initialScrollHeight = await page.evaluate(() => document.scrollingElement?.scrollHeight);

  // 11,900 ms: nudge has not appeared yet
  await page.clock.fastForward(11900);
  await expect(page.getByTestId('game-interactive-content')).not.toHaveAttribute('data-idle-nudge', 'true');
  await expect(promptCompanion).not.toHaveAttribute('data-companion-nudge-active', 'true');

  // +200 ms (12,100 ms): prompt-companion switches to think with nudge active and zero layout shift
  await page.clock.fastForward(200);
  await expect(page.getByTestId('game-interactive-content')).toHaveAttribute('data-idle-nudge', 'true');
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'think');
  await expect(promptCompanion).toHaveAttribute('data-companion-nudge-active', 'true');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');

  const afterScrollHeight = await page.evaluate(() => document.scrollingElement?.scrollHeight);
  expect(afterScrollHeight).toBe(initialScrollHeight);

  // Dispatching pointerdown clears the nudge indicator immediately
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
  await expect(page.getByTestId('game-interactive-content')).not.toHaveAttribute('data-idle-nudge', 'true');
  await expect(promptCompanion).not.toHaveAttribute('data-companion-nudge-active', 'true');
});

async function expectPromptCompanionFitsViewport(page: Page) {
  await installCompanionFixture(page);
  for (const path of ['/alphabet', '/assembly', '/complete-letter', '/counting', '/addition']) {
    await start(page, path);
    const promptCompanion = page.getByTestId('prompt-companion');
    const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
    const back = page.getByRole('button', { name: 'Späť' });
    const answers = page.getByTestId('game-answer-region').getByRole('button');
    await expect(promptCompanion).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const dims = await page.evaluate(() => ({
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    }));
    expect(dims.scrollHeight, `${path} active round overflowed vertically`).toBeLessThanOrEqual(dims.clientHeight + 1);
    const box = await promptCompanion.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
    await expectWithinViewport(page, promptCompanion);
    await expectWithinViewport(page, replay);
    await expectNoPairwiseOverlap([promptCompanion, replay, back]);
    await expectNoPairwiseOverlap([promptCompanion, ...(await answers.all())]);
  }
}

test('@geometry active round with prompt-companion fits without overflow or overlap', async ({ page }) => {
  test.setTimeout(60_000);
  await expectPromptCompanionFitsViewport(page);
});

test('active round with prompt-companion fits narrow short 568x320 and 320x568 viewports', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 568, height: 320 });
  await expectPromptCompanionFitsViewport(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await expectPromptCompanionFitsViewport(page);
});

test('post-clip WebGL pause reaches 0 fps and resize updates canvas without resuming continuous drawing', async ({ page }) => {
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

  // Past clip duration (~2.0 s), draw calls reach 0 fps (0 new calls over 10 RAF ticks)
  await expect.poll(async () => {
    const before = await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls ?? 0);
    await page.evaluate(() => new Promise<void>(resolve => {
      let frames = 0;
      const next = () => { if (++frames === 10) resolve(); else requestAnimationFrame(next); };
      requestAnimationFrame(next);
    }));
    const after = await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls ?? 0);
    return after - before;
  }, { timeout: 10000, intervals: [200] }).toBe(0);

  // Resize viewport while paused: canvas dimensions update and remain non-empty
  const canvas = page.getByTestId('learning-companion').locator('canvas');
  const prevWidth = await canvas.evaluate((el: HTMLCanvasElement) => el.clientWidth);
  await page.setViewportSize({ width: 568, height: 320 });
  await expect.poll(async () => canvas.evaluate((el: HTMLCanvasElement) => el.clientWidth)).not.toBe(prevWidth);
  const newWidth = await canvas.evaluate((el: HTMLCanvasElement) => el.clientWidth);
  expect(newWidth).toBeGreaterThan(0);

  // Verify it did not resume continuous 60 fps drawing
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0;
    const next = () => { if (++frames === 10) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
  const drawBefore = await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls ?? 0);
  await page.evaluate(() => new Promise<void>(resolve => {
    let frames = 0;
    const next = () => { if (++frames === 10) resolve(); else requestAnimationFrame(next); };
    requestAnimationFrame(next);
  }));
  const drawAfter = await page.evaluate(() => (window as typeof window & { companionDrawCalls?: number }).companionDrawCalls ?? 0);
  expect(drawAfter - drawBefore).toBe(0);
});

async function expectCompanionControlsFit(page: Page, locale: 'sk' | 'cs') {
  await installCompanionFixture(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedLocalStorage(page, { 'hrave-ucenie-app-settings': { locale } });
  for (const state of ['companion-success', 'companion-failure', 'companion-final-correct', 'companion-final-failure', 'companion-zero-score']) {
    await page.goto(`/ui-kit?example=game-shell&state=${state}`);
    await expect(page.getByRole('status')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const controls = page.getByRole('status').getByRole('button');
    for (const control of await controls.all()) await expectWithinViewport(page, control);
    await expectNoPairwiseOverlap(controls);
    await expect(page.getByTestId('learning-companion')).toBeVisible();
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
    test.setTimeout(90_000);
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

test('@geometry all 11 games with prompt-companion fit without overflow or overlap', async ({ page }) => {
  test.setTimeout(120_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await installCompanionFixture(page);
  await stubAudioPlayback(page);
  const viewport = page.viewportSize() ?? { width: 1280, height: 900 };

  for (const game of RELEASE_GAME_CASES) {
    await start(page, game.path);
    const promptCompanion = page.getByTestId('prompt-companion');
    const instruction = page.getByTestId('game-visible-instruction');
    const answerRegion = page.getByTestId('game-answer-region');
    await expect(promptCompanion, `${game.id} @ ${viewport.width}x${viewport.height}`).toBeVisible();
    await expect(instruction, `${game.id} instruction`).toBeVisible();
    await expect(answerRegion, `${game.id} answer region`).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectWithinViewport(page, promptCompanion);
    await expectWithinViewport(page, instruction);
    await expectWithinViewport(page, answerRegion);
    await expectNoPairwiseOverlap([promptCompanion, instruction, answerRegion]);
  }

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('cross-screen walk transition from home to prompt companion docks cleanly without duplicating WebGL', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.addInitScript(() => {
    const w = window as typeof window & {
      __companionWebglCreations?: number;
      __sawCompanionWalk?: boolean;
    };
    w.__companionWebglCreations = 0;
    w.__sawCompanionWalk = false;
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, ...args: Parameters<typeof origGetContext>) {
        const ctx = origGetContext.apply(this, args);
        if (ctx && (args[0] === 'webgl' || args[0] === 'webgl2') && !this.dataset.webglCounted) {
          this.dataset.webglCounted = '1';
          w.__companionWebglCreations = (w.__companionWebglCreations ?? 0) + 1;
        }
        return ctx;
      },
    });
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-companion-walking="true"]')) {
        w.__sawCompanionWalk = true;
      }
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-companion-walking'] });
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-companion-walking'] });
      });
    }
  });
  await installCompanionFixture(page);
  await stubAudioPlayback(page);
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/');
  const homeCompanion = page.getByTestId('home-companion');
  await expect(homeCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(homeCompanion.locator('canvas')).toBeVisible();

  await page.locator('[data-testid="game-card"][href="/alphabet"]').click();
  await page.waitForURL((url) => url.pathname === '/alphabet');
  await waitForGamePhase(page, 'awaiting-answer');

  const promptCompanion = page.getByTestId('prompt-companion');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion.locator('canvas')).toBeVisible();
  await expect.poll(() => page.locator('[data-companion-walking="true"]').count()).toBe(0);

  expect(await page.evaluate(() => (window as typeof window & { __sawCompanionWalk?: boolean }).__sawCompanionWalk)).toBe(true);
  expect(await page.evaluate(() => (window as typeof window & { __companionWebglCreations?: number }).__companionWebglCreations)).toBe(1);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('living idle continues smoothly after one-shot wave and freezes at 0 fps when document becomes hidden', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.addInitScript(() => {
    const w = window as typeof window & { __drawCalls?: number; __fakeHidden?: boolean };
    w.__drawCalls = 0;
    w.__fakeHidden = false;
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => Boolean(w.__fakeHidden),
    });
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const method of ['drawElements', 'drawArrays'] as const) {
        const original = prototype[method];
        Object.defineProperty(prototype, method, {
          value: function (this: WebGLRenderingContext, ...args: unknown[]) {
            w.__drawCalls = (w.__drawCalls ?? 0) + 1;
            return Reflect.apply(original, this, args);
          },
        });
      }
    }
  });
  await installCompanionFixture(page);
  await page.goto('/');

  const homeCompanion = page.getByTestId('home-companion');
  await expect(homeCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(homeCompanion.locator('canvas')).toBeVisible();
  // Wait for welcome wave to settle into continuous living idle_breathe
  await expect(homeCompanion).toHaveAttribute('data-companion-animation', 'idle_breathe', { timeout: 6000 });

  const beforeLive = await page.evaluate(() => (window as typeof window & { __drawCalls?: number }).__drawCalls ?? 0);
  await expect.poll(
    async () => (await page.evaluate(() => (window as typeof window & { __drawCalls?: number }).__drawCalls ?? 0)),
    { timeout: 2000, message: 'living idle should keep animating smoothly' },
  ).toBeGreaterThan(beforeLive);

  const frozenBase = await page.evaluate(() => {
    const w = window as typeof window & { __drawCalls?: number; __fakeHidden?: boolean };
    w.__fakeHidden = true;
    document.dispatchEvent(new Event('visibilitychange'));
    return new Promise<number>(resolve => {
      let frames = 0;
      const settle = () => {
        if (++frames >= 4) resolve(w.__drawCalls ?? 0);
        else requestAnimationFrame(settle);
      };
      requestAnimationFrame(settle);
    });
  });
  await page.waitForTimeout(220);
  const frozenAfter = await page.evaluate(() => (window as typeof window & { __drawCalls?: number }).__drawCalls ?? 0);
  expect(frozenAfter, 'hidden tab must pause WebGL rendering to 0 fps').toBe(frozenBase);

  const resumedAfter = await page.evaluate(() => {
    const w = window as typeof window & { __drawCalls?: number; __fakeHidden?: boolean };
    w.__fakeHidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
    return new Promise<number>(resolve => {
      let frames = 0;
      const step = () => {
        if (++frames >= 10) resolve(w.__drawCalls ?? 0);
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  });
  expect(resumedAfter, 'visible tab must resume living idle animation').toBeGreaterThan(frozenAfter);

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('parent companion mode setting switches between animated 3D, static image, and off', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await installCompanionFixture(page);

  await page.goto('/settings');
  await unlockParentGate(page);
  await page.getByRole('link', { name: /Aplikácia a vzhľad/ }).click();
  await page.waitForURL((url) => url.pathname === '/settings/app');

  await page.getByRole('radio', { name: 'Obrázok' }).click();
  await page.goto('/');
  const home = page.getByTestId('home-companion');
  await expect(home).toHaveAttribute('data-companion-representation', 'still');
  await expect(home.locator('img')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.goto('/settings');
  await unlockParentGate(page);
  await page.getByRole('link', { name: /Aplikácia a vzhľad/ }).click();
  await page.getByRole('radio', { name: 'Vypnutý' }).click();
  await page.goto('/');
  await expect(home).toHaveCount(0);
  await expect(page.locator('canvas')).toHaveCount(0);

  await page.goto('/settings');
  await unlockParentGate(page);
  await page.getByRole('link', { name: /Aplikácia a vzhľad/ }).click();
  await page.getByRole('radio', { name: 'Živý 3D' }).click();
  await page.goto('/');
  await expect(home).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(home.locator('canvas')).toBeVisible();

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('UI changes, walk handoffs, and overlay transitions avoid flicker, mid-walk restarts, and ghost stills', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.addInitScript(() => {
    const w = window as typeof window & {
      __companionWebglCreations?: number;
      __walkStartCount?: number;
      __wasWalking?: boolean;
      __promptCanvasDetached?: boolean;
    };
    w.__companionWebglCreations = 0;
    w.__walkStartCount = 0;
    w.__wasWalking = false;
    w.__promptCanvasDetached = false;

    const origGetContext = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, ...args: Parameters<typeof origGetContext>) {
        const ctx = origGetContext.apply(this, args);
        if (ctx && (args[0] === 'webgl' || args[0] === 'webgl2') && !this.dataset.webglFlickerTracked) {
          this.dataset.webglFlickerTracked = '1';
          w.__companionWebglCreations = (w.__companionWebglCreations ?? 0) + 1;
        }
        return ctx;
      },
    });

    const observer = new MutationObserver(() => {
      const walking = Boolean(document.querySelector('[data-companion-walking="true"]'));
      if (walking && !w.__wasWalking) {
        w.__walkStartCount = (w.__walkStartCount ?? 0) + 1;
      }
      w.__wasWalking = walking;
    });
    const startObserve = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-companion-walking'],
      });
    };
    if (document.body) startObserve();
    else window.addEventListener('DOMContentLoaded', startObserve);
  });

  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto('/');
  const homeCompanion = page.getByTestId('home-companion');
  await expect(homeCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(homeCompanion.locator('canvas')).toBeVisible();

  await page.locator('[data-testid="game-card"][href="/alphabet"]').click();
  await page.waitForURL((url) => url.pathname === '/alphabet');
  await waitForGamePhase(page, 'awaiting-answer');

  const promptCompanion = page.getByTestId('prompt-companion');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion.locator('canvas')).toBeVisible();
  await expect.poll(() => page.locator('[data-companion-walking="true"]').count()).toBe(0);

  expect(await page.evaluate(() => (window as typeof window & { __walkStartCount?: number }).__walkStartCount)).toBe(1);
  expect(await page.evaluate(() => (window as typeof window & { __companionWebglCreations?: number }).__companionWebglCreations)).toBe(1);

  const countOpaqueCanvasPixels = () => page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas || !canvas.width || !canvas.height) return 0;
    const probe = document.createElement('canvas');
    probe.width = 48;
    probe.height = 48;
    const ctx = probe.getContext('2d');
    if (!ctx) return 0;
    ctx.drawImage(canvas, 0, 0, 48, 48);
    const data = ctx.getImageData(0, 0, 48, 48).data;
    let nonEmpty = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] > 20) nonEmpty += 1;
    }
    return nonEmpty;
  });

  await expect.poll(countOpaqueCanvasPixels).toBeGreaterThan(25);

  // Track prompt-companion canvas continuity across rapid taps and wrong-attempt UI changes.
  await page.evaluate(() => {
    const w = window as typeof window & {
      __trackedPromptCanvas?: HTMLCanvasElement | null;
      __promptCanvasDetached?: boolean;
      __promptObserver?: MutationObserver;
    };
    const promptBtn = document.querySelector('[data-testid="prompt-companion"]');
    w.__trackedPromptCanvas = promptBtn?.querySelector('canvas') ?? null;
    w.__promptCanvasDetached = false;
    if (promptBtn && w.__trackedPromptCanvas) {
      w.__promptObserver = new MutationObserver(() => {
        if (!promptBtn.contains(w.__trackedPromptCanvas!)) {
          w.__promptCanvasDetached = true;
        }
      });
      w.__promptObserver.observe(promptBtn, { childList: true, subtree: true });
    }
  });

  await promptCompanion.click();
  await expect(promptCompanion).toHaveAttribute('data-companion-reason', 'tap');
  await waitForGamePhase(page, 'awaiting-answer');

  let state = await getE2EState(page);
  const wrongId1 = (state.gridItemIds as string[]).find(id => id !== state.correctItemId)!;
  await pressAnswerById(page, wrongId1);
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'gentle_try_again');
  await waitForGamePhase(page, 'awaiting-answer');

  state = await getE2EState(page);
  const wrongId2 = (state.gridItemIds as string[]).find(id => id !== state.correctItemId && id !== wrongId1) ?? wrongId1;
  await pressAnswerById(page, wrongId2);
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'encourage');
  await waitForGamePhase(page, 'awaiting-answer');

  const continuity = await page.evaluate(() => {
    const w = window as typeof window & {
      __trackedPromptCanvas?: HTMLCanvasElement | null;
      __promptCanvasDetached?: boolean;
      __promptObserver?: MutationObserver;
    };
    w.__promptObserver?.disconnect();
    return {
      detached: Boolean(w.__promptCanvasDetached),
      sameCanvas: document.querySelector('[data-testid="prompt-companion"] canvas') === w.__trackedPromptCanvas,
    };
  });
  expect(continuity).toEqual({ detached: false, sameCanvas: true });
  expect(await countOpaqueCanvasPixels()).toBeGreaterThan(25);

  // Opening and closing feedback overlay never pops a duplicate static img cutout behind the overlay.
  await completeCurrentRound(page, 'ALPHABET');
  await expect3D(page);
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'still');
  await expect(promptCompanion.locator('img')).toHaveCount(0);

  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion.locator('canvas')).toBeVisible();
  expect(await countOpaqueCanvasPixels()).toBeGreaterThan(25);

  expect(await page.evaluate(() => (window as typeof window & { __companionWebglCreations?: number }).__companionWebglCreations)).toBe(1);
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('cold first game open preserves rendered UI without blank frame and hops across Home, Game, and overlay timeout with idle-only round starts', async ({ page }) => {
  test.setTimeout(60_000);
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);

  await page.addInitScript(() => {
    const w = window as typeof window & {
      __travelStylesSeen?: string[];
      __hopStartCount?: number;
      __wasHopping?: boolean;
      __blankMainFrames?: number;
      __watchMainFrames?: boolean;
    };
    w.__travelStylesSeen = [];
    w.__hopStartCount = 0;
    w.__wasHopping = false;
    w.__blankMainFrames = 0;
    w.__watchMainFrames = false;

    const tick = () => {
      if (w.__watchMainFrames && !document.querySelector('main')) {
        w.__blankMainFrames = (w.__blankMainFrames ?? 0) + 1;
      }
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);

    const observer = new MutationObserver(() => {
      const el = document.querySelector('[data-companion-walking="true"]');
      const style = el?.getAttribute('data-companion-travel-style');
      if (style && w.__travelStylesSeen && !w.__travelStylesSeen.includes(style)) {
        w.__travelStylesSeen.push(style);
      }
      const isHopping = Boolean(el && style === 'hop');
      if (isHopping && !w.__wasHopping) {
        w.__hopStartCount = (w.__hopStartCount ?? 0) + 1;
      }
      w.__wasHopping = isHopping;
    });
    const startObserve = () => {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-companion-walking', 'data-companion-travel-style'],
      });
    };
    if (document.body) startObserve();
    else window.addEventListener('DOMContentLoaded', startObserve);
  });

  await installCompanionFixture(page);
  await stubAudioPlayback(page, { holdPraise: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  // Delay cold lazy chunk load for NumbersGame so Suspense transition behavior is directly exercised.
  await page.route('**/NumbersGame*', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await route.continue();
  });

  await page.goto('/');
  const homeCompanion = page.getByTestId('home-companion');
  await expect(homeCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(homeCompanion.locator('canvas')).toBeVisible();

  await page.evaluate(() => {
    (window as typeof window & { __watchMainFrames?: boolean; __blankMainFrames?: number }).__blankMainFrames = 0;
    (window as typeof window & { __watchMainFrames?: boolean }).__watchMainFrames = true;
  });

  await page.locator('[data-testid="game-card"][href="/numbers"]').click();
  await page.waitForURL((url) => url.pathname === '/numbers');
  await waitForGamePhase(page, 'awaiting-answer');

  const promptCompanion = page.getByTestId('prompt-companion');
  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'idle_breathe');
  await expect(promptCompanion).toHaveAttribute('data-companion-reason', 'idle');
  await expect.poll(() => page.locator('[data-companion-walking="true"]').count()).toBe(0);

  const blankMainFrames = await page.evaluate(() => (window as typeof window & { __blankMainFrames?: number }).__blankMainFrames ?? -1);
  expect(blankMainFrames).toBe(0);
  expect(await page.evaluate(() => (window as typeof window & { __hopStartCount?: number }).__hopStartCount)).toBe(1);

  // Trigger success overlay (bear hops to overlay), wait longer than 1400ms with NO click,
  // then release audio so the overlay closes automatically via timeout.
  await completeCurrentRound(page, 'NUMBERS');
  await expect3D(page);
  await page.waitForTimeout(1600);
  await releasePraise(page);
  await waitForGamePhase(page, 'awaiting-answer');

  await expect(promptCompanion).toHaveAttribute('data-companion-representation', 'rendered3D');
  await expect(promptCompanion).toHaveAttribute('data-companion-animation', 'idle_breathe');
  await expect(promptCompanion).toHaveAttribute('data-companion-reason', 'idle');
  await expect.poll(() => page.locator('[data-companion-walking="true"]').count()).toBe(0);

  const hopCount = await page.evaluate(() => (window as typeof window & { __hopStartCount?: number }).__hopStartCount);
  expect(hopCount).toBe(3);

  const styles = await page.evaluate(() => (window as typeof window & { __travelStylesSeen?: string[] }).__travelStylesSeen ?? []);
  expect(styles).toEqual(['hop']);

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
