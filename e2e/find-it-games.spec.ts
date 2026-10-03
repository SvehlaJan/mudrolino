import { test, expect } from './support/fixtures';
import AxeBuilder from '@axe-core/playwright';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';
import { getAudioEvents, pressAnswerById, stubAudioPlayback, stubSpeechSynthesis, waitForGamePhase } from './support/gameHarness';
import {
  expectNoHorizontalOverflow,
  expectMinimumTarget,
  expectWithinViewport,
  expectNoPairwiseOverlap,
} from './support/layoutAssertions';
import { CANONICAL_VIEWPORTS } from './support/viewports';
import type { E2EGlobalState } from '../src/shared/services/e2eState';
import type { GamePhase } from '../src/shared/game/gameState';
import { PRAISE_ENTRIES } from '../src/shared/locales/sk';

// One PraiseEntry is picked per success transition (see FindItGame.tsx), so the visible
// success title is whichever entry's text was chosen, not always the generic default.
const ANY_PRAISE_TEXT = new RegExp(PRAISE_ENTRIES.map((entry) => entry.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));

function toAxeParams(page: import('@playwright/test').Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

function isSeriousAxeViolation(impact: string | null | undefined): boolean {
  return ['critical', 'serious'].includes(impact ?? '');
}

interface FindItE2EState extends E2EGlobalState {
  gameId: 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'WORDS';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  gridItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}

interface FindItGameCase {
  name: string;
  gameId: FindItE2EState['gameId'];
  path: string;
}

const FIND_IT_GAMES: FindItGameCase[] = [
  { name: 'alphabet', gameId: 'ALPHABET', path: '/alphabet' },
  { name: 'syllables', gameId: 'SYLLABLES', path: '/syllables' },
  { name: 'numbers', gameId: 'NUMBERS', path: '/numbers' },
  { name: 'words', gameId: 'WORDS', path: '/words' },
];

async function findWrongId(page: import('@playwright/test').Page): Promise<string> {
  const state = await getE2EState<FindItE2EState>(page);
  const wrongId = state.gridItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target grid item').toBeDefined();
  return wrongId!;
}

/**
 * OverlayFrame's enter transition fades opacity 0→1 over motionPreset.transition (180ms),
 * even under reduced motion (only translate/scale are dropped, not the fade itself).
 * Playwright's own `visible` check resolves the instant opacity leaves 0, so an axe scan
 * immediately after can catch a genuinely mid-fade frame and report a transient contrast
 * "violation" that never reflects the settled panel. Wait for the observable computed
 * opacity to actually reach 1 before scanning, rather than a blind sleep.
 */
async function waitForOverlaySettled(page: import('@playwright/test').Page): Promise<void> {
  await page.waitForFunction(() => {
    const panel = document.querySelector('[role="status"][aria-live="polite"]');
    return panel !== null && getComputedStyle(panel).opacity === '1';
  });
}

/** Plays a fresh alphabet session to session-complete via pointer, answering every round correctly. */
async function completeAlphabetSession(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  for (let round = 0; round < 5; round += 1) {
    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    if (round < 4) {
      await waitForGamePhase(page, 'answered-correctly');
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }
  await waitForGamePhase(page, 'session-complete');
}

for (const game of FIND_IT_GAMES) {
  test(`${game.name}: round has one target among unique answer ids`, async ({ page }) => {
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    const state = await getE2EState<FindItE2EState>(page);
    expect(state.gameId).toBe(game.gameId);
    expect(state.correctItemId).not.toBeNull();
    expect(state.gridItemIds.length).toBeGreaterThan(1);
    expect(new Set(state.gridItemIds).size).toBe(state.gridItemIds.length);
    expect(state.gridItemIds).toContain(state.correctItemId);
  });

  test(`${game.name}: answers are available while the opening prompt plays`, async ({ page }) => {
    await stubAudioPlayback(page, { holdFirstClip: true });
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    await expect.poll(() => page.evaluate(() => (
      window as typeof window & { __heldAudio?: HTMLMediaElement[] }
    ).__heldAudio?.length ?? 0)).toBe(1);
    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
  });

  test(`${game.name}: correct answer reaches success feedback`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
    await expect(page.getByRole('status')).toContainText(ANY_PRAISE_TEXT);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test(`${game.name}: one and two wrong answers stay recoverable and do not count the round`, async ({ page }) => {
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const wrongId = await findWrongId(page);
      await pressAnswerById(page, wrongId);
      // 'answered-incorrectly' auto-clears to 'awaiting-answer' after TIMING.FEEDBACK_RESET_MS —
      // too transient to assert directly, so wait for the settled retry state instead.
      await waitForGamePhase(page, 'awaiting-answer');
    }

    const state = await getE2EState<FindItE2EState>(page);
    expect(state.roundsPlayed).toBe(0);
    expect(state.wrongAttempts).toBe(2);
  });

  test(`${game.name}: three wrong answers reach failure feedback and count the round without crediting it`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const wrongId = await findWrongId(page);
      await pressAnswerById(page, wrongId);
      if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
    }

    await waitForGamePhase(page, 'answered-incorrectly');
    await expect(page.getByRole('status')).toContainText('Nevadí');
    const state = await getE2EState<FindItE2EState>(page);
    expect(state.roundsPlayed).toBe(1);

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}

test('@geometry FindIt retry announcement does not change prompt or answer geometry', async ({ page }) => {
  await stubAudioPlayback(page);
  await stubSpeechSynthesis(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const state = await getE2EState<FindItE2EState>(page);
  const geometry = () => page.evaluate(() => {
    const box = (selector: string) => {
      const rect = document.querySelector(selector)!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    };
    return {
      prompt: box('[data-testid="game-visible-instruction"]'),
      answers: box('[data-testid="game-answer-region"]'),
      interactive: box('[data-testid="game-interactive-content"]'),
    };
  });
  const before = await geometry();

  const wrongId = state.gridItemIds.find((id) => id !== state.correctItemId)!;
  await pressAnswerById(page, wrongId);
  await page.waitForFunction(() => window.__E2E__?.gamePhase === 'answered-incorrectly', undefined, { polling: 20 });

  expect(await geometry()).toEqual(before);
  await expect(page.getByTestId('game-retry-status')).toHaveClass(/sr-only/);
  await expect(page.getByTestId('game-retry-status')).toHaveAttribute('aria-live', 'polite');
});

// alphabet is the sole full-session representative for this cluster: round-counter and
// session-complete logic is shared via FindItGame across all 4 games, so one full run is
// enough to cover it. See docs/superpowers/specs/2026-07-08-automated-ui-testing-design.md.
test('alphabet: a full 5-round session reaches an explicit completion that requires a choice', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  for (let round = 0; round < 5; round += 1) {
    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    if (round < 4) {
      await waitForGamePhase(page, 'answered-correctly');
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }

  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();

  await page.clock.install();
  await page.clock.runFor(5500);
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

async function releaseHeldAudioClip(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const testWindow = window as typeof window & { __heldAudio?: HTMLMediaElement[] };
    const audio = testWindow.__heldAudio?.shift();
    if (!audio) throw new Error('expected a verdict audio clip to be held');
    audio.dispatchEvent(new Event('ended'));
  });
}

async function playUntilPraiseIsHeld(page: import('@playwright/test').Page, praiseCount: number, answerId: string): Promise<void> {
  await pressAnswerById(page, answerId);
  await expect.poll(async () => (await getAudioEvents(page))
    .filter((event) => event.startsWith('start:sk/praise/')).length).toBe(praiseCount);
  await waitForGamePhase(page, 'answered-correctly');
}

test('alphabet: non-final success advances one second after the full verdict audio finishes', async ({ page }) => {
  await stubAudioPlayback(page, { holdPraise: true });
  await stubSpeechSynthesis(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const state = await getE2EState<FindItE2EState>(page);

  await playUntilPraiseIsHeld(page, 1, state.correctItemId!);
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(1200);
  expect((await getE2EState<FindItE2EState>(page)).gamePhase).toBe('answered-correctly');
  await releaseHeldAudioClip(page);
  await expect.poll(async () => (await getAudioEvents(page)).filter((event) => event.startsWith('finish:sk/praise/')).length).toBe(1);
  expect((await getAudioEvents(page)).at(-1)).toMatch(/^finish:sk\/praise\//);
  await page.clock.runFor(999);
  expect((await getE2EState<FindItE2EState>(page)).gamePhase).toBe('answered-correctly');
  await expect(page.getByRole('button', { name: 'Pokračovať' })).toBeVisible();
  await page.clock.runFor(1);
  expect((await getE2EState<FindItE2EState>(page)).gamePhase).toBe('ready');
  await page.clock.resume();
  await waitForGamePhase(page, 'awaiting-answer');
  await expect(page.getByRole('button', { name: 'Pokračovať' })).toHaveCount(0);
  expect((await getE2EState<FindItE2EState>(page)).roundsPlayed).toBe(1);
});

test('alphabet: Continue and backdrop advance, while panel clicks do not dismiss success', async ({ page }) => {
  await stubAudioPlayback(page, { holdPraise: true });
  await stubSpeechSynthesis(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  let state = await getE2EState<FindItE2EState>(page);

  await playUntilPraiseIsHeld(page, 1, state.correctItemId!);
  await releaseHeldAudioClip(page);
  await expect.poll(async () => (await getAudioEvents(page)).filter((event) => event.startsWith('finish:sk/praise/')).length).toBe(1);
  await page.waitForTimeout(500);
  await page.getByRole('status').locator('p').first().click();
  await expect(page.getByRole('button', { name: 'Pokračovať' })).toBeVisible();
  await page.getByRole('button', { name: 'Pokračovať' }).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await page.waitForTimeout(1100);
  await expect(page.getByRole('button', { name: 'Pokračovať' })).toHaveCount(0);
  expect((await getE2EState<FindItE2EState>(page)).roundsPlayed).toBe(1);

  state = await getE2EState<FindItE2EState>(page);
  await pressAnswerById(page, state.correctItemId!);
  await expect.poll(async () => (await getAudioEvents(page)).filter((event) => event.startsWith('start:sk/praise/')).length).toBe(2);
  await waitForGamePhase(page, 'answered-correctly');
  await releaseHeldAudioClip(page);
  await expect.poll(async () => (await getAudioEvents(page)).filter((event) => event.startsWith('finish:sk/praise/')).length).toBe(2);
  await page.waitForTimeout(500);
  await page.locator('div.fixed.inset-0.z-50').click({ position: { x: 2, y: 2 } });
  await waitForGamePhase(page, 'awaiting-answer');
  await page.waitForTimeout(1100);
  await expect(page.getByRole('button', { name: 'Pokračovať' })).toHaveCount(0);
  expect((await getE2EState<FindItE2EState>(page)).roundsPlayed).toBe(2);
});

test('alphabet: final session recap never auto-advances', async ({ page }) => {
  await stubAudioPlayback(page);
  await stubSpeechSynthesis(page);
  await completeAlphabetSession(page);
  await page.clock.install();
  await page.clock.runFor(1300);
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
});

test('alphabet: completion actions stay absent until session-complete after a final correct answer', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  for (let round = 0; round < 4; round += 1) {
    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
    await page.getByRole('button', { name: 'Pokračovať' }).click();
    await waitForGamePhase(page, 'ready');
  }

  await page.evaluate(() => {
    (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = ['/praise/'];
  });

  const finalState = await getE2EState<FindItE2EState>(page);
  await pressAnswerById(page, finalState.correctItemId!);
  // The reducer marks this the final round 'answered-correctly' immediately, but
  // SHOW_SESSION_COMPLETE only dispatches once the terminal praise audio actually
  // finishes — a window narrow enough that expect.poll's growing interval can skip
  // straight past it to 'session-complete', so this uses a tight fixed-interval check.
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-correctly',
    undefined,
    { polling: 20 },
  );
  // The terminal praise/session-complete audio has not resolved yet — completion
  // actions must wait for it.
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Domov' })).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __heldAudio?: HTMLMediaElement[] }
  ).__heldAudio?.length ?? 0)).toBe(1);
  await releaseHeldAudioClip(page);
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
});

test('alphabet: completion actions stay absent until session-complete after a final exhausted-failure round', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  for (let round = 0; round < 4; round += 1) {
    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
    await page.getByRole('button', { name: 'Pokračovať' }).click();
    await waitForGamePhase(page, 'ready');
  }

  await page.evaluate(() => {
    (window as typeof window & { __holdAudioPaths?: string[] }).__holdAudioPaths = ['/phrases/nevadi'];
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const wrongId = await findWrongId(page);
    await pressAnswerById(page, wrongId);
    if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
  }

  // Same instability as the success path above: this exhausting wrong answer reaches
  // 'answered-incorrectly' immediately, but SHOW_SESSION_COMPLETE only dispatches once
  // the failure verdict/explanation audio finishes.
  await page.waitForFunction(
    () => window.__E2E__?.gamePhase === 'answered-incorrectly',
    undefined,
    { polling: 20 },
  );
  // That audio has not resolved yet, so completion actions must not be present.
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Domov' })).toHaveCount(0);

  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { __heldAudio?: HTMLMediaElement[] }
  ).__heldAudio?.length ?? 0)).toBe(1);
  await releaseHeldAudioClip(page);
  await waitForGamePhase(page, 'session-complete');
  await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
});

