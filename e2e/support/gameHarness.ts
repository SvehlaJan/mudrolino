import { expect, type Page } from '@playwright/test';
import type { GamePhase } from '../../src/shared/game/gameState';
import type { E2EGlobalState } from '../../src/shared/services/e2eState';

interface GameHarnessState extends E2EGlobalState {
  audioEvents?: string[];
  gamePhase?: GamePhase;
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
    () => (window as unknown as { __E2E__?: GameHarnessState }).__E2E__?.gamePhase,
  );
}

export async function waitForGamePhase(page: Page, phase: GamePhase): Promise<void> {
  await expect.poll(() => readGamePhase(page)).toBe(phase);
}

/** Uses the actual visible answer control; it never invokes React handlers directly. */
export async function pressAnswerById(page: Page, id: string): Promise<void> {
  const answer = page.locator(`[data-answer-id=${JSON.stringify(id)}]:visible`);
  await expect(answer, `expected visible answer ${id}`).toHaveCount(1);
  await answer.click();
}
