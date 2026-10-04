import { expect, type Page } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { getE2EState } from './e2eHook';
import { pressAnswerById, waitForGamePhase } from './gameHarness';
import { seedLocalStorage } from './persistenceFixtures';
import type { E2EGlobalState } from '../../src/shared/services/e2eState';
import type { GamePhase } from '../../src/shared/game/gameState';

export function toAxeParams(page: Page): ConstructorParameters<typeof AxeBuilder>[0] {
  return { page } as unknown as ConstructorParameters<typeof AxeBuilder>[0];
}

export function isSeriousAxeViolation(impact: string | null | undefined): boolean {
  return ['critical', 'serious'].includes(impact ?? '');
}

export interface FirstLetterE2EState extends E2EGlobalState {
  gameId: 'FIRST_LETTER';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  answerItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}

export interface CompleteLetterE2EState extends E2EGlobalState {
  gameId: 'COMPLETE_LETTER';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  answerItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
  filledMissingCount: number;
  missingCount: number;
}

export interface CompleteSyllableE2EState extends E2EGlobalState {
  gameId: 'COMPLETE_SYLLABLE';
  gamePhase: GamePhase;
  paused: boolean;
  correctItemId: string | null;
  answerItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}

export interface AssemblyE2EState extends E2EGlobalState {
  gameId: 'ASSEMBLY';
  gamePhase: GamePhase;
  paused: boolean;
  wrongAttempts: number;
  roundsPlayed: number;
  totalTaps: number;
  replaying: boolean;
  trayTileIds: string[];
  placedTileIds: (string | null)[];
  correctTileOrder: string[];
}

export const ASSEMBLY_JAHODA = { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' };

export const ASSEMBLY_MAMA = { word: 'Mama', syllables: 'ma-ma', emoji: '👩', audioKey: 'mama' };

export const LONG_LABEL_WORDS = {
  'first-letter': { word: 'Džús', syllables: 'džús', emoji: '🥤', audioKey: 'dzus' },
  'complete-letter': { word: 'Džús', syllables: 'džús', emoji: '🥤', audioKey: 'dzus' },
  'complete-syllable': { word: 'Stromalina', syllables: 'stro-ma-li-na', emoji: '🌳', audioKey: 'stromalina' },
  assembly: { word: 'Dlhý strom', syllables: 'dlo-hý-stro', emoji: '🌳', audioKey: 'dlhy-strom' },
} as const;

/**
 * Pins the eligible word pool to exactly one deterministic word, bypassing the random 33-word
 * default pool: `hrave-ucenie-seeded-sk: 'true'` short-circuits ContentProvider's own seeding
 * (LocalContentRepository.seed() no-ops once already seeded), and every default word the
 * migration re-adds behind the scenes lands `enabled: false` (see contentState.ts's `migrate()`),
 * leaving only this one custom, enabled, ready word playable.
 */
export function seedSingleLiteracyWord(
  page: import('@playwright/test').Page,
  word: { word: string; syllables: string; emoji: string; audioKey: string },
) {
  return seedLocalStorage(page, {
    'hrave-ucenie-seeded-sk': 'true',
    'hrave-ucenie-user-words-sk': {
      version: 2,
      items: [
        {
          id: `e2e-assembly-${word.audioKey}`,
          word: word.word,
          syllables: word.syllables,
          emoji: word.emoji,
          audioKey: word.audioKey,
          status: 'ready',
          enabled: true,
          isDefault: false,
          locale: 'sk',
          order: 0,
        },
      ],
    },
  });
}

export function seedSingleAssemblyWord(
  page: import('@playwright/test').Page,
  word: { word: string; syllables: string; emoji: string; audioKey: string },
) {
  return seedSingleLiteracyWord(page, word);
}

export function expectEventsInOrder(events: string[], expected: Array<string | RegExp>): void {
  let after = -1;
  for (const event of expected) {
    const index = events.findIndex((actual, index) => index > after
      && (typeof event === 'string' ? actual === event : event.test(actual)));
    expect(index, `expected ${event} after event ${after}`).toBeGreaterThan(after);
    after = index;
  }
}

// ============================================================================
// Task 7: cluster-wide hardening.
//
// Tasks 3-6 each covered pause/keyboard/reduced-motion/focus for what that task's own brief
// required, on the mechanic it migrated. This section closes the remaining gaps across all four
// games together: the full canonical-viewport matrix, pause/rotation/focus exercised uniformly,
// and assistive/reduced-motion checks exercised uniformly — reusing each game's own oracle hook
// rather than duplicating the golden-path coverage already above.
// ============================================================================

export interface BespokeRoundState extends E2EGlobalState {
  gameId: 'FIRST_LETTER' | 'COMPLETE_LETTER' | 'COMPLETE_SYLLABLE' | 'ASSEMBLY';
  gamePhase: GamePhase;
  paused: boolean;
  roundsPlayed: number;
  wrongAttempts: number;
}

export interface GenericChoiceState extends BespokeRoundState {
  correctItemId: string | null;
  answerItemIds: string[];
}

/** The 3-choice games (first-letter, complete-letter, complete-syllable) share one E2E state
 * shape and one single-tap AnswerGroup mechanic, so they share one set of round helpers. */
export async function genericAnswerWrong(page: Page): Promise<string> {
  const state = await getE2EState<GenericChoiceState>(page);
  const wrongId = state.answerItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target answer').toBeDefined();
  await pressAnswerById(page, wrongId!);
  await page.waitForFunction(
    attempts => window.__E2E__?.wrongAttempts === attempts,
    state.wrongAttempts + 1,
    { polling: 20 },
  );
  return wrongId!;
}

export async function genericAnswerCorrect(page: Page, completionPhase: GamePhase = 'answered-correctly'): Promise<string> {
  const state = await getE2EState<GenericChoiceState>(page);
  await pressAnswerById(page, state.correctItemId!);
  await waitForGamePhase(page, completionPhase);
  return state.correctItemId!;
}

export async function genericFinishSessionCorrectly(page: Page): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await genericAnswerCorrect(page, round === 4 ? 'session-complete' : 'answered-correctly');
    if (round < 4) {
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }
  await waitForGamePhase(page, 'session-complete');
}