const EXPECTED_GAMES = [
  { path: '/alphabet', title: 'Abeceda', instruction: 'Nájdi písmeno, ktoré počuješ.', material: 'wood' },
  { path: '/syllables', title: 'Slabiky', instruction: 'Nájdi slabiku, ktorú počuješ.', material: 'magnet' },
  { path: '/numbers', title: 'Čísla', instruction: 'Nájdi číslo, ktoré počuješ.', material: 'wood' },
  { path: '/words', title: 'Slová', instruction: 'Nájdi obrázok k slovu.', material: 'picture' },
] as const;

for (const exp of EXPECTED_GAMES) {
  test(`${exp.path}: shared shell and material contract`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);

    await page.goto(exp.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    await expect(page.getByRole('heading', { level: 1, name: exp.title })).toBeVisible();
    await expect(page.getByTestId('game-visible-instruction')).toContainText(exp.instruction);
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
    await expect(page.getByTestId('game-answer-region')).toBeVisible();
    await expect(page.locator(`[data-material="${exp.material}"]`).first()).toBeVisible();

    if (exp.path === '/words') {
      const promptHeading = page.locator('main h2');
      await expect(promptHeading).toBeVisible();
      const text = await promptHeading.textContent();
      expect(text).toMatch(/^[A-ZÁČĎÉÍĹĽŇÓÔŔŠŤÚÝŽ-]+$/);
    }

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}

test.describe('Task 7: Viewport tests for FindIt games', () => {
  const VIEWPORTS = [
    CANONICAL_VIEWPORTS.narrowPhone,
    CANONICAL_VIEWPORTS.shortLandscape,
  ];

  for (const game of FIND_IT_GAMES) {
    for (const viewport of VIEWPORTS) {
      test(`${game.name} meets viewport constraints at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(game.path);
        await page.getByRole('button', { name: 'Hrať' }).click();

        await expectNoHorizontalOverflow(page);
        await expectWithinViewport(page, page.getByRole('button', { name: 'Zopakovať zadanie' }));

        const answers = page.locator('[data-testid="game-answer-region"] button');
        const count = await answers.count();
        expect(count).toBeGreaterThan(0);

        for (let i = 0; i < count; i++) {
          const answer = answers.nth(i);
          await expectWithinViewport(page, answer);
          await expectMinimumTarget(page, answer, 48);
        }

        await expectNoPairwiseOverlap(answers);
      });
    }
  }

  const TABLET_DESKTOP_GAMES = [
    { name: 'alphabet', path: '/alphabet' },
    { name: 'words', path: '/words' },
  ];
  const LARGE_VIEWPORTS = [
    CANONICAL_VIEWPORTS.tabletPortrait,
    CANONICAL_VIEWPORTS.desktop,
  ];

  for (const game of TABLET_DESKTOP_GAMES) {
    for (const viewport of LARGE_VIEWPORTS) {
      test(`${game.name} meets viewport constraints at ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto(game.path);
        await page.getByRole('button', { name: 'Hrať' }).click();

        await expectNoHorizontalOverflow(page);
        await expectWithinViewport(page, page.getByRole('button', { name: 'Zopakovať zadanie' }));

        const answers = page.locator('[data-testid="game-answer-region"] button');
        const count = await answers.count();
        for (let i = 0; i < count; i++) {
          const answer = answers.nth(i);
          await expectWithinViewport(page, answer);
          await expectMinimumTarget(page, answer, 48);
        }

        await expectNoPairwiseOverlap(answers);
      });
    }
  }
});

