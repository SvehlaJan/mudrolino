import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import {
  advanceCelebrationRotation,
  celebrationReducer,
  createCelebrationState,
  isCelebrationVisible,
  type CelebrationEvent,
  type CelebrationObservation,
} from './companionCelebration';

export function useCompanionCelebration(observation: CelebrationObservation): CelebrationEvent | null {
  const [celebration, dispatch] = useReducer(celebrationReducer, undefined, createCelebrationState);
  const playedRef = useRef(false);
  const { phase, paused, feedback, roundsPlayed, correctRounds, maxRounds } = observation;

  useLayoutEffect(() => {
    dispatch({
      type: 'observe',
      observation: { phase, paused, feedback, roundsPlayed, correctRounds, maxRounds },
      nowMs: performance.now(),
    });
  }, [phase, paused, feedback, roundsPlayed, correctRounds, maxRounds]);

  useEffect(() => {
    if (celebration.roundsPlayed > 0) {
      playedRef.current = true;
    }
  }, [celebration.roundsPlayed]);

  useEffect(() => () => {
    if (playedRef.current) {
      advanceCelebrationRotation(4);
    }
  }, []);

  return isCelebrationVisible(celebration.active, observation) ? celebration.active : null;
}
