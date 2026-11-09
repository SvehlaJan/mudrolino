import { useLayoutEffect, useReducer } from 'react';
import {
  celebrationReducer,
  createCelebrationState,
  isCelebrationVisible,
  type CelebrationEvent,
  type CelebrationObservation,
} from './companionCelebration';

export function useCompanionCelebration(observation: CelebrationObservation): CelebrationEvent | null {
  const [celebration, dispatch] = useReducer(celebrationReducer, undefined, createCelebrationState);
  const { phase, paused, feedback, roundsPlayed, correctRounds, maxRounds } = observation;
  useLayoutEffect(() => {
    dispatch({
      type: 'observe',
      observation: { phase, paused, feedback, roundsPlayed, correctRounds, maxRounds },
      nowMs: performance.now(),
    });
  }, [phase, paused, feedback, roundsPlayed, correctRounds, maxRounds]);

  return isCelebrationVisible(celebration.active, observation) ? celebration.active : null;
}
