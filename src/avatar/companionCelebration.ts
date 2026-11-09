import type { GameState } from '../shared/game/gameState';

export const COMPANION_CLIP_NAMES = [
  'celebrate',
  'wave',
  'clap',
  'jump',
  'finale',
  'idle',
  'search',
  'think',
  'listen',
  'encourage',
  'shrug',
  'flex',
  'bow',
  'march',
  'wiggle',
  'peekaboo',
  'stretch',
] as const;
export type CompanionClipName = (typeof COMPANION_CLIP_NAMES)[number];
export const CELEBRATION_CLIPS: readonly CompanionClipName[] = [
  'celebrate',
  'wave',
  'clap',
  'jump',
  'finale',
  'flex',
  'bow',
  'march',
  'wiggle',
];
export const ROUND_CELEBRATION_CLIPS: readonly CompanionClipName[] = [
  'celebrate',
  'wave',
  'clap',
  'jump',
  'flex',
  'bow',
  'march',
  'wiggle',
];

export type CelebrationObservation = Pick<GameState,
  'phase' | 'paused' | 'feedback' | 'roundsPlayed' | 'correctRounds'> & {
  maxRounds?: number;
};

export interface CelebrationEvent {
  eventKey: string;
  roundsPlayed: number;
  correctRounds: number;
  startedAtMs: number;
  animationName?: CompanionClipName;
}

export function selectCelebrationClip(observation: CelebrationObservation): CompanionClipName {
  const maxRounds = observation.maxRounds ?? 5;
  if (observation.phase === 'session-complete' || observation.roundsPlayed >= maxRounds) {
    return 'finale';
  }
  const index = (Math.max(1, observation.correctRounds) - 1) % ROUND_CELEBRATION_CLIPS.length;
  return ROUND_CELEBRATION_CLIPS[index];
}

export interface CelebrationState {
  run: number;
  roundsPlayed: number;
  correctRounds: number;
  handledKey: string | null;
  active: CelebrationEvent | null;
}

export type CelebrationAction = {
  type: 'observe';
  observation: CelebrationObservation;
  nowMs: number;
};

export function createCelebrationState(): CelebrationState {
  return { run: 0, roundsPlayed: 0, correctRounds: 0, handledKey: null, active: null };
}

function isCelebrationTarget(observation: CelebrationObservation): boolean {
  if (observation.roundsPlayed <= 0) return false;
  if (observation.phase === 'session-complete') return true;
  return observation.phase === 'answered-correctly'
    && observation.feedback === 'success'
    && observation.correctRounds > 0;
}

export function isCelebrationVisible(
  active: CelebrationEvent | null,
  observation: CelebrationObservation,
): boolean {
  return active !== null
    && !observation.paused
    && isCelebrationTarget(observation)
    && active.roundsPlayed === observation.roundsPlayed
    && active.correctRounds === observation.correctRounds;
}

export function celebrationReducer(
  state: CelebrationState,
  action: CelebrationAction,
): CelebrationState {
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
  const key = isCelebrationTarget(observation)
    ? `${next.run}:${observation.roundsPlayed}:${observation.correctRounds}`
    : null;

  if (key === null || observation.paused) {
    return { ...next, handledKey: key ?? next.handledKey, active: null };
  }
  if (key === next.handledKey) {
    return next;
  }
  return {
    ...next,
    handledKey: key,
    active: {
      eventKey: key,
      roundsPlayed: observation.roundsPlayed,
      correctRounds: observation.correctRounds,
      startedAtMs: action.nowMs,
      animationName: selectCelebrationClip(observation),
    },
  };
}
