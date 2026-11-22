import type { GameState } from '../shared/game/gameState';
import type { CompanionClipName } from './companionCelebration';

export interface CompanionNudgeEvent {
  eventKey: string;
  animationName: CompanionClipName;
  startedAtMs: number;
}

export interface PromptCompanionObservation {
  phase: GameState['phase'];
  paused: boolean;
  roundsPlayed: number;
  wrongAttempts: number;
  feedback: GameState['feedback'];
  promptReplaying: boolean;
  idleNudge: CompanionNudgeEvent | null;
}

export type PromptCompanionReason = 'idle' | 'listen' | 'retry' | 'nudge' | 'tap';

export interface PromptCompanionState {
  activeClip: CompanionClipName;
  eventKey: string;
  reason: PromptCompanionReason;
  startedAtMs?: number;
  roundsPlayed: number;
  wrongAttempts: number;
  wasListening: boolean;
  pendingTapListen: boolean;
  lastNudgeKey: string | null;
  listenSeq: number;
  tapCount: number;
}

export type PromptCompanionAction =
  | { type: 'observe'; observation: PromptCompanionObservation; nowMs: number }
  | { type: 'tap'; nowMs: number; willReplay?: boolean };

export function createPromptCompanionState(
  initial?: Partial<PromptCompanionObservation>,
): PromptCompanionState {
  const roundsPlayed = initial?.roundsPlayed ?? 0;
  const wrongAttempts = initial?.wrongAttempts ?? 0;
  const isListening = initial?.phase === 'listening' || Boolean(initial?.promptReplaying);

  if (initial?.idleNudge) {
    return {
      activeClip: initial.idleNudge.animationName,
      eventKey: initial.idleNudge.eventKey,
      reason: 'nudge',
      startedAtMs: initial.idleNudge.startedAtMs,
      roundsPlayed,
      wrongAttempts,
      wasListening: isListening,
      pendingTapListen: false,
      lastNudgeKey: initial.idleNudge.eventKey,
      listenSeq: 0,
      tapCount: 0,
    };
  }

  if (wrongAttempts > 0 && initial?.feedback === null) {
    return {
      activeClip: wrongAttempts % 2 === 1 ? 'encourage' : 'shrug',
      eventKey: `retry:${roundsPlayed}:${wrongAttempts}`,
      reason: 'retry',
      roundsPlayed,
      wrongAttempts,
      wasListening: isListening,
      pendingTapListen: false,
      lastNudgeKey: null,
      listenSeq: 0,
      tapCount: 0,
    };
  }

  if (isListening) {
    return {
      activeClip: 'listen',
      eventKey: `listen:${roundsPlayed}:1`,
      reason: 'listen',
      roundsPlayed,
      wrongAttempts,
      wasListening: true,
      pendingTapListen: false,
      lastNudgeKey: null,
      listenSeq: 1,
      tapCount: 0,
    };
  }

  return {
    activeClip: 'idle_breathe',
    eventKey: `idle:${roundsPlayed}`,
    reason: 'idle',
    roundsPlayed,
    wrongAttempts,
    wasListening: false,
    pendingTapListen: false,
    lastNudgeKey: null,
    listenSeq: 0,
    tapCount: 0,
  };
}

export function promptCompanionReducer(
  state: PromptCompanionState,
  action: PromptCompanionAction,
): PromptCompanionState {
  if (action.type === 'tap') {
    const tapCount = state.tapCount + 1;
    return {
      ...state,
      activeClip: 'listen',
      eventKey: `tap:${tapCount}`,
      reason: 'tap',
      startedAtMs: action.nowMs,
      pendingTapListen: Boolean(action.willReplay),
      tapCount,
    };
  }

  const obs = action.observation;
  const isListening = obs.phase === 'listening' || obs.promptReplaying;
  const nudgeKey = obs.idleNudge?.eventKey ?? null;

  if (obs.roundsPlayed !== state.roundsPlayed) {
    if (obs.idleNudge) {
      return {
        ...state,
        activeClip: obs.idleNudge.animationName,
        eventKey: obs.idleNudge.eventKey,
        reason: 'nudge',
        startedAtMs: obs.idleNudge.startedAtMs,
        roundsPlayed: obs.roundsPlayed,
        wrongAttempts: obs.wrongAttempts,
        wasListening: isListening,
        pendingTapListen: false,
        lastNudgeKey: nudgeKey,
      };
    }

    if (isListening) {
      const listenSeq = state.listenSeq + 1;
      return {
        ...state,
        activeClip: 'listen',
        eventKey: `listen:${obs.roundsPlayed}:${listenSeq}`,
        reason: 'listen',
        startedAtMs: action.nowMs,
        roundsPlayed: obs.roundsPlayed,
        wrongAttempts: obs.wrongAttempts,
        wasListening: true,
        pendingTapListen: false,
        lastNudgeKey: null,
        listenSeq,
      };
    }

    return {
      ...state,
      activeClip: 'idle_breathe',
      eventKey: `idle:${obs.roundsPlayed}`,
      reason: 'idle',
      startedAtMs: action.nowMs,
      roundsPlayed: obs.roundsPlayed,
      wrongAttempts: obs.wrongAttempts,
      wasListening: false,
      pendingTapListen: false,
      lastNudgeKey: null,
    };
  }

  if (obs.idleNudge && nudgeKey !== state.lastNudgeKey) {
    return {
      ...state,
      activeClip: obs.idleNudge.animationName,
      eventKey: obs.idleNudge.eventKey,
      reason: 'nudge',
      startedAtMs: obs.idleNudge.startedAtMs,
      wrongAttempts: obs.wrongAttempts,
      wasListening: isListening,
      pendingTapListen: false,
      lastNudgeKey: nudgeKey,
    };
  }

  if (obs.wrongAttempts > state.wrongAttempts && obs.feedback === null) {
    return {
      ...state,
      activeClip: obs.wrongAttempts % 2 === 1 ? 'encourage' : 'shrug',
      eventKey: `retry:${obs.roundsPlayed}:${obs.wrongAttempts}`,
      reason: 'retry',
      startedAtMs: action.nowMs,
      wrongAttempts: obs.wrongAttempts,
      wasListening: isListening,
      pendingTapListen: false,
      lastNudgeKey: nudgeKey,
    };
  }

  if (isListening && !state.wasListening) {
    if (state.pendingTapListen) {
      return {
        ...state,
        wrongAttempts: obs.wrongAttempts,
        wasListening: true,
        pendingTapListen: false,
        lastNudgeKey: nudgeKey,
      };
    }
    const listenSeq = state.listenSeq + 1;
    return {
      ...state,
      activeClip: 'listen',
      eventKey: `listen:${obs.roundsPlayed}:${listenSeq}`,
      reason: 'listen',
      startedAtMs: action.nowMs,
      wrongAttempts: obs.wrongAttempts,
      wasListening: true,
      pendingTapListen: false,
      lastNudgeKey: nudgeKey,
      listenSeq,
    };
  }

  if (
    obs.wrongAttempts === state.wrongAttempts &&
    isListening === state.wasListening &&
    nudgeKey === state.lastNudgeKey
  ) {
    return state;
  }

  return {
    ...state,
    wrongAttempts: obs.wrongAttempts,
    wasListening: isListening,
    pendingTapListen: isListening ? state.pendingTapListen : false,
    lastNudgeKey: nudgeKey,
  };
}
