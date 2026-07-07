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
const badMissing: Word = { word: 'Chyba', syllables: 'ja-xx-da', emoji: '🧩', audioKey: 'chyba' };
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

const firstRepeatedSlotRound = createCompleteSyllableRound(spaced, 0);
const firstRepeatedSlotHidden = buildPromptSlots(firstRepeatedSlotRound, false);
assert(firstRepeatedSlotHidden.map((slot) => slot.text).join('-') === '__-MA', 'first repeated syllable slot can be hidden');

const secondRepeatedSlotRound = createCompleteSyllableRound(spaced, 1);
const secondRepeatedSlotHidden = buildPromptSlots(secondRepeatedSlotRound, false);
assert(secondRepeatedSlotHidden.map((slot) => slot.text).join('-') === 'MA-__', 'second repeated syllable slot can be hidden');

const choices = buildSyllableChoices(round, syllables, 4);
const choiceSymbols = choices.map((choice) => choice.symbol);
assert(choices.length === 4, 'choice generation returns four syllables');
assert(choiceSymbols.includes('HO'), 'choices include the correct syllable');
assert(new Set(choiceSymbols).size === choiceSymbols.length, 'choices are unique');

const mixedCasePool: Syllable[] = [
  { symbol: 'ja', audioKey: 'ja', sourceWords: [jahoda] },
  { symbol: ' ho ', audioKey: 'ho', sourceWords: [jahoda] },
  { symbol: 'HO', audioKey: 'ho-duplicate', sourceWords: [jahoda] },
  { symbol: ' da ', audioKey: 'da', sourceWords: [jahoda] },
  { symbol: 'ku', audioKey: 'ku', sourceWords: [kura] },
  { symbol: ' ra ', audioKey: 'ra', sourceWords: [kura] },
  { symbol: 'to', audioKey: 'to', sourceWords: [] },
];
const mixedCaseChoices = buildSyllableChoices(round, mixedCasePool, 4);
const mixedCaseChoiceSymbols = mixedCaseChoices.map((choice) => choice.symbol);
assert(mixedCaseChoices.length === 4, 'mixed-case choice generation returns four syllables');
assert(mixedCaseChoiceSymbols.includes('HO'), 'mixed-case choices normalize and include the correct syllable');
assert(
  mixedCaseChoiceSymbols.every((symbol) => symbol === symbol.trim().toLocaleUpperCase('sk-SK')),
  'mixed-case choices return normalized symbols',
);
assert(
  new Set(mixedCaseChoiceSymbols).size === mixedCaseChoiceSymbols.length,
  'mixed-case choices are unique by normalized symbol',
);

const eligible = buildEligibleCompleteSyllableWords([jahoda, kura, badShort, badLong, spaced], syllables, 4);
assert(eligible.some((word) => word.word === 'Jahoda'), 'three-syllable word is eligible');
assert(eligible.some((word) => word.word === 'Kura'), 'two-syllable word is eligible');
assert(eligible.some((word) => word.word === 'Medzera'), 'trimmed repeated-syllable word is eligible');
assert(!eligible.some((word) => word.word === 'Pes'), 'one-syllable word is excluded');
assert(!eligible.some((word) => word.word === 'Nepouzite'), 'five-syllable word is excluded');

const missingSyllableEligible = buildEligibleCompleteSyllableWords([badMissing], syllables, 4);
assert(missingSyllableEligible.length === 0, 'word is excluded when one word syllable is missing from the pool');

const mixedCaseEligible = buildEligibleCompleteSyllableWords([jahoda], mixedCasePool, 4);
assert(mixedCaseEligible.some((word) => word.word === 'Jahoda'), 'mixed-case pool makes Jahoda eligible');

const tinyPool = syllables.filter((syllable) => ['JA', 'HO', 'DA'].includes(syllable.symbol));
const tinyEligible = buildEligibleCompleteSyllableWords([jahoda], tinyPool, 4);
assert(tinyEligible.length === 0, 'word is excluded when four unique answer choices cannot be built');

console.log('completeSyllableLogic checks passed');