test.describe('Task 7: Rotation preservation and keyboard control', () => {
  test('rotation preserves round state, answers, and focus without restarting', async ({ page }) => {
    await page.setViewportSize(CANONICAL_VIEWPORTS.phonePortrait);
    await page.goto('/alphabet');
    await page.getByRole('button', { name: 'Hrať' }).click();

    const state1 = await getE2EState<FindItE2EState>(page);
    const firstAnswer = page.locator('[data-testid="game-answer-region"] button').first();
    await firstAnswer.focus();

    await page.setViewportSize(CANONICAL_VIEWPORTS.phoneLandscape);
    const state2 = await getE2EState<FindItE2EState>(page);
    expect(state2.correctItemId).toBe(state1.correctItemId);
    expect(state2.gridItemIds).toEqual(state1.gridItemIds);
    expect(state2.roundsPlayed).toBe(state1.roundsPlayed);
    await expect(firstAnswer).toBeVisible();
    await expect(firstAnswer).toBeFocused();

    const wrongId = await findWrongId(page);
    await pressAnswerById(page, wrongId);
    await waitForGamePhase(page, 'awaiting-answer');
    const state3 = await getE2EState<FindItE2EState>(page);
    expect(state3.wrongAttempts).toBe(1);

    await page.setViewportSize(CANONICAL_VIEWPORTS.phonePortrait);
    const state4 = await getE2EState<FindItE2EState>(page);
    expect(state4.correctItemId).toBe(state1.correctItemId);
    expect(state4.gridItemIds).toEqual(state1.gridItemIds);
    expect(state4.wrongAttempts).toBe(1);
    expect(state4.roundsPlayed).toBe(state1.roundsPlayed);
  });

  for (const game of FIND_IT_GAMES) {
    test(`${game.name}: full keyboard navigation, activation, and feedback flow`, async ({ page }) => {
      await page.goto(game.path);
      const playButton = page.getByRole('button', { name: 'Hrať' });
      await playButton.focus();
      await page.keyboard.press('Enter');

      const state = await getE2EState<FindItE2EState>(page);
      expect(state.correctItemId).not.toBeNull();

      await page.keyboard.press('Tab');
      const replay = page.getByRole('button', { name: 'Zopakovať zadanie' });
      const replayIsFocused = await replay.evaluate((el) => el === document.activeElement);
      if (replayIsFocused) {
        await page.keyboard.press('Space');
        await page.keyboard.press('Tab');
      }

      await page.keyboard.press('ArrowRight');
      const correctBtn = page.locator(`[data-answer-id="${state.correctItemId}"]`);
      await correctBtn.focus();
      await page.keyboard.press('Enter');

      await waitForGamePhase(page, 'answered-correctly');
      const continueBtn = page.getByRole('button', { name: 'Pokračovať' });
      await expect(continueBtn).toBeVisible();
      await continueBtn.focus();
      await page.keyboard.press('Enter');
      await waitForGamePhase(page, 'ready');
    });
  }

  test('alphabet: keyboard operates Play again and Home at completion without a pointer', async ({ page }) => {
    async function playRoundByKeyboard(): Promise<void> {
      const state = await getE2EState<FindItE2EState>(page);
      const correctBtn = page.locator(`[data-answer-id="${state.correctItemId}"]`);
      await correctBtn.focus();
      await page.keyboard.press('Enter');
    }

    await page.goto('/alphabet');
    const playButton = page.getByRole('button', { name: 'Hrať' });
    await playButton.focus();
    await page.keyboard.press('Enter');

    for (let round = 0; round < 5; round += 1) {
      await playRoundByKeyboard();
      if (round < 4) {
        await waitForGamePhase(page, 'answered-correctly');
        const continueBtn = page.getByRole('button', { name: 'Pokračovať' });
        await continueBtn.focus();
        await page.keyboard.press('Enter');
        await waitForGamePhase(page, 'ready');
      }
    }

    await waitForGamePhase(page, 'session-complete');
    const playAgainBtn = page.getByRole('button', { name: 'Hrať znova' });
    await playAgainBtn.focus();
    await page.keyboard.press('Enter');
    await waitForGamePhase(page, 'ready');

    for (let round = 0; round < 5; round += 1) {
      await playRoundByKeyboard();
      if (round < 4) {
        await waitForGamePhase(page, 'answered-correctly');
        const continueBtn = page.getByRole('button', { name: 'Pokračovať' });
        await continueBtn.focus();
        await page.keyboard.press('Enter');
        await waitForGamePhase(page, 'ready');
      }
    }

    await waitForGamePhase(page, 'session-complete');
    const homeBtn = page.getByRole('button', { name: 'Domov' });
    await homeBtn.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  });
});

