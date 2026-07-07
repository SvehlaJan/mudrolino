import { Syllable, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface CompleteSyllableRound {
  word: Word;
  syllables: string[];
  missingIndex: number;
  correctSyllable: string;
}

export interface CompleteSyllableSlot {
  text: string;
  isMissing: boolean;
}

export function parseWordSyllables(value: string): string[] {
  return value
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSyllable(value: string): string {
  return value.trim().toLocaleUpperCase('sk-SK');
}

function getUniqueSyllables(syllableItems: Syllable[]): Syllable[] {
  const bySymbol = new Map<string, Syllable>();
  for (const syllable of syllableItems) {
    if (!bySymbol.has(syllable.symbol)) {
      bySymbol.set(syllable.symbol, syllable);
    }
  }
  return Array.from(bySymbol.values());
}

export function chooseMissingIndex(syllableCount: number, random = Math.random): number {
  if (syllableCount <= 0) {
    throw new Error('Cannot choose a missing syllable from an empty word.');
  }
  return Math.min(syllableCount - 1, Math.floor(random() * syllableCount));
}

export function createCompleteSyllableRound(word: Word, missingIndex?: number): CompleteSyllableRound {
  const syllables = parseWordSyllables(word.syllables).map(normalizeSyllable);
  const resolvedMissingIndex = missingIndex ?? chooseMissingIndex(syllables.length);
  const correctSyllable = syllables[resolvedMissingIndex];

  if (!correctSyllable) {
    throw new Error(`Word "${word.word}" does not have a syllable at index ${resolvedMissingIndex}.`);
  }

  return {
    word,
    syllables,
    missingIndex: resolvedMissingIndex,
    correctSyllable,
  };
}

export function buildPromptSlots(round: CompleteSyllableRound, revealMissing: boolean): CompleteSyllableSlot[] {
  return round.syllables.map((syllable, index) => {
    const isMissing = index === round.missingIndex;
    return {
      text: isMissing && !revealMissing ? '__' : syllable,
      isMissing,
    };
  });
}

export function buildSyllableChoices(
  round: CompleteSyllableRound,
  syllableItems: Syllable[],
  choiceCount = 4,
): Syllable[] {
  const uniqueSyllables = getUniqueSyllables(syllableItems);
  const correct = uniqueSyllables.find((syllable) => syllable.symbol === round.correctSyllable);
  if (!correct) return [];

  const distractors = fisherYatesShuffle(
    uniqueSyllables.filter((syllable) => syllable.symbol !== round.correctSyllable),
  ).slice(0, Math.max(0, choiceCount - 1));

  if (distractors.length < choiceCount - 1) return [];
  return fisherYatesShuffle([correct, ...distractors]);
}

export function buildEligibleCompleteSyllableWords(
  words: Word[],
  syllableItems: Syllable[],
  choiceCount = 4,
): Word[] {
  const uniqueSymbols = new Set(getUniqueSyllables(syllableItems).map((syllable) => syllable.symbol));

  return words.filter((word) => {
    const syllables = parseWordSyllables(word.syllables).map(normalizeSyllable);
    if (syllables.length < 2 || syllables.length > 4) return false;

    return syllables.every((syllable) => (
      uniqueSymbols.has(syllable) &&
      Array.from(uniqueSymbols).filter((symbol) => symbol !== syllable).length >= choiceCount - 1
    ));
  });
}