/** Assembly has no single-tap "wrong answer" — a wrong outcome only exists at a wrong FULL
 * rail (see AssemblyGame's own documented exception), so its round helpers place three tiles. */
export async function asmAnswerWrong(page: Page): Promise<string> {
  const state = await getE2EState<AssemblyE2EState>(page);
  const [first, second, third] = state.correctTileOrder;
  const wrongOrder = [second, first, third];
  const tray = page.getByTestId('play-tray');
  await tray.locator(`[data-tile-id="${wrongOrder[0]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${wrongOrder[1]}"]`).click();
  await waitForGamePhase(page, 'awaiting-answer');
  await tray.locator(`[data-tile-id="${wrongOrder[2]}"]`).click();
  // Retry may unlock immediately after movement; observe the durable attempt counter.
  await page.waitForFunction(
    attempts => window.__E2E__?.wrongAttempts === attempts,
    state.wrongAttempts + 1,
    { polling: 20 },
  );
  return wrongOrder[2];
}

export async function asmAnswerCorrect(page: Page, completionPhase: GamePhase = 'answered-correctly'): Promise<string> {
  const state = await getE2EState<AssemblyE2EState>(page);
  const tray = page.getByTestId('play-tray');
  const order = state.correctTileOrder;
  for (const tileId of order.slice(0, -1)) {
    await tray.locator(`[data-tile-id="${tileId}"]`).click();
    await waitForGamePhase(page, 'awaiting-answer');
  }
  const lastTileId = order[order.length - 1];
  await tray.locator(`[data-tile-id="${lastTileId}"]`).click();
  await waitForGamePhase(page, completionPhase);
  return lastTileId;
}

export async function asmFinishSessionCorrectly(page: Page): Promise<void> {
  for (let round = 0; round < 5; round += 1) {
    await asmAnswerCorrect(page, round === 4 ? 'session-complete' : 'answered-correctly');
    if (round < 4) {
      await page.getByRole('button', { name: 'Pokračovať' }).click();
      await waitForGamePhase(page, 'ready');
    }
  }
  await waitForGamePhase(page, 'session-complete');
}

export interface BespokeGameCase {
  name: 'first-letter' | 'complete-letter' | 'complete-syllable' | 'assembly';
  path: string;
  heading: string;
  instruction: string;
  /** Navigates, seeds any fixture content Assembly needs for determinism, and starts a round
   * through the real Hrať control. */
  enterPlay(page: Page): Promise<void>;
  /** Taps/places a wrong answer and waits for its recorded attempt.
   * Returns the acted-on control's `data-answer-id`/`data-tile-id`. */
  answerWrong(page: Page): Promise<string>;
  /** Taps/places the correct answer(s), completing exactly one round successfully. Returns the
   * acted-on control's `data-answer-id`/`data-tile-id`. */
  answerCorrect(page: Page): Promise<string>;
  /** Plays every round of a 5-round session correctly, reaching session-complete. */
  finishSessionCorrectly(page: Page): Promise<void>;
}

