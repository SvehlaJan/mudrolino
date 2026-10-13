import { Letter, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface FirstLetterItem {
  word: Word;
  firstLetter: Letter;
}

const SLOVAK_MULTI_CHARACTER_LETTERS = ['DŽ', 'DZ', 'CH'];

/** Letters written with more than one character in a locale's alphabet (Slovak DŽ, DZ, CH; Czech CH). */
export function multiCharacterLetters(alphabet: Letter[]): string[] {
  return alphabet.map((letter) => letter.symbol.toLocaleUpperCase('sk-SK')).filter((symbol) => symbol.length > 1);
}

function hasDiacritic(value: string): boolean {
  return value.normalize('NFD') !== value;
}

export function getActiveFirstLetterLetters(letters: Letter[], includeAccents: boolean): Letter[] {
  return includeAccents ? letters : letters.filter((letter) => !hasDiacritic(letter.symbol));
}

export function getFirstSlovakLetterSymbol(
  word: string,
  activeLetterSymbols: string[],
  alphabetMultiCharacterLetters: string[] = SLOVAK_MULTI_CHARACTER_LETTERS,
): string | null {
  const normalizedWord = word.trim().toLocaleUpperCase('sk-SK');
  if (!normalizedWord) return null;

  // A word starting with an inactive multi-character letter (DŽ with accents off)
  // has no playable first letter; it must not fall back to its first character.
  for (const symbol of alphabetMultiCharacterLetters) {
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

export function buildFirstLetterItems(
  words: Word[],
  activeLetters: Letter[],
  alphabetMultiCharacterLetters: string[] = SLOVAK_MULTI_CHARACTER_LETTERS,
): FirstLetterItem[] {
  const lettersBySymbol = new Map(activeLetters.map((letter) => [letter.symbol, letter]));
  const activeSymbols = activeLetters.map((letter) => letter.symbol);

  return words.flatMap((word) => {
    const firstLetterSymbol = getFirstSlovakLetterSymbol(word.word, activeSymbols, alphabetMultiCharacterLetters);
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
