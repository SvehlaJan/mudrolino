import { Letter, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface FirstLetterItem {
  word: Word;
  firstLetter: Letter;
}

const SLOVAK_MULTI_CHARACTER_LETTERS = ['DŽ', 'DZ', 'CH'];

function hasDiacritic(value: string): boolean {
  return value.normalize('NFD') !== value;
}

export function getActiveFirstLetterLetters(letters: Letter[], includeAccents: boolean): Letter[] {
  return includeAccents ? letters : letters.filter((letter) => !hasDiacritic(letter.symbol));
}

export function getFirstSlovakLetterSymbol(word: string, activeLetterSymbols: string[]): string | null {
  const normalizedWord = word.trim().toLocaleUpperCase('sk-SK');
  if (!normalizedWord) return null;

  for (const symbol of SLOVAK_MULTI_CHARACTER_LETTERS) {
    if (normalizedWord.startsWith(symbol)) {
      return activeLetterSymbols.includes(symbol) ? symbol : null;
    }
  }

  const orderedSymbols = [...activeLetterSymbols].sort((a, b) => b.length - a.length);
  for (const symbol of orderedSymbols) {
    if (normalizedWord.startsWith(symbol)) {
      return symbol;
    }
  }

  const [firstCharacter] = Array.from(normalizedWord);
  return activeLetterSymbols.includes(firstCharacter) ? firstCharacter : null;
}

export function buildFirstLetterItems(words: Word[], activeLetters: Letter[]): FirstLetterItem[] {
  const lettersBySymbol = new Map(activeLetters.map((letter) => [letter.symbol, letter]));
  const activeSymbols = activeLetters.map((letter) => letter.symbol);

  return words.flatMap((word) => {
    const firstLetterSymbol = getFirstSlovakLetterSymbol(word.word, activeSymbols);
    if (!firstLetterSymbol) return [];
    const firstLetter = lettersBySymbol.get(firstLetterSymbol);
    return firstLetter ? [{ word, firstLetter }] : [];
  });
}

export function buildLetterChoices(
  target: FirstLetterItem,
  activeLetters: Letter[],
  choiceCount = 4,
): Letter[] {
  const distractors = fisherYatesShuffle(
    activeLetters.filter((letter) => letter.symbol !== target.firstLetter.symbol),
  ).slice(0, Math.max(0, choiceCount - 1));

  return fisherYatesShuffle([target.firstLetter, ...distractors]);
}