export const BESPOKE_GAMES: BespokeGameCase[] = [
  {
    name: 'first-letter',
    path: '/first-letter',
    heading: 'Prvé písmenko',
    instruction: 'Ktorým písmenom sa začína toto slovo?',
    enterPlay: async (page) => {
      await page.goto('/first-letter');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: genericAnswerWrong,
    answerCorrect: genericAnswerCorrect,
    finishSessionCorrectly: genericFinishSessionCorrectly,
  },
  {
    name: 'complete-letter',
    path: '/complete-letter',
    heading: 'Doplň písmeno',
    instruction: 'Doplň chýbajúce písmeno',
    enterPlay: async (page) => {
      await page.goto('/complete-letter');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: genericAnswerWrong,
    answerCorrect: genericAnswerCorrect,
    finishSessionCorrectly: genericFinishSessionCorrectly,
  },
  {
    name: 'complete-syllable',
    path: '/complete-syllable',
    heading: 'Doplň slabiku',
    instruction: 'Doplň chýbajúcu slabiku',
    enterPlay: async (page) => {
      await page.goto('/complete-syllable');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: genericAnswerWrong,
    answerCorrect: genericAnswerCorrect,
    finishSessionCorrectly: genericFinishSessionCorrectly,
  },
  {
    name: 'assembly',
    path: '/assembly',
    heading: 'Skladaj',
    instruction: 'Usporiadaj slabiky',
    enterPlay: async (page) => {
      await seedSingleAssemblyWord(page, ASSEMBLY_JAHODA);
      await page.goto('/assembly');
      await page.getByRole('button', { name: 'Hrať' }).click();
    },
    answerWrong: asmAnswerWrong,
    answerCorrect: asmAnswerCorrect,
    finishSessionCorrectly: asmFinishSessionCorrectly,
  },
];

/** Selects a control by either attribute a game's round helpers might report — `data-answer-id`
 * for the three choice games, `data-tile-id` for Assembly. */
export function actedControl(page: Page, id: string) {
  return page.locator(`[data-answer-id="${id}"], [data-tile-id="${id}"]`);
}

/**
 * OverlayFrame's enter transition fades opacity 0→1 over motionPreset.transition (180ms), even
 * under reduced motion (only translate/scale are dropped, not the fade itself). Playwright's own
 * `visible` check resolves the instant opacity leaves 0, so an axe scan immediately after can
 * catch a genuinely mid-fade frame and report a transient contrast "violation" that never
 * reflects the settled panel — wait for the observable computed opacity to actually reach 1.
 */
export async function waitForOverlaySettled(page: Page): Promise<void> {
  await page.waitForFunction(() => {
    const panel = document.querySelector('[role="status"][aria-live="polite"]');
    return panel !== null && getComputedStyle(panel).opacity === '1';
  });
}

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];

/**
 * Confirms `locator` isn't silently clipped by an ancestor whose own overflow is restricting it
 * (e.g. a `max-h-*`/`overflow-y-auto` wrapper whose content is taller than its own box, or a
 * plain `overflow-hidden` container). `expectWithinViewport` alone can't catch this — a clipped
 * element's bounding box can sit entirely within the page viewport while genuinely invisible
 * under its own ancestor's clip, exactly the shape of gap Task 7 closed in `PictureCard`/
 * `WordRail`'s short-layout wrapper (a fixed cap that left WordRail no room at all).
 */
export async function expectNotClippedByAncestorOverflow(locator: ReturnType<Page['locator']>): Promise<void> {
  const clippingAncestor = await locator.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    let node = el.parentElement;
    while (node) {
      const style = getComputedStyle(node);
      const restricts = ['auto', 'hidden', 'scroll'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
      if (restricts) {
        const ancestorRect = node.getBoundingClientRect();
        const visibleTop = ancestorRect.top;
        const visibleBottom = ancestorRect.top + node.clientHeight;
        if (rect.top < visibleTop - 1 || rect.bottom > visibleBottom + 1) {
          return node.getAttribute('data-testid') ?? node.className ?? node.tagName;
        }
      }
      node = node.parentElement;
    }
    return null;
  });
  expect(clippingAncestor, `expected element not to be clipped by ancestor "${clippingAncestor}"`).toBeNull();
}

/** Every interactive playing-surface control a bespoke round exposes — AnswerGroup's choice
 * buttons for the three choice games, the felt tray tiles for Assembly. */
export const PLAY_SURFACE_CONTROLS =
  '[data-testid="game-answer-region"] button, [data-testid="play-tray"] [data-tile-id]';

/**
 * AnswerGroup derives its grid geometry (column count and an explicit pixel `--tile-size`) inside
 * a ResizeObserver callback, so tile positions can still move a frame or two after first paint or
 * after any layout change. Clicking before that settles can land the pointer on a neighbouring
 * tile. The rotation test below already polls for this after a resize; this helper generalises it
 * to "two consecutive reads of every control's box agree", which is what the screenshot capture
 * tool needs too (`tools/screenshots/capture.mjs`).
 */
export async function waitForPlaySurfaceSettled(page: Page): Promise<void> {
  await page.locator(PLAY_SURFACE_CONTROLS).first().waitFor({ state: 'visible' });
  let previous = '';
  await expect.poll(async () => {
    const current = await page.evaluate((selector) => Array.from(document.querySelectorAll(selector))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return `${Math.round(rect.x)},${Math.round(rect.y)},${Math.round(rect.width)},${Math.round(rect.height)}`;
      })
      .join('|'), PLAY_SURFACE_CONTROLS);
    const settled = current !== '' && current === previous;
    previous = current;
    return settled;
  }).toBe(true);
}

