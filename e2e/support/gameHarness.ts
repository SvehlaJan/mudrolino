import { expect, type Page } from '@playwright/test';
import { installAudioStub, installSpeechStub } from './audioStubs';
import type { GamePhase } from '../../src/shared/game/gameState';
import type { E2EGlobalState } from '../../src/shared/services/e2eState';
import type { GameId } from '../../src/shared/types';

const stubPriorities = new WeakMap<Page, { audio: number; speech: number }>();

function nextStubPriority(page: Page, kind: 'audio' | 'speech'): number {
  const priorities = stubPriorities.get(page) ?? { audio: 0, speech: 0 };
  priorities[kind] += 1;
  stubPriorities.set(page, priorities);
  return priorities[kind];
}

interface GameHarnessState extends E2EGlobalState {
  audioEvents?: string[];
  phase?: GamePhase;
  gamePhase?: GamePhase;
  correctItemId?: string | null;
  correctSide?: 'left' | 'right' | null;
  correctSum?: number | null;
  correctTileOrder?: string[];
  filledMissingCount?: number;
}

export async function getAudioEvents(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const state = (window as unknown as { __E2E__?: GameHarnessState }).__E2E__;
    return state?.audioEvents ?? [];
  });
}

/** Resets only test-observer events, preserving parent-gate and game E2E adapters. */
export async function clearAudioEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const current = (window as unknown as { __E2E__?: GameHarnessState }).__E2E__;
    if (!current) throw new Error('window.__E2E__ was never initialized');
    (window as unknown as { __E2E__?: GameHarnessState }).__E2E__ = {
      ...current,
      audioEvents: [],
    };
  });
}

export async function readGamePhase(page: Page): Promise<GamePhase | undefined> {
  return page.evaluate(
    () => {
      const state = (window as unknown as { __E2E__?: GameHarnessState }).__E2E__;
      return state?.gamePhase ?? state?.phase;
    },
  );
}

export async function waitForGamePhase(page: Page, phase: GamePhase): Promise<void> {
  await expect.poll(() => readGamePhase(page)).toBe(phase);
}

/** Reads the shared `paused` flag every `useGameSession`-backed game publishes to `__E2E__`. */
export async function readPaused(page: Page): Promise<boolean | undefined> {
  return page.evaluate(
    () => (window as unknown as { __E2E__?: GameHarnessState & { paused?: boolean } }).__E2E__?.paused,
  );
}

/**
 * Waits for the inherited session's own `paused` flag to settle to the expected value, instead
 * of an arbitrary sleep — a parent-pause/resume transition runs through React state and (on
 * resume) game-specific board recovery, so the flag can lag a click or an `unlockParentGate()`
 * call by a tick or two.
 */
export async function waitForPaused(page: Page, expected: boolean): Promise<void> {
  await expect.poll(() => readPaused(page)).toBe(expected);
}

/**
 * Returns just the clip *paths* actually started, in playback order, collapsing the interleaved
 * `start:`/`finish:` pair AudioManager records for each clip (see `recordE2EAudioEvent`) down to
 * one entry per clip. Lets a test assert an exact playback sequence, or that no clip played
 * twice, without over-specifying `finish:` timing.
 */
export async function getAudioClipPaths(page: Page): Promise<string[]> {
  const events = await getAudioEvents(page);
  return events.filter((event) => event.startsWith('start:')).map((event) => event.slice('start:'.length));
}

/**
 * Delivers deterministic speech completion for behavior and layout checks. Native media,
 * fallback output and cancellation are exercised separately by real-media/audio-output specs;
 * ordering checks use explicit held events when the completion boundary matters.
 */
export async function stubSpeechSynthesis(page: Page): Promise<void> {
  await page.addInitScript(installSpeechStub, nextStubPriority(page, 'speech'));
}

