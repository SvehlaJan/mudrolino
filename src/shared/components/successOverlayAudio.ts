import { AudioSpec, PraiseEntry, SuccessSpec } from '../types';

export function getSuccessOverlayAudioSpec(
  locale: string,
  praise: PraiseEntry,
  spec: SuccessSpec,
): AudioSpec {
  return {
    clips: [
      ...(spec.audioSpec?.clips ?? []),
      { path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text },
    ],
  };
}
