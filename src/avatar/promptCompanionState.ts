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
  gameId?: string;
  roundsPlayed: number;
  wrongAttempts: number;
  feedback: GameState['feedback'];
  promptReplaying: boolean;
  idleNudge: CompanionNudgeEvent | null;
}

const NUMERACY_GAME_IDS = new Set(['NUMBERS', 'COUNTING_ITEMS', 'COMPARE_QUANTITIES', 'ADDITION']);
const LITERACY_EXPLAIN_GAME_IDS = new Set([
  'SYLLABLES',
  'WORDS',
  'ASSEMBLY',
  'COMPLETE_SYLLABLE',
  'COMPLETE_LETTER',
  'FIRST_LETTER',
]);

function selectRetryClip(wrongAttempts: number): CompanionClipName {
  const step = ((wrongAttempts - 1) % 3 + 3) % 3;
  if (step === 0) return 'gentle_try_again';
  if (step === 1) return 'encourage';
  return 'shrug';
}

function selectPromptListenClip(gameId: string | undefined, listenSeq: number): CompanionClipName {
  if (gameId && NUMERACY_GAME_IDS.has(gameId) && listenSeq % 2 === 1) {
    return 'count_one_two_three';
  }
  if (gameId && LITERACY_EXPLAIN_GAME_IDS.has(gameId) && listenSeq % 2 === 1) {
    return 'talk_explain';
  }
  return 'listen';
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
  const isReplaying = Boolean(initial?.promptReplaying);

  if (initial?.idleNudge) {
    return {
      activeClip: initial.idleNudge.animationName,
      eventKey: initial.idleNudge.eventKey,
      reason: 'nudge',
      startedAtMs: initial.idleNudge.startedAtMs,
      roundsPlayed,
      wrongAttempts,
      wasListening: isReplaying,
      pendingTapListen: false,
      lastNudgeKey: initial.idleNudge.eventKey,
      listenSeq: 0,
      tapCount: 0,
    };
  }

  if (wrongAttempts > 0 && initial?.feedback === null) {
    return {
      activeClip: selectRetryClip(wrongAttempts),
      eventKey: `retry:${roundsPlayed}:${wrongAttempts}`,
      reason: 'retry',
      roundsPlayed,
      wrongAttempts,
      wasListening: isReplaying,
      pendingTapListen: false,
      lastNudgeKey: null,
      listenSeq: 0,
      tapCount: 0,
    };
  }

  if (isReplaying) {
    return {
      activeClip: selectPromptListenClip(initial?.gameId, 1),
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
  const isReplaying = Boolean(obs.promptReplaying);
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
        wasListening: isReplaying,
        pendingTapListen: false,
        lastNudgeKey: nudgeKey,
      };
    }

    if (isReplaying) {
      const listenSeq = state.listenSeq + 1;
      return {
        ...state,
        activeClip: selectPromptListenClip(obs.gameId, listenSeq),
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
      wasListening: isReplaying,
      pendingTapListen: false,
      lastNudgeKey: nudgeKey,
    };
  }

  if (obs.wrongAttempts > state.wrongAttempts && obs.feedback === null) {
    return {
      ...state,
      activeClip: selectRetryClip(obs.wrongAttempts),
      eventKey: `retry:${obs.roundsPlayed}:${obs.wrongAttempts}`,
      reason: 'retry',
      startedAtMs: action.nowMs,
      wrongAttempts: obs.wrongAttempts,
      wasListening: isReplaying,
      pendingTapListen: false,
      lastNudgeKey: nudgeKey,
    };
  }

  if (isReplaying && !state.wasListening) {
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
      activeClip: selectPromptListenClip(obs.gameId, listenSeq),
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
    isReplaying === state.wasListening &&
    nudgeKey === state.lastNudgeKey
  ) {
    return state;
  }

  return {
    ...state,
    wrongAttempts: obs.wrongAttempts,
    wasListening: isReplaying,
    pendingTapListen: isReplaying ? state.pendingTapListen : false,
    lastNudgeKey: nudgeKey,
  };
}
