import { Syllable, Word } from '../../shared/types';
import {
  buildEligibleCompleteSyllableWords,
  buildPromptSlots,
  buildSyllableChoices,
  chooseMissingIndex,
  createCompleteSyllableRound,
  parseWordSyllables,
} from './completeSyllableLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const jahoda: Word = { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' };
const kura: Word = { word: 'Kura', syllables: 'ku-ra', emoji: '🐔', audioKey: 'kura' };
const badShort: Word = { word: 'Pes', syllables: 'pes', emoji: '🐶', audioKey: 'pes' };
const badLong: Word = { word: 'Nepouzite', syllables: 'ne-po-u-zi-te', emoji: '🧩', audioKey: 'nepouzite' };
const spaced: Word = { word: 'Medzera', syllables: ' ma - ma ', emoji: '👩', audioKey: 'mama' };

const syllables: Syllable[] = [
  { symbol: 'JA', audioKey: 'ja', sourceWords: [jahoda] },
  { symbol: 'HO', audioKey: 'ho', sourceWords: [jahoda] },
  { symbol: 'DA', audioKey: 'da', sourceWords: [jahoda] },
  { symbol: 'KU', audioKey: 'ku', sourceWords: [kura] },
  { symbol: 'RA', audioKey: 'ra', sourceWords: [kura] },
  { symbol: 'MA', audioKey: 'ma', sourceWords: [spaced] },
  { symbol: 'TO', audioKey: 'to', sourceWords: [] },
];

assert(parseWordSyllables('ja-ho-da').join('|') === 'ja|ho|da', 'hyphen-separated syllables are parsed');
assert(parseWordSyllables(' ma - ma ').join('|') === 'ma|ma', 'syllable parser trims whitespace');
assert(parseWordSyllables('a--b').join('|') === 'a|b', 'empty split parts are removed');

assert(chooseMissingIndex(3, () => 0) === 0, 'random 0 picks first index');
assert(chooseMissingIndex(3, () => 0.5) === 1, 'random 0.5 picks middle index');
assert(chooseMissingIndex(3, () => 0.99) === 2, 'random 0.99 picks last index');

const round = createCompleteSyllableRound(jahoda, 1);
assert(round.word.word === 'Jahoda', 'round keeps target word');
assert(round.correctSyllable === 'HO', 'round stores uppercase correct syllable');
assert(round.syllables.join('-') === 'JA-HO-DA', 'round stores uppercase syllables');

const hiddenSlots = buildPromptSlots(round, false);
assert(hiddenSlots.length === 3, 'prompt has one slot per syllable');
assert(hiddenSlots.filter((slot) => slot.isMissing).length === 1, 'prompt has exactly one missing slot');
assert(hiddenSlots.map((slot) => slot.text).join('-') === 'JA-__-DA', 'hidden prompt renders one blank');

const revealedSlots = buildPromptSlots(round, true);
assert(revealedSlots.map((slot) => slot.text).join('-') === 'JA-HO-DA', 'revealed prompt fills the missing syllable');

const choices = buildSyllableChoices(round, syllables, 4);
const choiceSymbols = choices.map((choice) => choice.symbol);
assert(choices.length === 4, 'choice generation returns four syllables');
assert(choiceSymbols.includes('HO'), 'choices include the correct syllable');
assert(new Set(choiceSymbols).size === choiceSymbols.length, 'choices are unique');

const eligible = buildEligibleCompleteSyllableWords([jahoda, kura, badShort, badLong, spaced], syllables, 4);
assert(eligible.some((word) => word.word === 'Jahoda'), 'three-syllable word is eligible');
assert(eligible.some((word) => word.word === 'Kura'), 'two-syllable word is eligible');
assert(eligible.some((word) => word.word === 'Medzera'), 'trimmed repeated-syllable word is eligible');
assert(!eligible.some((word) => word.word === 'Pes'), 'one-syllable word is excluded');
assert(!eligible.some((word) => word.word === 'Nepouzite'), 'five-syllable word is excluded');

const tinyPool = syllables.filter((syllable) => ['JA', 'HO', 'DA'].includes(syllable.symbol));
const tinyEligible = buildEligibleCompleteSyllableWords([jahoda], tinyPool, 4);
assert(tinyEligible.length === 0, 'word is excluded when four unique answer choices cannot be built');

console.log('completeSyllableLogic checks passed');
