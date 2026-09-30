import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { TIMING } from '../contentRegistry';
import { audioManager } from '../services/audioManager';
import type { AudioSpec } from '../types';
import {
  canAcceptAnswer,
  createGameState,
  gameStateReducer,
  type GameEvent,
  type GameState,
} from './gameState';

export interface ResolveAnswerInput {
  answerId: string;
  outcome: 'progress' | 'wrong' | 'correct';
  countTap?: boolean;
  selectionAudio: AudioSpec;
  verdictAudio?: AudioSpec;
}

export interface UseGameSessionOptions {
  maxRounds?: number;
  maxAttempts?: number | null;
  onNextRound(): void;
  onPlayAgain(): void;
}

export type AnswerResolution = 'progress' | 'retry' | 'failure' | 'success' | 'cancelled';

export interface UseGameSessionResult {
  state: GameState;
  canAnswer: boolean;
  replaying: boolean;
  startPrompt(audio: AudioSpec): Promise<void>;
  replayPrompt(audio: AudioSpec): Promise<void>;
  resolveAnswer(input: ResolveAnswerInput): Promise<AnswerResolution>;
  continueAfterFeedback(): void;
  playAgain(): void;
  pause(): void;
  resume(): void;
  fail(message: string): void;
}

/** Coordinates reducer state with interruptible, serialized audio playback for a game round. */
export function useGameSession(options: UseGameSessionOptions): UseGameSessionResult {
  const [state, dispatch] = useReducer(
    gameStateReducer,
    { maxRounds: options.maxRounds, maxAttempts: options.maxAttempts },
    createGameState,
  );
  const stateRef = useRef(state);
  const operationIdRef = useRef(0);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const answeringRef = useRef(false);
  const resumeCancelledAnswerRef = useRef(false);
  const resumePendingRetryRef = useRef(false);
  const resumePendingSuccessRef = useRef(false);
  const successAdvancePendingRef = useRef(false);
  const [answering, setAnswering] = useState(false);
  const [replaying, setReplaying] = useState(false);

  const dispatchEvent = useCallback((event: GameEvent) => {
    stateRef.current = gameStateReducer(stateRef.current, event);
    dispatch(event);
  }, []);

  const invalidate = useCallback(() => {
    operationIdRef.current += 1;
    answeringRef.current = false;
    setAnswering(false);
    setReplaying(false);
    successAdvancePendingRef.current = false;
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current.clear();
    audioManager.stop();
    return operationIdRef.current;
  }, []);

  const scheduleRetryReady = useCallback((operationId: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      if (operationId === operationIdRef.current) dispatchEvent({ type: 'RETRY_READY' });
    }, TIMING.FEEDBACK_RESET_MS);
    timersRef.current.add(timer);
  }, [dispatchEvent]);

  const playPrompt = useCallback(async (audio: AudioSpec, replay: boolean): Promise<void> => {
    const operationId = invalidate();
    if (stateRef.current.paused) return;
    if (replay) setReplaying(true);
    dispatchEvent({ type: 'PROMPT_STARTED' });
    await audioManager.play(audio);
    if (operationId !== operationIdRef.current) return;
    setReplaying(false);
    dispatchEvent({ type: 'PROMPT_FINISHED' });
  }, [dispatchEvent, invalidate]);

  const startPrompt = useCallback((audio: AudioSpec) => playPrompt(audio, false), [playPrompt]);
  const replayPrompt = useCallback((audio: AudioSpec) => playPrompt(audio, true), [playPrompt]);

  const continueAfterFeedback = useCallback(() => {
    const current = stateRef.current;
    if (current.roundsPlayed >= current.maxRounds || current.feedback === null) return;
    invalidate();
    dispatchEvent({ type: 'NEXT_ROUND' });
    options.onNextRound();
  }, [dispatchEvent, invalidate, options]);

  const scheduleSuccessAdvance = useCallback((operationId: number) => {
    successAdvancePendingRef.current = true;
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      successAdvancePendingRef.current = false;
      const current = stateRef.current;
      if (
        operationId === operationIdRef.current
        && current.feedback === 'success'
        && current.roundsPlayed < current.maxRounds
      ) {
        continueAfterFeedback();
      }
    }, 1000);
    timersRef.current.add(timer);
  }, [continueAfterFeedback]);

  const resolveAnswer = useCallback(async (input: ResolveAnswerInput): Promise<AnswerResolution> => {
    if (answeringRef.current || !canAcceptAnswer(stateRef.current)) return 'cancelled';

    const operationId = invalidate();
    answeringRef.current = true;
    setAnswering(true);
    dispatchEvent({ type: 'ANSWER_STARTED', answerId: input.answerId });
    await audioManager.play(input.selectionAudio);
    if (operationId !== operationIdRef.current) return 'cancelled';

    if (input.outcome === 'progress') {
      dispatchEvent({ type: 'ANSWER_PROGRESS', countTap: input.countTap });
      answeringRef.current = false;
      setAnswering(false);
      return 'progress';
    }

    const terminalFailure = input.outcome === 'wrong'
      && stateRef.current.maxAttempts !== null
      && stateRef.current.wrongAttempts + 1 >= stateRef.current.maxAttempts;
    dispatchEvent(input.outcome === 'correct'
      ? { type: 'ANSWER_CORRECT', countTap: input.countTap }
      : { type: 'ANSWER_WRONG', countTap: input.countTap });

    if (input.outcome === 'wrong' && !terminalFailure) {
      answeringRef.current = false;
      setAnswering(false);
      scheduleRetryReady(operationId);
      return 'retry';
    }

    if (input.verdictAudio) await audioManager.play(input.verdictAudio);
    if (operationId !== operationIdRef.current) return 'cancelled';

    answeringRef.current = false;
    setAnswering(false);
    if (stateRef.current.roundsPlayed >= stateRef.current.maxRounds) {
      dispatchEvent({ type: 'SHOW_SESSION_COMPLETE' });
    } else if (input.outcome === 'correct') {
      scheduleSuccessAdvance(operationId);
    }
    return input.outcome === 'correct' ? 'success' : 'failure';
  }, [dispatchEvent, invalidate, scheduleRetryReady, scheduleSuccessAdvance]);

  const playAgain = useCallback(() => {
    invalidate();
    dispatchEvent({ type: 'PLAY_AGAIN' });
    options.onPlayAgain();
  }, [dispatchEvent, invalidate, options]);

  const pause = useCallback(() => {
    const current = stateRef.current;
    if (current.paused) return;
    resumeCancelledAnswerRef.current = current.phase === 'resolving-answer';
    // A non-exhausted wrong answer is still waiting on its own setTimeout(RETRY_READY) —
    // invalidate() below clears that timer along with everything else, so resume must
    // reschedule it or the round would be stranded showing retry feedback forever.
    resumePendingRetryRef.current = current.phase === 'answered-incorrectly' && current.feedback === null;
    // A success timer exists only after verdict audio resolves. Pausing during that audio
    // cancels the playback and leaves Continue available without starting an early countdown.
    resumePendingSuccessRef.current =
      successAdvancePendingRef.current
      && current.feedback === 'success'
      && current.roundsPlayed < current.maxRounds;
    invalidate();
    dispatchEvent({ type: 'PAUSE' });
  }, [dispatchEvent, invalidate]);

  const resume = useCallback(() => {
    const recoverCancelledAnswer = resumeCancelledAnswerRef.current;
    const recoverPendingRetry = resumePendingRetryRef.current;
    const recoverPendingSuccess = resumePendingSuccessRef.current;
    resumeCancelledAnswerRef.current = false;
    resumePendingRetryRef.current = false;
    resumePendingSuccessRef.current = false;
    const operationId = operationIdRef.current;
    dispatchEvent({ type: 'RESUME' });
    if (recoverCancelledAnswer) dispatchEvent({ type: 'ANSWER_PROGRESS', countTap: false });
    if (recoverPendingRetry) scheduleRetryReady(operationId);
    if (recoverPendingSuccess) scheduleSuccessAdvance(operationId);
  }, [dispatchEvent, scheduleRetryReady, scheduleSuccessAdvance]);

  const fail = useCallback((message: string) => {
    invalidate();
    dispatchEvent({ type: 'ERROR', message });
  }, [dispatchEvent, invalidate]);

  useEffect(() => () => { invalidate(); }, [invalidate]);

  return {
    state,
    canAnswer: !answering && canAcceptAnswer(state),
    replaying,
    startPrompt,
    replayPrompt,
    resolveAnswer,
    continueAfterFeedback,
    playAgain,
    pause,
    resume,
    fail,
  };
}
