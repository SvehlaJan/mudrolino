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
