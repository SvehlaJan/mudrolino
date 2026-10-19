# Celebration policy — implementation and behavioral test seed

Used by [runtime Task 4](runtime.md). Add the test first, observe it fail, then
add the implementation. Keep this module free of React, Three.js, timers, storage
and audio. The React adapter owns monotonic timestamps and timeout cleanup.

## `src/avatar/companionCelebration.ts`

```ts
import type { GameState } from '../shared/game/gameState';

export const CELEBRATION_WINDOW_MS = 1600;

export type CelebrationObservation = Pick<GameState,
  'phase' | 'paused' | 'feedback' | 'roundsPlayed' | 'correctRounds'>;

export interface CelebrationEvent {
  eventKey: string;
  roundsPlayed: number;
  correctRounds: number;
  startedAtMs: number;
  expiresAtMs: number;
}

export interface CelebrationState {
  run: number;
  roundsPlayed: number;
  correctRounds: number;
  handledKey: string | null;
  active: CelebrationEvent | null;
}

export type CelebrationAction =
  | { type: 'observe'; observation: CelebrationObservation; nowMs: number }
  | { type: 'expire'; eventKey: string; nowMs: number };

export function createCelebrationState(): CelebrationState {
  return { run: 0, roundsPlayed: 0, correctRounds: 0, handledKey: null, active: null };
}

function isCorrectFeedback(observation: CelebrationObservation): boolean {
  return observation.feedback === 'success'
    && observation.roundsPlayed > 0
    && observation.correctRounds > 0
    && (observation.phase === 'answered-correctly'
      || observation.phase === 'session-complete');
}

export function isCelebrationVisible(
  active: CelebrationEvent | null,
  observation: CelebrationObservation,
): boolean {
  return active !== null
    && !observation.paused
    && isCorrectFeedback(observation)
    && active.roundsPlayed === observation.roundsPlayed
    && active.correctRounds === observation.correctRounds;
}

export function celebrationReducer(
  state: CelebrationState,
  action: CelebrationAction,
): CelebrationState {
  if (action.type === 'expire') {
    if (!state.active || state.active.eventKey !== action.eventKey
      || action.nowMs < state.active.expiresAtMs) return state;
    return { ...state, active: null };
  }

  const observation = action.observation;
  const restarted = observation.roundsPlayed < state.roundsPlayed
    || observation.correctRounds < state.correctRounds;
  const base = restarted
    ? { ...createCelebrationState(), run: state.run + 1 }
    : state;
  const next = {
    ...base,
    roundsPlayed: observation.roundsPlayed,
    correctRounds: observation.correctRounds,
  };
  const key = isCorrectFeedback(observation)
    ? `${next.run}:${observation.roundsPlayed}:${observation.correctRounds}`
    : null;

  if (key === null || observation.paused) {
    return { ...next, handledKey: key ?? next.handledKey, active: null };
  }
  if (key === next.handledKey) {
    return next.active && action.nowMs >= next.active.expiresAtMs
      ? { ...next, active: null }
      : next;
  }
  return {
    ...next,
    handledKey: key,
    active: {
      eventKey: key,
      roundsPlayed: observation.roundsPlayed,
      correctRounds: observation.correctRounds,
      startedAtMs: action.nowMs,
      expiresAtMs: action.nowMs + CELEBRATION_WINDOW_MS,
    },
  };
}
```

## `src/avatar/companionCelebration.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  CELEBRATION_WINDOW_MS,
  celebrationReducer,
  createCelebrationState,
  isCelebrationVisible,
  type CelebrationObservation,
  type CelebrationState,
} from './companionCelebration';

const ready: CelebrationObservation = {
  phase: 'awaiting-answer', paused: false, feedback: null,
  roundsPlayed: 0, correctRounds: 0,
};
const success: CelebrationObservation = {
  ...ready, phase: 'answered-correctly', feedback: 'success',
  roundsPlayed: 1, correctRounds: 1,
};
const observe = (
  state: CelebrationState,
  observation: CelebrationObservation,
  nowMs = 100,
) => celebrationReducer(state, { type: 'observe', observation, nowMs });

