import { CompleteLetterMissingCount, Letter, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export type CompleteLetterSlotState = 'visible' | 'pending' | 'active' | 'filled';

export interface CompleteLetterRound {
  word: Word;
  units: string[];
  missingIndexes: number[];
}

export interface CompleteLetterSlot {
  index: number;
  text: string;
  state: CompleteLetterSlotState;
}

const SLOVAK_MULTI_CHARACTER_LETTERS = ['DŽ', 'DZ', 'CH'];

function normalizeLetter(value: string): string {
  return value.trim().toLocaleUpperCase('sk-SK');
}

function hasDiacritic(value: string): boolean {
  return value.normalize('NFD') !== value;
}

function normalizeLetters(letters: Letter[]): Letter[] {
  const bySymbol = new Map<string, Letter>();
  for (const letter of letters) {
    const symbol = normalizeLetter(letter.symbol);
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, { ...letter, symbol });
    }
  }
  return Array.from(bySymbol.values());
}

export function getActiveCompleteLetterLetters(letters: Letter[], includeAccents: boolean): Letter[] {
  const normalized = normalizeLetters(letters);
  return includeAccents ? normalized : normalized.filter((letter) => !hasDiacritic(letter.symbol));
}

export function parseWordLetterUnits(word: string, activeLetters: Letter[]): string[] | null {
  const activeSymbols = new Set(normalizeLetters(activeLetters).map((letter) => letter.symbol));
  const orderedSymbols = Array.from(activeSymbols).sort((a, b) => b.length - a.length);
  const normalizedWord = normalizeLetter(word);
  const units: string[] = [];
  let index = 0;

  while (index < normalizedWord.length) {
    const rest = normalizedWord.slice(index);
    const match = orderedSymbols.find((symbol) => rest.startsWith(symbol))
      ?? SLOVAK_MULTI_CHARACTER_LETTERS.find((symbol) => rest.startsWith(symbol));

    if (!match || !activeSymbols.has(match)) {
      return null;
    }

    units.push(match);
    index += match.length;
  }

  return units.length >= 2 ? units : null;
}

export function resolveMissingCount(mode: CompleteLetterMissingCount, unitCount: number): number {
  if (unitCount <= 0) return 0;
  if (mode === 'adaptive') {
    return unitCount >= 5 ? 2 : 1;
  }
  return Math.min(mode, unitCount);
}

export function chooseMissingIndexes(
  unitCount: number,
  missingCount: number,
  random = Math.random,
): number[] {
  if (unitCount <= 0 || missingCount <= 0) return [];
  const available = Array.from({ length: unitCount }, (_, index) => index);
  const chosen: number[] = [];
  const resolvedCount = Math.min(missingCount, unitCount);

  while (chosen.length < resolvedCount) {
    const pickIndex = Math.min(available.length - 1, Math.floor(random() * available.length));
    const [picked] = available.splice(pickIndex, 1);
    chosen.push(picked);
  }

  return chosen.sort((a, b) => a - b);
}

export function createCompleteLetterRound(
  word: Word,
  activeLetters: Letter[],
  missingCountMode: CompleteLetterMissingCount,
  random = Math.random,
): CompleteLetterRound {
  const units = parseWordLetterUnits(word.word, activeLetters);
  if (!units) {
    throw new Error(`Word "${word.word}" cannot be split into active Slovak letter units.`);
  }

  const missingCount = resolveMissingCount(missingCountMode, units.length);
  const missingIndexes = chooseMissingIndexes(units.length, missingCount, random);
  if (missingIndexes.length === 0) {
    throw new Error(`Word "${word.word}" does not have a playable missing-letter position.`);
  }

  return { word, units, missingIndexes };
}

export function getActiveMissingIndex(round: CompleteLetterRound, filledCount: number): number | null {
  return round.missingIndexes[filledCount] ?? null;
}

export function buildPromptSlots(round: CompleteLetterRound, filledCount: number): CompleteLetterSlot[] {
  const activeMissingIndex = getActiveMissingIndex(round, filledCount);
  const missingByIndex = new Map(round.missingIndexes.map((index, order) => [index, order]));

  return round.units.map((unit, index) => {
    const missingOrder = missingByIndex.get(index);
    if (missingOrder === undefined) {
      return { index, text: unit, state: 'visible' };
    }
    if (missingOrder < filledCount) {
      return { index, text: unit, state: 'filled' };
    }
    if (index === activeMissingIndex) {
      return { index, text: '__', state: 'active' };
    }
    return { index, text: '__', state: 'pending' };
  });
}

export function buildLetterChoices(
  round: CompleteLetterRound,
  activeLetters: Letter[],
  filledCount: number,
  choiceCount = 4,
): Letter[] {
  const activeMissingIndex = getActiveMissingIndex(round, filledCount);
  if (activeMissingIndex === null) return [];

  const correctSymbol = round.units[activeMissingIndex];
  const uniqueLetters = normalizeLetters(activeLetters);
  const correct = uniqueLetters.find((letter) => letter.symbol === correctSymbol);
  if (!correct) return [];

  const distractors = fisherYatesShuffle(
    uniqueLetters.filter((letter) => letter.symbol !== correctSymbol),
  ).slice(0, Math.max(0, choiceCount - 1));

  if (distractors.length < choiceCount - 1) return [];
  return fisherYatesShuffle([correct, ...distractors]);
}

export function buildEligibleCompleteLetterWords(
  words: Word[],
  letters: Letter[],
  includeAccents: boolean,
  missingCountMode: CompleteLetterMissingCount,
  choiceCount = 4,
): Word[] {
  const activeLetters = getActiveCompleteLetterLetters(letters, includeAccents);
  if (activeLetters.length < choiceCount) return [];

  return words.filter((word) => {
    const units = parseWordLetterUnits(word.word, activeLetters);
    if (!units) return false;
    const missingCount = resolveMissingCount(missingCountMode, units.length);
    return missingCount > 0 && missingCount <= units.length;
  });
}
