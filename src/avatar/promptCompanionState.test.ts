import { describe, expect, it } from 'vitest';
import {
  createPromptCompanionState,
  promptCompanionReducer,
  type PromptCompanionObservation,
} from './promptCompanionState';

const baseObs: PromptCompanionObservation = {
  phase: 'awaiting-answer',
  paused: false,
  roundsPlayed: 0,
  wrongAttempts: 0,
  feedback: null,
  promptReplaying: false,
  idleNudge: null,
};

describe('promptCompanionState', () => {
  it('stays idle_breathe during opening and post-overlay prompts unless explicitly replaying', () => {
    expect(createPromptCompanionState(baseObs)).toMatchObject({
      activeClip: 'idle_breathe',
      eventKey: 'idle:0',
      reason: 'idle',
    });
    expect(
      createPromptCompanionState({ ...baseObs, phase: 'listening' }),
    ).toMatchObject({
      activeClip: 'idle_breathe',
      eventKey: 'idle:0',
      reason: 'idle',
    });
    expect(
      createPromptCompanionState({ ...baseObs, phase: 'listening', promptReplaying: true }),
    ).toMatchObject({
      activeClip: 'listen',
      eventKey: 'listen:0:1',
      reason: 'listen',
    });

    // Advancing past a success overlay into round 2 stays calm on idle_breathe even as the new prompt plays
    let state = createPromptCompanionState(baseObs);
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'answered-correctly', roundsPlayed: 1, feedback: 'success' },
      nowMs: 1000,
    });
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'listening', roundsPlayed: 1, feedback: null, promptReplaying: false },
      nowMs: 1500,
    });
    expect(state).toMatchObject({
      activeClip: 'idle_breathe',
      eventKey: 'idle:1',
      reason: 'idle',
    });
  });

  it('keeps state referentially stable when nothing meaningful changes', () => {
    const initial = createPromptCompanionState(baseObs);
    const same = promptCompanionReducer(initial, {
      type: 'observe',
      observation: { ...baseObs },
      nowMs: 500,
    });
    expect(same).toBe(initial);
  });

  it('plays gentle_try_again -> encourage -> shrug across wrong attempts without replacing exhausted feedback', () => {
    let state = createPromptCompanionState(baseObs);
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'answered-incorrectly', wrongAttempts: 1, feedback: null },
      nowMs: 100,
    });
    expect(state).toMatchObject({
      activeClip: 'gentle_try_again',
      eventKey: 'retry:0:1',
      reason: 'retry',
      startedAtMs: 100,
    });

    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'awaiting-answer', wrongAttempts: 1, feedback: null },
      nowMs: 200,
    });
    expect(state.activeClip).toBe('gentle_try_again');

    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'answered-incorrectly', wrongAttempts: 2, feedback: null },
      nowMs: 300,
    });
    expect(state).toMatchObject({
      activeClip: 'encourage',
      eventKey: 'retry:0:2',
      reason: 'retry',
      startedAtMs: 300,
    });

    // 3rd wrong attempt sets feedback='failure' for LearningCompanion overlay; prompt companion stays on encourage
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'answered-incorrectly', wrongAttempts: 3, feedback: 'failure' },
      nowMs: 400,
    });
    expect(state.activeClip).toBe('encourage');
    expect(state.eventKey).toBe('retry:0:2');

    // Non-exhausted 3rd wrong attempt in a clean round picks shrug
    let round1 = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, roundsPlayed: 1, wrongAttempts: 0, feedback: null },
      nowMs: 500,
    });
    round1 = promptCompanionReducer(round1, {
      type: 'observe',
      observation: { ...baseObs, roundsPlayed: 1, phase: 'answered-incorrectly', wrongAttempts: 3, feedback: null },
      nowMs: 600,
    });
    expect(round1.activeClip).toBe('shrug');
  });

  it('selects count_one_two_three for numeracy games and talk_explain for literacy replays', () => {
    expect(
      createPromptCompanionState({ ...baseObs, gameId: 'COUNTING_ITEMS', phase: 'listening', promptReplaying: true }).activeClip,
    ).toBe('count_one_two_three');
    expect(
      createPromptCompanionState({ ...baseObs, gameId: 'WORDS', phase: 'listening', promptReplaying: true }).activeClip,
    ).toBe('talk_explain');
  });

  it('activates listen on prompt replay and avoids double-restarting when triggered via bear tap', () => {
    let state = createPromptCompanionState(baseObs);
    state = promptCompanionReducer(state, { type: 'tap', nowMs: 1000, willReplay: true });
    expect(state).toMatchObject({
      activeClip: 'listen',
      eventKey: 'tap:1',
      reason: 'tap',
      startedAtMs: 1000,
    });

    // Subsequent rising edge of listening/replaying from the tap's onReplay preserves tap:1
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'listening', promptReplaying: true },
      nowMs: 1005,
    });
    expect(state.eventKey).toBe('tap:1');
    expect(state.startedAtMs).toBe(1000);

    // Finishing replay clears wasListening; a later Zopakovať button replay triggers listen
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'awaiting-answer', promptReplaying: false },
      nowMs: 2000,
    });
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, phase: 'listening', promptReplaying: true },
      nowMs: 3000,
    });
    expect(state).toMatchObject({
      activeClip: 'listen',
      reason: 'listen',
      startedAtMs: 3000,
    });
    expect(state.eventKey).not.toBe('tap:1');
  });

  it('activates 12s idle nudge clips and resets cleanly when roundsPlayed advances', () => {
    let state = createPromptCompanionState(baseObs);
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: {
        ...baseObs,
        idleNudge: { eventKey: 'nudge:1', animationName: 'think', startedAtMs: 12_000 },
      },
      nowMs: 12_000,
    });
    expect(state).toMatchObject({
      activeClip: 'think',
      eventKey: 'nudge:1',
      reason: 'nudge',
      startedAtMs: 12_000,
    });

    // Advancing to round 1 resets to idle_breathe (or listen if prompt starts)
    state = promptCompanionReducer(state, {
      type: 'observe',
      observation: { ...baseObs, roundsPlayed: 1, wrongAttempts: 0, idleNudge: null },
      nowMs: 13_000,
    });
    expect(state).toMatchObject({
      activeClip: 'idle_breathe',
      eventKey: 'idle:1',
      reason: 'idle',
      wrongAttempts: 0,
    });
  });
});
