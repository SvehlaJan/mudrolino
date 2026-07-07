import { Letter, Word } from '../../shared/types';
import {
  buildFirstLetterItems,
  buildLetterChoices,
  getActiveFirstLetterLetters,
  getFirstSlovakLetterSymbol,
} from './firstLetterLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const letters: Letter[] = [
  { symbol: 'A', label: 'Auto', emoji: '🚗', audioKey: 'a' },
  { symbol: 'B', label: 'Baran', emoji: '🐏', audioKey: 'b' },
  { symbol: 'C', label: 'Citrón', emoji: '🍋', audioKey: 'c' },
  { symbol: 'CH', label: 'Chlieb', emoji: '🍞', audioKey: 'ch' },
  { symbol: 'D', label: 'Dúha', emoji: '🌈', audioKey: 'd' },
  { symbol: 'DZ', label: 'Dzúra', emoji: '🕳️', audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džungľa', emoji: '🌴', audioKey: 'dz-caron' },
  { symbol: 'J', label: 'Jahoda', emoji: '🍓', audioKey: 'j' },
  { symbol: 'M', label: 'Mesiac', emoji: '🌙', audioKey: 'm' },
  { symbol: 'Z', label: 'Zebra', emoji: '🦓', audioKey: 'z' },
  { symbol: 'Ž', label: 'Žaba', emoji: '🐸', audioKey: 'z-caron' },
];

const words: Word[] = [
  { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' },
  { word: 'Žaba', syllables: 'ža-ba', emoji: '🐸', audioKey: 'zaba' },
  { word: 'Chlieb', syllables: 'chlieb', emoji: '🍞', audioKey: 'chlieb' },
  { word: 'Džús', syllables: 'džús', emoji: '🧃', audioKey: 'dzus' },
  { word: 'Dzban', syllables: 'dzban', emoji: '🏺', audioKey: 'dzban' },
  { word: '1auto', syllables: 'au-to', emoji: '🚗', audioKey: '1auto' },
];

const allSymbols = letters.map((letter) => letter.symbol);
assert(getFirstSlovakLetterSymbol('Jahoda', allSymbols) === 'J', 'Jahoda derives J');
assert(getFirstSlovakLetterSymbol('Žaba', allSymbols) === 'Ž', 'Žaba derives Ž');
assert(getFirstSlovakLetterSymbol('Chlieb', allSymbols) === 'CH', 'Chlieb derives CH');
assert(getFirstSlovakLetterSymbol('Džús', allSymbols) === 'DŽ', 'Džús derives DŽ');
assert(getFirstSlovakLetterSymbol('Dzban', allSymbols) === 'DZ', 'Dzban derives DZ');
assert(getFirstSlovakLetterSymbol('1auto', allSymbols) === null, 'word with unavailable first symbol is excluded');

const accentOffLetters = getActiveFirstLetterLetters(letters, false);
assert(accentOffLetters.some((letter) => letter.symbol === 'CH'), 'CH remains active when accents are off');
assert(accentOffLetters.some((letter) => letter.symbol === 'DZ'), 'DZ remains active when accents are off');
assert(!accentOffLetters.some((letter) => letter.symbol === 'Ž'), 'Ž is inactive when accents are off');
assert(!accentOffLetters.some((letter) => letter.symbol === 'DŽ'), 'DŽ is inactive when accents are off');

const accentOnItems = buildFirstLetterItems(words, letters);
assert(accentOnItems.some((item) => item.word.word === 'Žaba' && item.firstLetter.symbol === 'Ž'), 'accented words are eligible when letter is active');
assert(accentOnItems.some((item) => item.word.word === 'Chlieb' && item.firstLetter.symbol === 'CH'), 'CH words are eligible');
assert(!accentOnItems.some((item) => item.word.word === '1auto'), 'words with no active first letter are not eligible');

const accentOffItems = buildFirstLetterItems(words, accentOffLetters);
assert(!accentOffItems.some((item) => item.word.word === 'Žaba'), 'accented words are excluded when accents are off');
assert(!accentOffItems.some((item) => item.word.word === 'Džús'), 'DŽ words are excluded when accents are off');
assert(accentOffItems.some((item) => item.word.word === 'Chlieb'), 'CH words stay eligible when accents are off');

const target = accentOnItems.find((item) => item.word.word === 'Jahoda');
assert(Boolean(target), 'target item exists');
if (target) {
  const choices = buildLetterChoices(target, letters, 4);
  const symbols = choices.map((letter) => letter.symbol);
  assert(choices.length === 4, 'four choices are generated');
  assert(symbols.includes('J'), 'choices include the correct letter');
  assert(new Set(symbols).size === symbols.length, 'choices do not contain duplicate letters');
}

console.log('firstLetterLogic checks passed');