/** Settles bundled HTML audio immediately, with options to hold selected clips on demand. */
export async function stubAudioPlayback(
  page: Page,
  options: { holdPraise?: boolean; holdPaths?: string[]; holdFirstClip?: boolean } = {},
): Promise<void> {
  await page.addInitScript(installAudioStub, {
    holdPraise: options.holdPraise ?? false,
    holdPaths: options.holdPaths ?? [],
    holdFirstClip: options.holdFirstClip ?? false,
    priority: nextStubPriority(page, 'audio'),
  });
}

/** Uses the actual visible answer control; it never invokes React handlers directly. */
export async function pressAnswerById(page: Page, id: string): Promise<void> {
  const answer = page.locator(`[data-answer-id=${JSON.stringify(id)}]:visible`);
  await expect(answer, `expected visible answer ${id}`).toHaveCount(1);
  await answer.click();
}

async function readCurrentGameState(page: Page): Promise<GameHarnessState> {
  const state = await page.evaluate(
    () => (window as unknown as { __E2E__?: GameHarnessState }).__E2E__,
  );
  expect(state, 'window.__E2E__ was never initialized').toBeDefined();
  return state as GameHarnessState;
}

function requiredValue<T>(value: T | null | undefined, field: string): T {
  if (value === null || value === undefined) throw new Error(`expected active ${field} in the E2E oracle`);
  return value;
}

/**
 * Completes the active round through the controls a child can see and press.
 * The test-only oracle only identifies the current answer; it never invokes a
 * component callback or mutates the game state.
 */
export async function completeCurrentRound(
  page: Page,
  gameId: GameId,
  completionPhase: GamePhase = 'answered-correctly',
): Promise<void> {
  switch (gameId) {
    case 'ALPHABET':
    case 'SYLLABLES':
    case 'NUMBERS':
    case 'WORDS':
    case 'FIRST_LETTER':
    case 'COMPLETE_SYLLABLE':
    case 'COUNTING_ITEMS': {
      const { correctItemId } = await readCurrentGameState(page);
      await pressAnswerById(page, requiredValue(correctItemId, 'correctItemId'));
      return;
    }
    case 'ADDITION': {
      const { correctSum } = await readCurrentGameState(page);
      await pressAnswerById(page, String(requiredValue(correctSum, 'correctSum')));
      return;
    }
    case 'COMPARE_QUANTITIES': {
      const { correctSide } = await readCurrentGameState(page);
      const side = requiredValue(correctSide, 'correctSide');
      const answer = page.locator(`[data-answer-side=${side}]:visible`);
      await expect(answer, `expected visible ${side} comparison answer`).toHaveCount(1);
      await answer.click();
      return;
    }
    case 'COMPLETE_LETTER': {
      while (await readGamePhase(page) !== completionPhase) {
        const { correctItemId, filledMissingCount = 0 } = await readCurrentGameState(page);
        // The final blank clears the answer oracle before the verdict phase is
        // published. Wait for that verdict instead of asking for another tile.
        if (correctItemId === null || correctItemId === undefined) {
          await waitForGamePhase(page, completionPhase);
          return;
        }
        await pressAnswerById(page, correctItemId);
        await expect.poll(async () => {
          if (await readGamePhase(page) === completionPhase) return true;
          return (await readCurrentGameState(page)).filledMissingCount! > filledMissingCount;
        }).toBe(true);
      }
      return;
    }
    case 'ASSEMBLY': {
      const { correctTileOrder } = await readCurrentGameState(page);
      const tileOrder = requiredValue(correctTileOrder, 'correctTileOrder');
      for (const [index, tileId] of tileOrder.entries()) {
        const tile = page.locator(`[data-tile-id=${JSON.stringify(tileId)}]:visible`);
        await expect(tile, `expected visible assembly tile ${tileId}`).toHaveCount(1);
        await tile.click();
        await expect.poll(() => readGamePhase(page)).toBe(
          index === tileOrder.length - 1 ? completionPhase : 'awaiting-answer',
        );
      }
      return;
    }
    default: {
      const exhaustiveGameId: never = gameId;
      throw new Error(`unsupported release game: ${exhaustiveGameId}`);
    }
  }
}
