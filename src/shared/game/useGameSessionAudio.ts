import { useEffect, useEffectEvent } from 'react';
import { TIMING } from '../contentRegistry';
import { getSessionCompleteAudioSpec } from '../components/sessionCompleteAudio';
import { audioManager } from '../services/audioManager';
import type { AudioSpec, PraiseEntry } from '../types';
import type { UseGameSessionResult } from './useGameSession';

interface GameSessionAudioOptions {
  session: UseGameSessionResult;
  /** Identity changes only when the board moves to a new round. */
  roundKey: unknown;
  enabled?: boolean;
  getPromptAudio(): AudioSpec;
  locale: string;
  completionPraise: PraiseEntry;
}

/** Shared delayed opening and completion audio; answer audio remains owned by the controller. */
export function useGameSessionAudio({ session, roundKey, enabled = true, getPromptAudio, locale, completionPraise }: GameSessionAudioOptions) {
  const { startOpeningPrompt, state } = session;
  const openRound = useEffectEvent(() => { void startOpeningPrompt(getPromptAudio()); });
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => openRound(), TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [roundKey, enabled, locale]);

  useEffect(() => {
    if (state.phase !== 'session-complete' || state.paused) return;
    void audioManager.play(getSessionCompleteAudioSpec(locale, completionPraise));
    return () => audioManager.stop();
  }, [state.phase, state.paused, locale, completionPraise]);
}
