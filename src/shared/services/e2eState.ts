export type E2EOverlay = 'success' | 'failure' | 'session-complete' | null;

export interface ParentGateE2EState {
  answer: number | null;
  unlock: () => void;
}

export interface E2EGlobalState {
  overlay?: E2EOverlay;
  parentGate?: ParentGateE2EState;
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
