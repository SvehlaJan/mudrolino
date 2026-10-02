import { useLayoutEffect, useState, useSyncExternalStore } from 'react';
import { TIMING } from '../contentRegistry';
import { audioManager } from '../services/audioManager';
import type { AudioSpec } from '../types';
import {
  createGameSessionController,
  type AnswerResolution,
  type GameSessionSnapshot,
  type ResolveAnswerInput,
  type UseGameSessionOptions,
} from './gameSessionController';

export type { ResolveAnswerInput, UseGameSessionOptions, AnswerResolution } from './gameSessionController';

export interface UseGameSessionResult extends GameSessionSnapshot {
  startPrompt(audio: AudioSpec): Promise<void>;
  startOpeningPrompt(audio: AudioSpec): Promise<void>;
  replayPrompt(audio: AudioSpec): Promise<void>;
  resolveAnswer(input: ResolveAnswerInput): Promise<AnswerResolution>;
  continueAfterFeedback(): void;
  playAgain(): void;
  pause(): void;
  resume(): void;
  fail(message: string): void;
}

/** React subscribes to the controller; audio, locks, and transitions live outside rendering. */
export function useGameSession(options: UseGameSessionOptions): UseGameSessionResult {
  const [controller] = useState(() => createGameSessionController(options, {
    audio: audioManager,
    clock: { setTimeout: (callback, ms) => setTimeout(callback, ms), clearTimeout: timer => clearTimeout(timer) },
    retryDelayMs: TIMING.FEEDBACK_RESET_MS,
  }));
  useLayoutEffect(() => { controller.updateOptions(options); }, [controller, options]);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  return { ...controller, ...snapshot };
}
