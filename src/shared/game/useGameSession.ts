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

export interface GameSession {
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
export function useGameSession(options: UseGameSessionOptions): GameSession {
  const [state, dispatch] = useReducer(
    gameStateReducer,
    { maxRounds: options.maxRounds, maxAttempts: options.maxAttempts },
    createGameState,
  );
  const stateRef = useRef(state);
  const operationIdRef = useRef(0);
  const timersRef = useRef(new Set<ReturnType<typeof setTimeout>>());
  const answeringRef = useRef(false);
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
    for (const timer of timersRef.current) clearTimeout(timer);
    timersRef.current.clear();
    audioManager.stop();
    return operationIdRef.current;
  }, []);

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
      const timer = setTimeout(() => {
        timersRef.current.delete(timer);
        if (operationId === operationIdRef.current) dispatchEvent({ type: 'RETRY_READY' });
      }, TIMING.FEEDBACK_RESET_MS);
      timersRef.current.add(timer);
      return 'retry';
    }

    if (input.verdictAudio) await audioManager.play(input.verdictAudio);
    if (operationId !== operationIdRef.current) return 'cancelled';

    answeringRef.current = false;
    setAnswering(false);
    if (stateRef.current.roundsPlayed >= stateRef.current.maxRounds) {
      dispatchEvent({ type: 'SHOW_SESSION_COMPLETE' });
    }
    return input.outcome === 'correct' ? 'success' : 'failure';
  }, [dispatchEvent, invalidate]);

  const continueAfterFeedback = useCallback(() => {
    const current = stateRef.current;
    if (current.roundsPlayed >= current.maxRounds || current.feedback === null) return;
    invalidate();
    dispatchEvent({ type: 'NEXT_ROUND' });
    options.onNextRound();
  }, [dispatchEvent, invalidate, options]);

  const playAgain = useCallback(() => {
    invalidate();
    dispatchEvent({ type: 'PLAY_AGAIN' });
    options.onPlayAgain();
  }, [dispatchEvent, invalidate, options]);

  const pause = useCallback(() => {
    // A paused answer must not resume in `resolving-answer`: its playback has been cancelled,
    // so restore the reducer to an answerable phase before recording the pause.
    if (stateRef.current.phase === 'resolving-answer') {
      dispatchEvent({ type: 'ANSWER_PROGRESS', countTap: false });
    }
    invalidate();
    dispatchEvent({ type: 'PAUSE' });
  }, [dispatchEvent, invalidate]);

  const resume = useCallback(() => dispatchEvent({ type: 'RESUME' }), [dispatchEvent]);

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
