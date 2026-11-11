import type { GameState } from '../shared/game/gameState';

export const COMPANION_CLIP_NAMES = [
  'celebrate',
  'wave',
  'clap',
  'jump',
  'finale',
  'idle',
  'idle_breathe',
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

export const HOME_TAP_CLIPS = [
  'peekaboo',
  'stretch',
  'clap',
  'wiggle',
  'bow',
  'search',
  'listen',
] as const satisfies readonly CompanionClipName[];

export const IDLE_NUDGE_CLIPS = [
  'think',
  'search',
  'listen',
] as const satisfies readonly CompanionClipName[];

export const IDLE_NUDGE_DELAY_MS = 12_000;

export function selectIdleNudgeClip(roundsPlayed: number, nudgeIndex: number): CompanionClipName {
  const index = ((roundsPlayed + nudgeIndex) % IDLE_NUDGE_CLIPS.length + IDLE_NUDGE_CLIPS.length) % IDLE_NUDGE_CLIPS.length;
  return IDLE_NUDGE_CLIPS[index];
}

export function shouldArmIdleNudge(
  state: Pick<GameState, 'phase' | 'paused'>,
  contentLocked: boolean,
  companionEnabled: boolean,
): boolean {
  return state.phase === 'awaiting-answer' && !state.paused && !contentLocked && companionEnabled;
}

export interface HomeCompanionState {
  phase: 'welcome-wave' | 'welcome-breathe' | 'tap';
  activeClip: CompanionClipName;
  eventKey: string;
  startedAtMs?: number;
  tapCount: number;
  settled: boolean;
}

export type HomeCompanionAction =
  | { type: 'playbackComplete'; nowMs: number }
  | { type: 'tap'; nowMs: number };

export function createHomeCompanionState(startedAtMs?: number): HomeCompanionState {
  return {
    phase: 'welcome-wave',
    activeClip: 'wave',
    eventKey: 'welcome:0',
    startedAtMs,
    tapCount: 0,
    settled: false,
  };
}

export function homeCompanionReducer(
  state: HomeCompanionState,
  action: HomeCompanionAction,
): HomeCompanionState {
  if (action.type === 'tap') {
    const tapCount = state.tapCount + 1;
    const clipIndex = (tapCount - 1) % HOME_TAP_CLIPS.length;
    return {
      phase: 'tap',
      activeClip: HOME_TAP_CLIPS[clipIndex],
      eventKey: `tap:${tapCount}`,
      startedAtMs: action.nowMs,
      tapCount,
      settled: false,
    };
  }

  if (state.phase === 'welcome-wave') {
    return {
      ...state,
      phase: 'welcome-breathe',
      activeClip: 'idle_breathe',
      eventKey: 'welcome:1',
      startedAtMs: action.nowMs,
      settled: false,
    };
  }

  if (state.settled) return state;
  return { ...state, settled: true };
}

let sessionRotationOffset = 0;

export function advanceCelebrationRotation(step = 4): void {
  sessionRotationOffset =
    ((sessionRotationOffset + step) % ROUND_CELEBRATION_CLIPS.length + ROUND_CELEBRATION_CLIPS.length)
    % ROUND_CELEBRATION_CLIPS.length;
}

export function resetCelebrationRotation(): void {
  sessionRotationOffset = 0;
}

export type CelebrationObservation = Pick<GameState,
  'phase' | 'paused' | 'feedback' | 'roundsPlayed' | 'correctRounds'> & {
  maxRounds?: number;
};

export interface CelebrationEvent {
  eventKey: string;
  kind?: 'celebration' | 'encouragement';
  roundsPlayed: number;
  correctRounds: number;
  startedAtMs: number;
  animationName?: CompanionClipName;
}

export function selectCelebrationClip(observation: CelebrationObservation, offset = 0): CompanionClipName {
  const maxRounds = observation.maxRounds ?? 5;
  if (observation.phase === 'session-complete') {
    return observation.correctRounds === 0 ? 'encourage' : 'finale';
  }
  if (observation.roundsPlayed >= maxRounds) {
    return 'finale';
  }
  const index =
    ((Math.max(1, observation.correctRounds) - 1 + offset) % ROUND_CELEBRATION_CLIPS.length + ROUND_CELEBRATION_CLIPS.length)
    % ROUND_CELEBRATION_CLIPS.length;
  return ROUND_CELEBRATION_CLIPS[index];
}

export interface CelebrationState {
  run: number;
  offset: number;
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
  return {
    run: 0,
    offset: sessionRotationOffset,
    roundsPlayed: 0,
    correctRounds: 0,
    handledKey: null,
    active: null,
  };
}

function resolveTargetKind(observation: CelebrationObservation): 'celebration' | 'encouragement' | null {
  if (observation.roundsPlayed <= 0) return null;
  if (observation.phase === 'session-complete') {
    return observation.correctRounds === 0 ? 'encouragement' : 'celebration';
  }
  if (
    observation.phase === 'answered-correctly'
    && observation.feedback === 'success'
    && observation.correctRounds > 0
  ) {
    return 'celebration';
  }
  if (observation.phase === 'answered-incorrectly' && observation.feedback === 'failure') {
    return 'encouragement';
  }
  return null;
}

export function isCelebrationVisible(
  active: CelebrationEvent | null,
  observation: CelebrationObservation,
): boolean {
  if (active === null || observation.paused) return false;
  const targetKind = resolveTargetKind(observation);
  if (targetKind === null) return false;
  const activeKind = active.kind ?? 'celebration';
  const isFailureKey = active.eventKey.endsWith(':failure');
  const expectsFailureKey = observation.phase === 'answered-incorrectly';
  return activeKind === targetKind
    && isFailureKey === expectsFailureKey
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
  const base: CelebrationState = restarted
    ? {
        ...createCelebrationState(),
        run: state.run + 1,
        offset: (state.offset + 4) % ROUND_CELEBRATION_CLIPS.length,
      }
    : state;
  const next: CelebrationState = {
    ...base,
    roundsPlayed: observation.roundsPlayed,
    correctRounds: observation.correctRounds,
  };
  const targetKind = resolveTargetKind(observation);
  const suffix = observation.phase === 'answered-incorrectly' ? ':failure' : '';
  const key = targetKind !== null
    ? `${next.run}:${observation.roundsPlayed}:${observation.correctRounds}${suffix}`
    : null;

  if (targetKind === null || key === null || observation.paused) {
    return { ...next, handledKey: key ?? next.handledKey, active: null };
  }
  if (key === next.handledKey) {
    return next;
  }
  const animationName: CompanionClipName = observation.phase === 'answered-incorrectly'
    ? ((observation.roundsPlayed + next.run) % 2 === 1 ? 'encourage' : 'shrug')
    : selectCelebrationClip(observation, next.offset);

  return {
    ...next,
    handledKey: key,
    active: {
      eventKey: key,
      kind: targetKind,
      roundsPlayed: observation.roundsPlayed,
      correctRounds: observation.correctRounds,
      startedAtMs: action.nowMs,
      animationName,
    },
  };
}
