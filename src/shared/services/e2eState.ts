export type E2EOverlay = 'success' | 'failure' | 'session-complete' | null;

export interface E2EGlobalState {
  overlay: E2EOverlay;
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

export function setE2EState(state: E2EGlobalState): void {
  if (!isE2EActive()) return;
  window.__E2E__ = state;
}
