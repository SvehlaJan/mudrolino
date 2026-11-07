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

  it('cycles through celebrate, wave, clap, jump, and finale across successive correct rounds', () => {
    let state = createCelebrationState();
    const expected = ['celebrate', 'wave', 'clap', 'jump', 'finale'] as const;
    for (let round = 1; round <= 5; round++) {
      state = observe(state, { ...success, roundsPlayed: round, correctRounds: round }, round * 100);
      expect(state.active?.animationName).toBe(expected[round - 1]);
      state = observe(state, { ...ready, roundsPlayed: round, correctRounds: round }, round * 100 + 50);
    }
    const finalDirect = observe(
      createCelebrationState(),
      { ...success, phase: 'session-complete', roundsPlayed: 3, correctRounds: 2 },
      900,
    );
    expect(finalDirect.active?.animationName).toBe('finale');
  });
});
