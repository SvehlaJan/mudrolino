interface PlacedSyllable {
  text: string;
}

export interface SelectedSyllableAudioDecision {
  placingLastTile: boolean;
  nextPlaced: (PlacedSyllable | null)[];
  correctSyllables: string[];
}

export function shouldPlaySelectedSyllableAudio({
  placingLastTile,
  nextPlaced,
  correctSyllables,
}: SelectedSyllableAudioDecision): boolean {
  if (!placingLastTile) return true;

  return nextPlaced.every((tile, index) => tile?.text === correctSyllables[index]);
}
