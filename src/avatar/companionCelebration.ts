import type { GameState } from '../shared/game/gameState';

export const CELEBRATION_WINDOW_MS = 1600;

export type CelebrationObservation = Pick<GameState,
  'phase' | 'paused' | 'feedback' | 'roundsPlayed' | 'correctRounds'>;

export interface CelebrationEvent {
  eventKey: string;
  roundsPlayed: number;
  correctRounds: number;
  startedAtMs: number;
  expiresAtMs: number;
}

export interface CelebrationState {
  run: number;
  roundsPlayed: number;
  correctRounds: number;
  handledKey: string | null;
  active: CelebrationEvent | null;
}

export type CelebrationAction =
  | { type: 'observe'; observation: CelebrationObservation; nowMs: number }
  | { type: 'expire'; eventKey: string; nowMs: number };

export function createCelebrationState(): CelebrationState {
  return { run: 0, roundsPlayed: 0, correctRounds: 0, handledKey: null, active: null };
}

function isCorrectFeedback(observation: CelebrationObservation): boolean {
  return observation.feedback === 'success'
    && observation.roundsPlayed > 0
    && observation.correctRounds > 0
    && (observation.phase === 'answered-correctly'
      || observation.phase === 'session-complete');
}

export function isCelebrationVisible(
  active: CelebrationEvent | null,
  observation: CelebrationObservation,
): boolean {
  return active !== null
    && !observation.paused
    && isCorrectFeedback(observation)
    && active.roundsPlayed === observation.roundsPlayed
    && active.correctRounds === observation.correctRounds;
}

export function celebrationReducer(
  state: CelebrationState,
  action: CelebrationAction,
): CelebrationState {
  if (action.type === 'expire') {
    if (!state.active || state.active.eventKey !== action.eventKey
      || action.nowMs < state.active.expiresAtMs) return state;
    return { ...state, active: null };
  }

  const observation = action.observation;
  const restarted = observation.roundsPlayed < state.roundsPlayed
    || observation.correctRounds < state.correctRounds;
  const base = restarted
    ? { ...createCelebrationState(), run: state.run + 1 }
    : state;
  const next = {
    ...base,
    roundsPlayed: observation.roundsPlayed,
    correctRounds: observation.correctRounds,
  };
  const key = isCorrectFeedback(observation)
    ? `${next.run}:${observation.roundsPlayed}:${observation.correctRounds}`
    : null;

  if (key === null || observation.paused) {
    return { ...next, handledKey: key ?? next.handledKey, active: null };
  }
  if (key === next.handledKey) {
    return next.active && action.nowMs >= next.active.expiresAtMs
      ? { ...next, active: null }
      : next;
  }
  return {
    ...next,
    handledKey: key,
    active: {
      eventKey: key,
      roundsPlayed: observation.roundsPlayed,
      correctRounds: observation.correctRounds,
      startedAtMs: action.nowMs,
      expiresAtMs: action.nowMs + CELEBRATION_WINDOW_MS,
    },
  };
}
