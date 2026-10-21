import { useEffect, useLayoutEffect, useReducer } from 'react';
import {
  celebrationReducer,
  createCelebrationState,
  isCelebrationVisible,
  type CelebrationEvent,
  type CelebrationObservation,
} from './companionCelebration';

export function useCompanionCelebration(observation: CelebrationObservation): CelebrationEvent | null {
  const [celebration, dispatch] = useReducer(celebrationReducer, undefined, createCelebrationState);
  const { phase, paused, feedback, roundsPlayed, correctRounds } = observation;
  useLayoutEffect(() => {
    dispatch({ type: 'observe', observation: { phase, paused, feedback, roundsPlayed, correctRounds }, nowMs: performance.now() });
  }, [phase, paused, feedback, roundsPlayed, correctRounds]);

  const eventKey = celebration.active?.eventKey;
  const expiresAtMs = celebration.active?.expiresAtMs;
  useEffect(() => {
    if (eventKey === undefined || expiresAtMs === undefined) return;
    let timer: ReturnType<typeof setTimeout>;
    const expire = () => {
      const nowMs = performance.now();
      const remaining = expiresAtMs - nowMs;
      if (remaining > 0) timer = setTimeout(expire, remaining);
      else dispatch({ type: 'expire', eventKey, nowMs });
    };
    timer = setTimeout(expire, Math.max(0, expiresAtMs - performance.now()));
    return () => { clearTimeout(timer); };
  }, [eventKey, expiresAtMs]);

  return isCelebrationVisible(celebration.active, observation) ? celebration.active : null;
}