test.describe('Task 7: Accessibility, reduced motion, and zoom', () => {
  test('reduced motion and axe accessibility on FindIt round and feedback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/alphabet');
    await page.getByRole('button', { name: 'Hrať' }).click();

    const roundAxe = await new AxeBuilder(toAxeParams(page))
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(roundAxe.violations.filter(v => isSeriousAxeViolation(v.impact))).toEqual([]);

    const state = await getE2EState<FindItE2EState>(page);
    await pressAnswerById(page, state.correctItemId!);
    await waitForGamePhase(page, 'answered-correctly');
    await expect(page.getByRole('status')).toContainText(ANY_PRAISE_TEXT);
    await waitForOverlaySettled(page);

    const successAxe = await new AxeBuilder(toAxeParams(page))
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(successAxe.violations.filter(v => isSeriousAxeViolation(v.impact))).toEqual([]);
  });

  test('reduced motion: retry feedback is announced without card text under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/alphabet');
    await page.getByRole('button', { name: 'Hrať' }).click();

    const wrongId = await findWrongId(page);
    await pressAnswerById(page, wrongId);
    await page.waitForFunction(
      () => window.__E2E__?.gamePhase === 'answered-incorrectly',
      undefined,
      { polling: 20 },
    );
    // Reduced motion replaces translation/animation with an immediate opacity-only change —
    // the live announcement remains available while the card has no retry text.
    await expect(page.getByRole('status')).toContainText('Skús ešte raz');
    await expect(page.locator(`[data-answer-id="${wrongId}"]`)).not.toContainText('Skús ešte raz');
  });

  test('reduced motion: exhausted-failure feedback is legible with no serious axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/alphabet');
    await page.getByRole('button', { name: 'Hrať' }).click();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const wrongId = await findWrongId(page);
      await pressAnswerById(page, wrongId);
      if (attempt < 2) await waitForGamePhase(page, 'awaiting-answer');
    }
    await waitForGamePhase(page, 'answered-incorrectly');
    await expect(page.getByRole('status')).toContainText('Nevadí');
    await waitForOverlaySettled(page);

    const failureAxe = await new AxeBuilder(toAxeParams(page))
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(failureAxe.violations.filter(v => isSeriousAxeViolation(v.impact))).toEqual([]);
  });

  test('reduced motion: completion is legible with finite presentation and no serious axe violations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await completeAlphabetSession(page);

    await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Domov' })).toBeVisible();
    await waitForOverlaySettled(page);

    const completionAxe = await new AxeBuilder(toAxeParams(page))
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(completionAxe.violations.filter(v => isSeriousAxeViolation(v.impact))).toEqual([]);

    // Finite, not a looping celebration: the completion actions must still be exactly the
    // same after a long wait, matching the existing 5.5s completion-persistence assertion.
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Hrať znova' })).toBeVisible();
  });

  for (const game of FIND_IT_GAMES) {
    test(`${game.name}: no serious or critical axe violations on the active round`, async ({ page }) => {
      await page.goto(game.path);
      await page.getByRole('button', { name: 'Hrať' }).click();

      const results = await new AxeBuilder(toAxeParams(page))
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.filter(v => isSeriousAxeViolation(v.impact))).toEqual([]);
    });
  }

  test('alphabet: no serious or critical axe violations on completion', async ({ page }) => {
    await completeAlphabetSession(page);
    await waitForOverlaySettled(page);
    const results = await new AxeBuilder(toAxeParams(page))
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(results.violations.filter(v => isSeriousAxeViolation(v.impact))).toEqual([]);
  });

  test('200% zoom maintains accessibility without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 450 });
    await page.goto('/alphabet');
    await page.getByRole('button', { name: 'Hrať' }).click();

    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
    const answers = page.locator('[data-testid="game-answer-region"] button');
    const count = await answers.count();
    for (let i = 0; i < count; i++) {
      await expectMinimumTarget(page, answers.nth(i), 48);
    }
  });

  test('200% zoom keeps completion actions reachable without horizontal scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 640, height: 450 });
    await completeAlphabetSession(page);

    await expectNoHorizontalOverflow(page);
    const playAgain = page.getByRole('button', { name: 'Hrať znova' });
    const home = page.getByRole('button', { name: 'Domov' });
    await playAgain.scrollIntoViewIfNeeded();
    await expect(playAgain).toBeVisible();
    await home.scrollIntoViewIfNeeded();
    await expect(home).toBeVisible();
  });
});

