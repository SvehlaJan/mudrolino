import type { GamePhase } from '../game/gameState';

export type E2EOverlay = 'success' | 'failure' | 'session-complete' | null;

export interface ParentGateE2EState {
  answer: number | null;
  unlock: () => void;
  /** How many times a wrong answer has finished its error → fresh-question recovery cycle. */
  errorRecoveries: number;
}

export interface E2EGlobalState {
  overlay?: E2EOverlay;
  parentGate?: ParentGateE2EState;
  /** Logical clip boundaries recorded by AudioManager in Vite's test mode only. */
  audioEvents?: string[];
  /** Shared game-session phase, published by games built on `useGameSession`. */
  gamePhase?: GamePhase;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __E2E__?: E2EGlobalState;
  }
}

export function isE2EActive(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'test';
}

export function mergeE2EState(
  current: E2EGlobalState | undefined,
  patch: Partial<E2EGlobalState>,
): E2EGlobalState {
  return { ...current, ...patch };
}

export function setE2EState(patch: Partial<E2EGlobalState>): void {
  if (!isE2EActive()) return;
  window.__E2E__ = mergeE2EState(window.__E2E__, patch);
}

/**
 * Audio observations are deliberately test-only: dev helpers retain their existing surface,
 * while browser tests can assert clip order without depending on playback durations.
 */
export function recordE2EAudioEvent(event: string): void {
  if (import.meta.env?.MODE !== 'test') return;
  const audioEvents = [...(window.__E2E__?.audioEvents ?? []), event];
  setE2EState({ audioEvents });
}

export function exposeParentGateE2E(
  state: ParentGateE2EState,
): () => void {
  if (import.meta.env.MODE !== 'test') return () => undefined;
  setE2EState({ parentGate: state });
  return () => {
    if (!window.__E2E__) return;
    const { parentGate: _removed, ...rest } = window.__E2E__;
    window.__E2E__ = rest;
  };
}
