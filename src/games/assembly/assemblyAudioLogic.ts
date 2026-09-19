interface PlacedSyllable {
  text: string;
}

export interface SelectedSyllableAudioDecision {
  placingLastTile: boolean;
  nextPlaced: (PlacedSyllable | null)[];
  correctSyllables: string[];
}

/**
 * The Assembly wrong-answer exception, made explicit: every non-final tile, and a correct
 * final tile, speak their own syllable immediately ('selected-now'). A wrong final tile is the
 * one case where that immediate call must be skipped — the bespoke wrong-answer sequence
 * (selected syllable -> retry phrase -> target word) owns announcing it exactly once, so the
 * caller must not also play it as a normal selection.
 */
export type AssemblySelectionAudio = 'selected-now' | 'defer-to-wrong-sequence';

export function getAssemblySelectionAudioDecision({
  placingLastTile,
  nextPlaced,
  correctSyllables,
}: SelectedSyllableAudioDecision): AssemblySelectionAudio {
  if (!placingLastTile) return 'selected-now';
  const correct = nextPlaced.every((tile, index) => tile?.text === correctSyllables[index]);
  return correct ? 'selected-now' : 'defer-to-wrong-sequence';
}

/** Retained for compatibility with any existing Boolean-only callers/tests. */
export function shouldPlaySelectedSyllableAudio(input: SelectedSyllableAudioDecision): boolean {
  return getAssemblySelectionAudioDecision(input) === 'selected-now';
}
