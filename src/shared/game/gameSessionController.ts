import type { AudioSpec } from '../types';
import { canAcceptAnswer, createGameState, gameStateReducer, type GameEvent, type GameState } from './gameState';

export interface ResolveAnswerInput {
  answerId: string;
  outcome: 'progress' | 'wrong' | 'correct';
  countTap?: boolean;
  selectionAudio: AudioSpec;
  verdictAudio?: AudioSpec;
  /** Finish a physical placement after item audio, before publishing progress or a verdict. */
  beforeOutcome?: () => Promise<boolean>;
}
export interface UseGameSessionOptions {
  maxRounds?: number;
  maxAttempts?: number | null;
  onNextRound(): void;
  onPlayAgain(): void;
}
export type AnswerResolution = 'progress' | 'retry' | 'failure' | 'success' | 'cancelled';
export interface GameSessionSnapshot {
  state: GameState;
  canAnswer: boolean;
  replaying: boolean;
}
export interface GameSessionDependencies<Timer> {
  audio: { play(audio: AudioSpec): Promise<void>; stop(): void };
  clock: { now(): number; setTimeout(callback: () => void, ms: number): Timer; clearTimeout(timer: Timer): void };
  retryDelayMs: number;
}

/** Owns the round's synchronous answer lock, interruptible audio, and delayed transitions. */
export function createGameSessionController<Timer>(
  initialOptions: UseGameSessionOptions,
  { audio, clock, retryDelayMs }: GameSessionDependencies<Timer>,
) {
  let options = initialOptions;
  let state = createGameState(options);
  let operationId = 0;
  let answering = false;
  let replaying = false;
  let disposed = false;
  let resumeCancelledAnswer = false;
  let resumePendingRetry = false;
  let resumePendingAdvance = false;
  let feedbackAdvancePending = false;
  const timers = new Set<Timer>();
  const listeners = new Set<() => void>();
  let snapshot: GameSessionSnapshot = { state, replaying, canAnswer: true };

  const publish = () => {
    const canAnswer = !disposed && !answering && canAcceptAnswer(state);
    if (snapshot.state === state && snapshot.replaying === replaying && snapshot.canAnswer === canAnswer) return;
    snapshot = { state, replaying, canAnswer };
    listeners.forEach(listener => listener());
  };
  const dispatch = (event: GameEvent) => {
    state = gameStateReducer(state, event);
    publish();
  };
  const invalidate = () => {
    operationId += 1;
    answering = false;
    replaying = false;
    feedbackAdvancePending = false;
    for (const timer of timers) clock.clearTimeout(timer);
    timers.clear();
    audio.stop();
    return operationId;
  };
  const isCurrent = (id: number) => !disposed && id === operationId;
  const scheduleRetryReady = (id: number, delayMs = retryDelayMs) => {
    if (delayMs <= 0) {
      if (isCurrent(id)) dispatch({ type: 'RETRY_READY' });
      return;
    }
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      if (isCurrent(id)) dispatch({ type: 'RETRY_READY' });
    }, delayMs);
    timers.add(timer);
  };
  const continueAfterFeedback = () => {
    if (disposed || state.paused || state.roundsPlayed >= state.maxRounds || state.feedback === null) return;
    invalidate();
    dispatch({ type: 'NEXT_ROUND' });
    options.onNextRound();
  };
  const scheduleFeedbackAdvance = (id: number) => {
    feedbackAdvancePending = true;
    const timer = clock.setTimeout(() => {
      timers.delete(timer);
      feedbackAdvancePending = false;
      if (isCurrent(id) && state.feedback !== null && state.roundsPlayed < state.maxRounds) continueAfterFeedback();
    }, 1000);
    timers.add(timer);
  };
  const playPrompt = async (spec: AudioSpec, replay: boolean) => {
    if (disposed) return;
    const id = invalidate();
    if (state.paused) { publish(); return; }
    replaying = replay;
    // A replay can interrupt placement/selection; release that cancelled answer before
    // starting the prompt so PROMPT_FINISHED can return to an answerable question.
    if (state.phase === 'resolving-answer') dispatch({ type: 'ANSWER_PROGRESS', countTap: false });
    dispatch({ type: 'PROMPT_STARTED' });
    await audio.play(spec);
    if (!isCurrent(id)) return;
    replaying = false;
    dispatch({ type: 'PROMPT_FINISHED' });
  };
  const resolveAnswer = async (input: ResolveAnswerInput): Promise<AnswerResolution> => {
    if (disposed || answering || !canAcceptAnswer(state)) return 'cancelled';
    const id = invalidate();
    answering = true;
    // The debounce overlaps playback/placement instead of adding idle time after them.
    const retryReadyAt = clock.now() + retryDelayMs;
    dispatch({ type: 'ANSWER_STARTED', answerId: input.answerId });
    await audio.play(input.selectionAudio);
    if (!isCurrent(id)) return 'cancelled';
    if (input.beforeOutcome) {
      const placed = await input.beforeOutcome();
      if (!isCurrent(id)) return 'cancelled';
      if (!placed) {
        answering = false;
        dispatch({ type: 'ANSWER_PROGRESS', countTap: false });
        return 'cancelled';
      }
    }
    if (input.outcome === 'progress') {
      answering = false;
      dispatch({ type: 'ANSWER_PROGRESS', countTap: input.countTap });
      return 'progress';
    }
    const terminalFailure = input.outcome === 'wrong' && state.maxAttempts !== null && state.wrongAttempts + 1 >= state.maxAttempts;
    dispatch(input.outcome === 'correct'
      ? { type: 'ANSWER_CORRECT', countTap: input.countTap }
      : { type: 'ANSWER_WRONG', countTap: input.countTap });
    if (input.outcome === 'wrong' && !terminalFailure) {
      answering = false;
      publish();
      scheduleRetryReady(id, retryReadyAt - clock.now());
      return 'retry';
    }
    if (input.verdictAudio) await audio.play(input.verdictAudio);
    if (!isCurrent(id)) return 'cancelled';
    answering = false;
    if (state.roundsPlayed >= state.maxRounds) dispatch({ type: 'SHOW_SESSION_COMPLETE' });
    else {
      publish();
      scheduleFeedbackAdvance(id);
    }
    return input.outcome === 'correct' ? 'success' : 'failure';
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    invalidate();
    publish();
  };

  return {
    getSnapshot: () => snapshot,
    // React Strict Mode reconnects the same store after its simulated cleanup. Each cleanup
    // invalidates existing operations; reconnecting never revives their promises or timers.
    subscribe(listener: () => void) {
      disposed = false;
      listeners.add(listener);
      publish();
      return () => { listeners.delete(listener); if (listeners.size === 0) dispose(); };
    },
    updateOptions(nextOptions: UseGameSessionOptions) { options = nextOptions; },
    startOpeningPrompt: (spec: AudioSpec) => state.phase === 'ready' && !state.paused ? playPrompt(spec, false) : Promise.resolve(),
    startPrompt: (spec: AudioSpec) => playPrompt(spec, false),
    replayPrompt: (spec: AudioSpec) => playPrompt(spec, true),
    resolveAnswer,
    continueAfterFeedback,
    playAgain() {
      if (disposed) return;
      invalidate();
      resumeCancelledAnswer = resumePendingRetry = resumePendingAdvance = false;
      dispatch({ type: 'PLAY_AGAIN' });
      options.onPlayAgain();
    },
    pause() {
      if (disposed || state.paused) return;
      resumeCancelledAnswer = state.phase === 'resolving-answer';
      resumePendingRetry = state.phase === 'answered-incorrectly' && state.feedback === null;
      resumePendingAdvance = feedbackAdvancePending && state.feedback !== null && state.roundsPlayed < state.maxRounds;
      invalidate();
      dispatch({ type: 'PAUSE' });
    },
    resume() {
      if (disposed || !state.paused) return;
      dispatch({ type: 'RESUME' });
      if (resumeCancelledAnswer) dispatch({ type: 'ANSWER_PROGRESS', countTap: false });
      // A terminal verdict cancelled by pause has no Continue destination; finish the
      // session on resume instead of leaving its last feedback stranded.
      if (state.roundsPlayed >= state.maxRounds && state.feedback !== null) dispatch({ type: 'SHOW_SESSION_COMPLETE' });
      if (resumePendingRetry) scheduleRetryReady(operationId);
      if (resumePendingAdvance) scheduleFeedbackAdvance(operationId);
      resumeCancelledAnswer = resumePendingRetry = resumePendingAdvance = false;
    },
    fail(message: string) {
      if (disposed) return;
      invalidate();
      dispatch({ type: 'ERROR', message });
    },
    dispose,
  };
}
