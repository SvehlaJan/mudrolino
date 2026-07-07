import { AudioSpec, PraiseEntry } from '../types';

export function getSessionCompleteAudioSpec(locale: string, praise: PraiseEntry): AudioSpec {
  return {
    clips: [
      { path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text },
    ],
  };
}
