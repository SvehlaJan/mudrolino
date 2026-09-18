import { canAcceptAnswer, createGameState, gameStateReducer } from './gameState';

let state = createGameState({ maxRounds: 5, maxAttempts: 3 });
if (state.phase !== 'ready' || state.roundsPlayed !== 0 || state.totalTaps !== 0) throw new Error('bad initial state');
if (gameStateReducer(state, { type: 'ROUND_READY' }) !== state) throw new Error('ROUND_READY must reject from ready');
if (gameStateReducer(state, { type: 'NEXT_ROUND' }) !== state) throw new Error('NEXT_ROUND must reject before terminal feedback');
if (gameStateReducer(state, { type: 'SHOW_SESSION_COMPLETE' }) !== state) throw new Error('completion must reject before max rounds');
state = gameStateReducer(state, { type: 'PROMPT_STARTED' });
if (state.phase !== 'listening' || !canAcceptAnswer(state)) throw new Error('opening audio must remain answerable');
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'B' });
if (canAcceptAnswer(state) || state.selectedAnswerId !== 'B') throw new Error('answer in flight must lock taps');
state = gameStateReducer(state, { type: 'PAUSE' });
if (!state.paused || state.resumePhase !== 'resolving-answer') throw new Error('pause must preserve in-flight resolution');
for (const event of [
  { type: 'ANSWER_PROGRESS' as const },
  { type: 'ANSWER_WRONG' as const },
  { type: 'ANSWER_CORRECT' as const },
]) {
  if (gameStateReducer(state, event) !== state) throw new Error('paused answer resolution must be ignored');
}
if (state.totalTaps !== 0 || state.wrongAttempts !== 0 || state.feedback !== null) throw new Error('paused resolution mutated counters');
state = gameStateReducer(state, { type: 'RESUME' });
if (state.paused || state.phase !== 'resolving-answer') throw new Error('resume must restore in-flight resolution');
state = gameStateReducer(state, { type: 'ANSWER_WRONG' });
if (state.phase !== 'answered-incorrectly' || state.wrongAttempts !== 1 || state.totalTaps !== 1) throw new Error('bad retry');
state = gameStateReducer(state, { type: 'RETRY_READY' });
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'C' });
state = gameStateReducer(state, { type: 'ANSWER_WRONG', countTap: false });
if (state.totalTaps !== 1) throw new Error('wrong answer countTap false must not increment taps');
state = gameStateReducer(state, { type: 'RETRY_READY' });
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'D' });
state = gameStateReducer(state, { type: 'ANSWER_WRONG' });
if (state.feedback !== 'failure' || state.roundsPlayed !== 1 || state.correctRounds !== 0) throw new Error('bad exhaustion');
state = gameStateReducer(state, { type: 'NEXT_ROUND' });
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'A' });
state = gameStateReducer(state, { type: 'ANSWER_CORRECT' });
if (state.feedback !== 'success' || state.roundsPlayed !== 2 || state.correctRounds !== 1) throw new Error('bad success');
const phase = state.phase;
state = gameStateReducer(state, { type: 'PAUSE' });
if (!state.paused || canAcceptAnswer(state)) throw new Error('pause must block input');
if (gameStateReducer(state, { type: 'ERROR', message: 'ignored while paused' }) !== state) throw new Error('paused error must be ignored');
state = gameStateReducer(state, { type: 'RESUME' });
if (state.paused || state.phase !== phase) throw new Error('resume lost phase');
state = gameStateReducer(state, { type: 'ERROR', message: 'Obsah sa nepodarilo načítať.' });
if (state.phase !== 'recoverable-error' || !state.errorMessage) throw new Error('error missing');
state = gameStateReducer(state, { type: 'PLAY_AGAIN' });
if (state.phase !== 'ready' || state.roundsPlayed !== 0 || state.totalTaps !== 0) throw new Error('reset failed');

// In the same verifier, create a state with maxAttempts: null:
// assert ANSWER_PROGRESS with countTap: false returns to awaiting-answer without changing totals,
// and assert five consecutive wrong resolutions never produce failure or increment roundsPlayed.
// Repeat progress with default countTap and assert it increments totalTaps exactly once.
let uncapped = createGameState({ maxRounds: 5, maxAttempts: null });
uncapped = gameStateReducer(uncapped, { type: 'LOAD' });
uncapped = gameStateReducer(uncapped, { type: 'ROUND_READY' });
uncapped = gameStateReducer(uncapped, { type: 'ANSWER_STARTED', answerId: 'X' });
uncapped = gameStateReducer(uncapped, { type: 'ANSWER_PROGRESS', countTap: false });
if (uncapped.phase !== 'awaiting-answer' || uncapped.totalTaps !== 0 || uncapped.roundsPlayed !== 0) {
  throw new Error('bad progress with countTap: false');
}
uncapped = gameStateReducer(uncapped, { type: 'ANSWER_STARTED', answerId: 'Y' });
uncapped = gameStateReducer(uncapped, { type: 'ANSWER_PROGRESS' });
if (uncapped.phase !== 'awaiting-answer' || uncapped.totalTaps !== 1) {
  throw new Error('progress with default countTap must increment totalTaps exactly once');
}
for (let i = 0; i < 5; i++) {
  uncapped = gameStateReducer(uncapped, { type: 'ANSWER_STARTED', answerId: `W${i}` });
  uncapped = gameStateReducer(uncapped, { type: 'ANSWER_WRONG' });
  if (uncapped.feedback === 'failure' || uncapped.roundsPlayed !== 0) {
    throw new Error('uncapped attempts must never produce failure or increment roundsPlayed');
  }
  uncapped = gameStateReducer(uncapped, { type: 'RETRY_READY' });
}

console.log('✓ shared game state contract passed');