describe('completed correct-answer celebration', () => {
  it('creates one bounded event, without extending it on rerender', () => {
    const first = observe(createCelebrationState(), success);
    const repeated = observe(first, { ...success }, 900);
    expect(repeated.active).toBe(first.active);
    expect(first.active?.expiresAtMs).toBe(100 + CELEBRATION_WINDOW_MS);
    expect(isCelebrationVisible(first.active, success)).toBe(true);
  });

  it('observes a final answer even when React first sees session-complete', () => {
    const final = { ...success, phase: 'session-complete' as const,
      roundsPlayed: 5, correctRounds: 5 };
    expect(observe(createCelebrationState(), final).active).not.toBeNull();
  });

  it('does not replay the final answer when its panel changes', () => {
    const final = { ...success, roundsPlayed: 5, correctRounds: 5 };
    const first = observe(createCelebrationState(), final);
    const completed = observe(first, { ...final, phase: 'session-complete' }, 500);
    expect(completed.active).toBe(first.active);
  });

  it.each([
    ready,
    { ...ready, phase: 'resolving-answer' as const },
    { ...ready, phase: 'answered-incorrectly' as const },
    { ...success, phase: 'answered-incorrectly' as const, feedback: 'failure' as const },
    { ...success, phase: 'session-complete' as const, feedback: 'failure' as const },
    { ...success, phase: 'session-complete' as const, feedback: null },
  ])('ignores progress, retries, failures and non-answer completion: %j', state => {
    expect(observe(createCelebrationState(), state).active).toBeNull();
  });

  it('expires once and ignores stale or early timeout callbacks', () => {
    const first = observe(createCelebrationState(), success);
    const eventKey = first.active!.eventKey;
    const deadline = first.active!.expiresAtMs;
    expect(celebrationReducer(first, { type: 'expire', eventKey: 'stale', nowMs: deadline })).toBe(first);
    expect(celebrationReducer(first, { type: 'expire', eventKey, nowMs: deadline - 1 })).toBe(first);
    const expired = celebrationReducer(first, { type: 'expire', eventKey, nowMs: deadline });
    expect(expired.active).toBeNull();
    expect(observe(expired, success, deadline + 500).active).toBeNull();
  });

  it('hides immediately on next question, then accepts the next correct answer', () => {
    const first = observe(createCelebrationState(), success);
    const nextQuestion = { ...ready, roundsPlayed: 1, correctRounds: 1 };
    expect(isCelebrationVisible(first.active, nextQuestion)).toBe(false);
    const next = observe(first, nextQuestion, 200);
    expect(next.active).toBeNull();
    const second = observe(next, { ...success, roundsPlayed: 2, correctRounds: 2 }, 500);
    expect(second.active?.eventKey).not.toBe(first.active?.eventKey);
  });

  it('consumes a paused success and never replays it on resume', () => {
    const first = observe(createCelebrationState(), success);
    const paused = { ...success, paused: true };
    expect(isCelebrationVisible(first.active, paused)).toBe(false);
    expect(observe(observe(first, paused, 200), success, 300).active).toBeNull();
    const initiallyPaused = observe(createCelebrationState(), paused);
    expect(observe(initiallyPaused, success, 300).active).toBeNull();
  });

  it('can celebrate round one after a real new run resets the counters', () => {
    const first = observe(createCelebrationState(), success);
    const reset = observe(first, ready, 200);
    const restarted = observe(reset, success, 500);
    expect(restarted.active?.eventKey).not.toBe(first.active?.eventKey);
    expect(restarted.active?.startedAtMs).toBe(500);
  });

  it('does not revive when a late renderer or repeated observation arrives', () => {
    const first = observe(createCelebrationState(), success);
    const late = observe(first, success, 100 + CELEBRATION_WINDOW_MS);
    expect(late.active).toBeNull();
    expect(observe(late, success, 5000).active).toBeNull();
  });
});
```

The adapter/browser checks still need to prove timeout cleanup, Strict Mode
reconnection, current-state hiding before effects, actual audio pacing and
route unmounting. These tests establish the pure event contract only.
