export type GamePhase =
  | 'loading'
  | 'ready'
  | 'listening'
  | 'awaiting-answer'
  | 'resolving-answer'
  | 'answered-incorrectly'
  | 'answered-correctly'
  | 'transitioning'
  | 'session-complete'
  | 'recoverable-error';

export type GameFeedback = 'success' | 'failure' | null;

export interface GameState {
  phase: GamePhase;
  resumePhase: GamePhase | null;
  paused: boolean;
  maxRounds: number;
  maxAttempts: number | null;
  wrongAttempts: number;
  roundsPlayed: number;
  correctRounds: number;
  totalTaps: number;
  selectedAnswerId: string | null;
  feedback: GameFeedback;
  errorMessage: string | null;
}

export type GameEvent =
  | { type: 'LOAD' }
  | { type: 'ROUND_READY' }
  | { type: 'PROMPT_STARTED' }
  | { type: 'PROMPT_FINISHED' }
  | { type: 'ANSWER_STARTED'; answerId: string }
  | { type: 'ANSWER_PROGRESS'; countTap?: boolean }
  | { type: 'ANSWER_WRONG'; countTap?: boolean }
  | { type: 'ANSWER_CORRECT'; countTap?: boolean }
  | { type: 'RETRY_READY' }
  | { type: 'NEXT_ROUND' }
  | { type: 'SHOW_SESSION_COMPLETE' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'ERROR'; message: string };

export interface CreateGameStateOptions {
  maxRounds?: number;
  maxAttempts?: number | null;
}

export type GameStateOptions = CreateGameStateOptions;

const DEFAULT_MAX_ROUNDS = 5;
const DEFAULT_MAX_ATTEMPTS = 3;

export const createGameState = (options: CreateGameStateOptions = {}): GameState => ({
  phase: 'ready',
  resumePhase: null,
  paused: false,
  maxRounds: options.maxRounds ?? DEFAULT_MAX_ROUNDS,
  maxAttempts: options.maxAttempts === undefined ? DEFAULT_MAX_ATTEMPTS : options.maxAttempts,
  wrongAttempts: 0,
  roundsPlayed: 0,
  correctRounds: 0,
  totalTaps: 0,
  selectedAnswerId: null,
  feedback: null,
  errorMessage: null,
});

export const canAcceptAnswer = (state: GameState): boolean =>
  !state.paused && (state.phase === 'ready' || state.phase === 'listening' || state.phase === 'awaiting-answer');

export const gameStateReducer = (state: GameState, event: GameEvent): GameState => {
  switch (event.type) {
    case 'LOAD':
      if (state.paused || (state.phase !== 'ready' && state.phase !== 'recoverable-error')) return state;
      return { ...state, phase: 'loading', errorMessage: null };

    case 'ROUND_READY':
      if (state.paused || (state.phase !== 'loading' && state.phase !== 'transitioning')) return state;
      return {
        ...state,
        phase: 'awaiting-answer',
        selectedAnswerId: null,
        feedback: null,
      };

    case 'PROMPT_STARTED':
      if (!state.paused && (state.phase === 'ready' || state.phase === 'awaiting-answer')) {
        return { ...state, phase: 'listening' };
      }
      return state;

    case 'PROMPT_FINISHED':
      if (!state.paused && state.phase === 'listening') {
        return { ...state, phase: 'awaiting-answer' };
      }
      return state;

    case 'ANSWER_STARTED':
      if (!canAcceptAnswer(state)) {
        return state;
      }
      return {
        ...state,
        phase: 'resolving-answer',
        selectedAnswerId: event.answerId,
      };

    case 'ANSWER_PROGRESS':
      if (state.phase !== 'resolving-answer') {
        return state;
      }
      return {
        ...state,
        phase: 'awaiting-answer',
        selectedAnswerId: null,
        totalTaps: state.totalTaps + (event.countTap === false ? 0 : 1),
      };

    case 'ANSWER_WRONG': {
      if (state.phase !== 'resolving-answer') {
        return state;
      }
      const totalTaps = state.totalTaps + (event.countTap === false ? 0 : 1);
      const nextWrong = state.wrongAttempts + 1;
      const exhausted = state.maxAttempts !== null && nextWrong >= state.maxAttempts;
      if (exhausted) {
        return {
          ...state,
          phase: 'answered-incorrectly',
          feedback: 'failure',
          wrongAttempts: nextWrong,
          roundsPlayed: state.roundsPlayed + 1,
          totalTaps,
        };
      }
      return {
        ...state,
        phase: 'answered-incorrectly',
        wrongAttempts: nextWrong,
        feedback: null,
        totalTaps,
      };
    }

    case 'ANSWER_CORRECT':
      if (state.phase !== 'resolving-answer') {
        return state;
      }
      return {
        ...state,
        phase: 'answered-correctly',
        feedback: 'success',
        roundsPlayed: state.roundsPlayed + 1,
        correctRounds: state.correctRounds + 1,
        totalTaps: state.totalTaps + (event.countTap === false ? 0 : 1),
      };

    case 'RETRY_READY':
      if (state.phase === 'answered-incorrectly' && state.feedback === null) {
        return {
          ...state,
          phase: 'awaiting-answer',
          selectedAnswerId: null,
        };
      }
      return state;

    case 'NEXT_ROUND':
      if (state.paused || (state.phase !== 'answered-correctly' && !(state.phase === 'answered-incorrectly' && state.feedback === 'failure'))) return state;
      return {
        ...state,
        phase: 'ready',
        wrongAttempts: 0,
        selectedAnswerId: null,
        feedback: null,
      };

    case 'SHOW_SESSION_COMPLETE':
      if (state.paused || state.roundsPlayed < state.maxRounds || (state.phase !== 'answered-correctly' && !(state.phase === 'answered-incorrectly' && state.feedback === 'failure'))) return state;
      return {
        ...state,
        phase: 'session-complete',
      };

    case 'PLAY_AGAIN':
      return createGameState({
        maxRounds: state.maxRounds,
        maxAttempts: state.maxAttempts,
      });

    case 'PAUSE':
      if (state.paused) {
        return state;
      }
      return {
        ...state,
        paused: true,
        resumePhase: state.phase,
      };

    case 'RESUME':
      if (!state.paused) {
        return state;
      }
      return {
        ...state,
        paused: false,
        phase: state.resumePhase ?? state.phase,
        resumePhase: null,
      };

    case 'ERROR':
      if (state.paused || state.phase === 'session-complete' || state.phase === 'recoverable-error') return state;
      return {
        ...state,
        phase: 'recoverable-error',
        errorMessage: event.message,
      };

    default: {
      const _exhaustive: never = event;
      return state;
    }
  }
};

export const gameReducer = gameStateReducer;