// ============================================================================
// Final whole-phase review: same-tick double-tap re-entrancy.
//
// Every one of the three choice games picks this round's praise entry and commits it to local
// React state *before* awaiting resolveAnswer, so useGameSession's own synchronous guard (its
// `answeringRef`) is set too late to protect that local write: a second tap landing in the same
// task overwrites the shown praise while the first tap's verdict audio is already built from the
// entry it replaced. Phase 5 hit exactly this class of bug in FindItGame.tsx, and Task 4's fix
// round hit it again in CompleteLetterGame.tsx; this closes it for the remaining two and keeps a
// regression test on all three.
// ============================================================================

export const DOUBLE_TAP_PRAISES = [
  { id: 'e2e-praise-alfa', text: 'Pochvala Alfa', emoji: '🅰️', audioKey: 'e2e-praise-alfa' },
  { id: 'e2e-praise-beta', text: 'Pochvala Beta', emoji: '🅱️', audioKey: 'e2e-praise-beta' },
] as const;

/**
 * Replaces the whole enabled praise pool with exactly two distinguishable entries. Seeding only
 * the praises (and deliberately *not* `hrave-ucenie-seeded-sk`) leaves the default word pool
 * untouched and enabled — LocalContentRepository.seed() still runs and re-adds every default
 * praise as `enabled: false`, so `praiseEntries` ends up as precisely these two.
 */
export function seedTwoPraises(page: Page) {
  return seedLocalStorage(page, {
    'hrave-ucenie-user-praises-sk': {
      version: 2,
      items: DOUBLE_TAP_PRAISES.map((praise, order) => ({
        ...praise,
        status: 'ready',
        enabled: true,
        isDefault: false,
        locale: 'sk',
        order,
      })),
    },
  });
}

/**
 * Makes `pickPraise` alternate instead of being random: successive `Math.random()` readings map
 * to the first and last entry of any list in turn. Two picks with nothing in between therefore
 * *always* disagree, which is what turns "the shown praise drifted from the spoken one" from a
 * coin flip into a deterministic failure whenever the ref guard is missing.
 */
export function stubAlternatingRandom(page: Page) {
  return page.addInitScript(() => {
    let reading = 0;
    Math.random = () => {
      reading += 1;
      return reading % 2 === 1 ? 0 : 0.999999;
    };
  });
}

export const DOUBLE_TAP_GAMES: Array<{ name: string; path: string; seed?(page: Page): Promise<void> }> = [
  { name: 'first-letter', path: '/first-letter' },
  { name: 'complete-syllable', path: '/complete-syllable' },
  {
    name: 'complete-letter',
    path: '/complete-letter',
    // One blank, so the very first correct tap is the round-winning one that picks a praise.
    seed: (page) => seedLocalStorage(page, { 'hrave-ucenie-settings': { completeLetterMissingCount: 1 } }),
  },
];