test.describe('Task 7: Active rounds never require scrolling to reveal an answer', () => {
  for (const game of FIND_IT_GAMES) {
    // GameShell's AppScreen renders `main` with `overflow-y-auto` (see AppScreen.tsx) — that
    // element, not `document.documentElement`, is the real scroll container for a round.
    // `document.documentElement` never overflows regardless of `main`'s own content, since
    // `main` scrolls internally within a fixed `100svh` box; checking the document instead of
    // `main` would pass even if every answer required scrolling to reach.
    test(`${game.name}: fits the viewport without vertical overflow at narrow and short viewports`, async ({ page }) => {
      for (const viewport of [CANONICAL_VIEWPORTS.narrowPhone, CANONICAL_VIEWPORTS.shortLandscape]) {
        await page.setViewportSize(viewport);
        await page.goto(game.path);
        await page.getByRole('button', { name: 'Hrať' }).click();

        const overflow = await page.evaluate(() => {
          const main = document.querySelector('main');
          if (!main) return Infinity;
          return main.scrollHeight - main.clientHeight;
        });
        expect(overflow, `${game.name} at ${viewport.width}x${viewport.height} must not need vertical scrolling inside main to reveal an answer`).toBeLessThanOrEqual(1);

        const mainBounds = await page.evaluate(() => {
          const main = document.querySelector('main');
          if (!main) return null;
          const rect = main.getBoundingClientRect();
          return { top: rect.top, bottom: rect.bottom };
        });
        expect(mainBounds, `${game.name} at ${viewport.width}x${viewport.height} must render a main scroll container`).not.toBeNull();

        const answers = page.locator('[data-testid="game-answer-region"] button');
        const count = await answers.count();
        expect(count).toBeGreaterThan(0);
        for (let i = 0; i < count; i++) {
          const answerBounds = await answers.nth(i).evaluate((el) => {
            const rect = el.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom };
          });
          expect(
            answerBounds.top,
            `${game.name} answer ${i} at ${viewport.width}x${viewport.height} must start within main's visible area without scrolling`,
          ).toBeGreaterThanOrEqual(mainBounds!.top - 1);
          expect(
            answerBounds.bottom,
            `${game.name} answer ${i} at ${viewport.width}x${viewport.height} must end within main's visible area without scrolling`,
          ).toBeLessThanOrEqual(mainBounds!.bottom + 1);
        }
      }
    });
  }
});
