import { beforeEach, describe, expect, it } from 'vitest';
import {
  COMPANION_CLIP_NAMES,
  HOME_TAP_CLIPS,
  IDLE_NUDGE_CLIPS,
  ROUND_CELEBRATION_CLIPS,
  advanceCelebrationRotation,
  celebrationReducer,
  createCelebrationState,
  isCelebrationVisible,
  resetCelebrationRotation,
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

beforeEach(() => {
  resetCelebrationRotation();
});

describe('completed correct-answer, empathy and summary guide state', () => {
  it('registers all 18 companion clips including idle_breathe and guide subsets', () => {
    expect(COMPANION_CLIP_NAMES).toContain('idle_breathe');
    expect(COMPANION_CLIP_NAMES).toHaveLength(18);
    expect(HOME_TAP_CLIPS).toEqual(['peekaboo', 'stretch', 'clap', 'wiggle', 'bow', 'search', 'listen']);
    expect(IDLE_NUDGE_CLIPS).toEqual(['think', 'search', 'listen']);
  });

  it('creates one persistent event for the overlay without resetting startedAtMs on rerender', () => {
    const first = observe(createCelebrationState(), success);
    const repeated = observe(first, { ...success }, 2500);
    expect(repeated.active).toBe(first.active);
    expect(first.active?.startedAtMs).toBe(100);
    expect(first.active?.kind).toBe('celebration');
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
    expect(completed.active?.eventKey).toBe('0:5:5');
    expect(completed.active?.animationName).toBe('finale');
  });

  it('emits encouragement on exhausted failure and transitions to finale on 4/5 session-complete', () => {
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
    expect(state.active).toMatchObject({
      eventKey: '0:5:4:failure',
      kind: 'encouragement',
      animationName: 'encourage',
      roundsPlayed: 5,
      correctRounds: 4,
    });
    expect(isCelebrationVisible(state.active, failedFinal)).toBe(true);

    const summaryAfterFailure = {
      ...failedFinal,
      phase: 'session-complete' as const,
    };
    state = observe(state, summaryAfterFailure, 1200);
    expect(state.active).toMatchObject({
      eventKey: '0:5:4',
      kind: 'celebration',
      animationName: 'finale',
    });
    expect(isCelebrationVisible(state.active, summaryAfterFailure)).toBe(true);
  });

  it('alternates encourage and shrug on exhausted failures and shows encourage on 0/5 session-complete', () => {
    let state = createCelebrationState();
    const failRound1: CelebrationObservation = {
      ...ready,
      phase: 'answered-incorrectly',
      feedback: 'failure',
      roundsPlayed: 1,
      correctRounds: 0,
    };
    state = observe(state, failRound1, 100);
    expect(state.active).toMatchObject({
      eventKey: '0:1:0:failure',
      kind: 'encouragement',
      animationName: 'encourage',
    });
    expect(isCelebrationVisible(state.active, failRound1)).toBe(true);

    state = observe(state, { ...ready, roundsPlayed: 1, correctRounds: 0 }, 150);
    const failRound2: CelebrationObservation = {
      ...ready,
      phase: 'answered-incorrectly',
      feedback: 'failure',
      roundsPlayed: 2,
      correctRounds: 0,
    };
    state = observe(state, failRound2, 200);
    expect(state.active).toMatchObject({
      eventKey: '0:2:0:failure',
      kind: 'encouragement',
      animationName: 'shrug',
    });
    expect(isCelebrationVisible(state.active, failRound2)).toBe(true);

    const failRound5Zero: CelebrationObservation = {
      ...ready,
      phase: 'answered-incorrectly',
      feedback: 'failure',
      roundsPlayed: 5,
      correctRounds: 0,
    };
    state = observe(state, failRound5Zero, 500);
    expect(state.active).toMatchObject({
      eventKey: '0:5:0:failure',
      kind: 'encouragement',
      animationName: 'encourage',
    });

    const summaryZeroScore: CelebrationObservation = {
      ...failRound5Zero,
      phase: 'session-complete',
    };
    // Before reducer processes session-complete, the :failure event is not treated as the summary event.
    expect(isCelebrationVisible(state.active, summaryZeroScore)).toBe(false);
    state = observe(state, summaryZeroScore, 1500);
    expect(state.active).toMatchObject({
      eventKey: '0:5:0',
      kind: 'encouragement',
      animationName: 'encourage',
    });
    expect(isCelebrationVisible(state.active, summaryZeroScore)).toBe(true);
  });

  it.each([
    ready,
    { ...ready, phase: 'resolving-answer' as const },
    { ...ready, phase: 'answered-incorrectly' as const },
    { ...ready, phase: 'answered-incorrectly' as const, roundsPlayed: 2, feedback: null },
    { ...ready, phase: 'answered-incorrectly' as const, roundsPlayed: 0, feedback: 'failure' as const },
    { ...ready, phase: 'session-complete' as const, roundsPlayed: 0, correctRounds: 0 },
  ])('ignores progress, non-exhausted retries and zero-round states: %j', state => {
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

  it('rotates celebration clips across PLAY_AGAIN runs (Run 0 -> Run 1 -> Run 2 wrap)', () => {
    let state = createCelebrationState();
    const run0Expected = ['celebrate', 'wave', 'clap', 'jump', 'finale'] as const;
    for (let round = 1; round <= 5; round++) {
      state = observe(state, { ...success, roundsPlayed: round, correctRounds: round, maxRounds: 5 }, round * 100);
      expect(state.active?.animationName).toBe(run0Expected[round - 1]);
      state = observe(state, { ...ready, roundsPlayed: round, correctRounds: round, maxRounds: 5 }, round * 100 + 50);
    }

    // PLAY_AGAIN resets roundsPlayed to 0 -> Run 1 advances offset by +4 to reach prop clips
    state = observe(state, ready, 600);
    expect(state.run).toBe(1);
    expect(state.offset).toBe(4);
    const run1Expected = ['flex', 'bow', 'march', 'wiggle', 'finale'] as const;
    for (let round = 1; round <= 5; round++) {
      state = observe(state, { ...success, roundsPlayed: round, correctRounds: round, maxRounds: 5 }, 600 + round * 100);
      expect(state.active?.animationName).toBe(run1Expected[round - 1]);
      state = observe(state, { ...ready, roundsPlayed: round, correctRounds: round, maxRounds: 5 }, 650 + round * 100);
    }

    // Second PLAY_AGAIN wraps offset cleanly back to 0 ('celebrate')
    state = observe(state, ready, 1200);
    expect(state.run).toBe(2);
    expect(state.offset).toBe(0);
    state = observe(state, { ...success, roundsPlayed: 1, correctRounds: 1, maxRounds: 5 }, 1300);
    expect(state.active?.animationName).toBe('celebrate');
    expect(state.active?.startedAtMs).toBe(1300);
  });

  it('stays StrictMode-pure on createCelebrationState and celebrationReducer, and supports cross-game advanceCelebrationRotation', () => {
    const initA = createCelebrationState();
    const initB = createCelebrationState();
    expect(initA).toEqual(initB);
    expect(initA.offset).toBe(0);

    const stepA = observe(initA, success, 100);
    const stepB = observe(initA, success, 100);
    expect(stepA).toEqual(stepB);
    expect(stepA.active?.animationName).toBe('celebrate');

    const restartA = observe(stepA, ready, 200);
    const restartB = observe(stepA, ready, 200);
    expect(restartA).toEqual(restartB);
    expect(restartA.offset).toBe(4);
    // Module offset was NOT mutated by reducer invocations:
    expect(createCelebrationState().offset).toBe(0);

    // Explicit cross-game advance updates future sessions cleanly:
    advanceCelebrationRotation(4);
    const nextGameInit = createCelebrationState();
    expect(nextGameInit.offset).toBe(4);
    const nextGameRound1 = observe(nextGameInit, success, 300);
    expect(nextGameRound1.active?.animationName).toBe('flex');

    resetCelebrationRotation();
    expect(createCelebrationState().offset).toBe(0);
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
