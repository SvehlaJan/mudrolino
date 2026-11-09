import { describe, expect, it } from 'vitest';
import {
  ROUND_CELEBRATION_CLIPS,
  celebrationReducer,
  createCelebrationState,
  isCelebrationVisible,
  type CelebrationObservation,
  type CelebrationState,
} from './companionCelebration';

const ready: CelebrationObservation = {
  phase: 'awaiting-answer', paused: false, feedback: null,
  roundsPlayed: 0, correctRounds: 0, maxRounds: 5,
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

describe('completed correct-answer and summary celebration', () => {
  it('creates one persistent event for the overlay without resetting startedAtMs on rerender', () => {
    const first = observe(createCelebrationState(), success);
    const repeated = observe(first, { ...success }, 2500);
    expect(repeated.active).toBe(first.active);
    expect(first.active?.startedAtMs).toBe(100);
    expect(isCelebrationVisible(first.active, success)).toBe(true);
  });

  it('observes a final answer even when React first sees session-complete', () => {
    const final = { ...success, phase: 'session-complete' as const,
      roundsPlayed: 5, correctRounds: 5 };
    expect(observe(createCelebrationState(), final).active).not.toBeNull();
  });

  it('does not replay the final answer when its panel changes, even after 1600ms', () => {
    const final = { ...success, roundsPlayed: 5, correctRounds: 5 };
    const first = observe(createCelebrationState(), final, 100);
    const completed = observe(first, { ...final, phase: 'session-complete' }, 3000);
    expect(completed.active).toBe(first.active);
    expect(completed.active?.animationName).toBe('finale');
  });

  it('shows the finale celebration on session-complete even when the final round failed', () => {
    let state = createCelebrationState();
    state = observe(state, { ...success, roundsPlayed: 4, correctRounds: 4 }, 100);
    const failedFinal = {
      ...ready,
      phase: 'answered-incorrectly' as const,
      feedback: 'failure' as const,
      roundsPlayed: 5,
      correctRounds: 4,
    };
    state = observe(state, failedFinal, 200);
    expect(state.active).toBeNull();
    expect(isCelebrationVisible(state.active, failedFinal)).toBe(false);

    const summaryAfterFailure = {
      ...failedFinal,
      phase: 'session-complete' as const,
    };
    state = observe(state, summaryAfterFailure, 1200);
    expect(state.active).not.toBeNull();
    expect(state.active?.animationName).toBe('finale');
    expect(isCelebrationVisible(state.active, summaryAfterFailure)).toBe(true);
  });

  it.each([
    ready,
    { ...ready, phase: 'resolving-answer' as const },
    { ...ready, phase: 'answered-incorrectly' as const },
    { ...success, phase: 'answered-incorrectly' as const, feedback: 'failure' as const },
    { ...ready, phase: 'session-complete' as const, roundsPlayed: 0, correctRounds: 0 },
  ])('ignores progress, retries, in-round failures and zero-round completion: %j', state => {
    expect(observe(createCelebrationState(), state).active).toBeNull();
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

  it('plays shorter clips on non-final rounds and reserves finale strictly for the final round and summary', () => {
    let state = createCelebrationState();
    const expectedFiveRound = ['celebrate', 'wave', 'clap', 'jump', 'finale'] as const;
    for (let round = 1; round <= 5; round++) {
      state = observe(state, { ...success, roundsPlayed: round, correctRounds: round, maxRounds: 5 }, round * 100);
      expect(state.active?.animationName).toBe(expectedFiveRound[round - 1]);
      state = observe(state, { ...ready, roundsPlayed: round, correctRounds: round, maxRounds: 5 }, round * 100 + 50);
    }

    // Even if earlier rounds failed so correctRounds < 5 on the final round, the final round still plays 'finale'.
    const finalWithEarlierMisses = observe(
      createCelebrationState(),
      { ...success, roundsPlayed: 5, correctRounds: 3, maxRounds: 5 },
      600,
    );
    expect(finalWithEarlierMisses.active?.animationName).toBe('finale');

    // In a longer session (e.g. 9 rounds), rounds 1..8 cycle through all 8 shorter clips and never play 'finale' until round 9.
    let longState = createCelebrationState();
    for (let round = 1; round <= 8; round++) {
      longState = observe(longState, { ...success, roundsPlayed: round, correctRounds: round, maxRounds: 9 }, round * 100);
      expect(longState.active?.animationName).toBe(ROUND_CELEBRATION_CLIPS[round - 1]);
      expect(longState.active?.animationName).not.toBe('finale');
      longState = observe(longState, { ...ready, roundsPlayed: round, correctRounds: round, maxRounds: 9 }, round * 100 + 50);
    }
    longState = observe(longState, { ...success, roundsPlayed: 9, correctRounds: 9, maxRounds: 9 }, 900);
    expect(longState.active?.animationName).toBe('finale');
  });
});
