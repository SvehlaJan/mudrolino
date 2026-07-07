import { Letter, Word } from '../../shared/types';
import {
  buildEligibleCompleteLetterWords,
  buildLetterChoices,
  buildPromptSlots,
  chooseMissingIndexes,
  createCompleteLetterRound,
  getActiveCompleteLetterLetters,
  getActiveMissingIndex,
  parseWordLetterUnits,
  resolveMissingCount,
} from './completeLetterLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const letters: Letter[] = [
  { symbol: 'A', label: 'Auto', emoji: '🚗', audioKey: 'a' },
  { symbol: 'B', label: 'Bubon', emoji: '🥁', audioKey: 'b' },
  { symbol: 'C', label: 'Citrón', emoji: '🍋', audioKey: 'c' },
  { symbol: 'D', label: 'Dom', emoji: '🏠', audioKey: 'd' },
  { symbol: 'E', label: 'Električka', emoji: '🚋', audioKey: 'e' },
  { symbol: 'H', label: 'Hruška', emoji: '🍐', audioKey: 'h' },
  { symbol: 'J', label: 'Jablko', emoji: '🍎', audioKey: 'j' },
  { symbol: 'M', label: 'Mama', emoji: '👩', audioKey: 'm' },
  { symbol: 'T', label: 'Topánka', emoji: '👟', audioKey: 't' },
  { symbol: 'CH', label: 'Chlieb', emoji: '🍞', audioKey: 'ch' },
  { symbol: 'DZ', label: 'Dzedzina', emoji: '🏘️', audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džem', emoji: '🍯', audioKey: 'dz-caron' },
  { symbol: 'Á', label: 'Áno', emoji: '✅', audioKey: 'a-long' },
  { symbol: 'Č', label: 'Čaj', emoji: '🫖', audioKey: 'c-caron' },
  { symbol: 'Ž', label: 'Žaba', emoji: '🐸', audioKey: 'z-caron' },
];

const mama: Word = { word: 'Mama', syllables: 'ma-ma', emoji: '👩', audioKey: 'mama' };
const chata: Word = { word: 'Chata', syllables: 'cha-ta', emoji: '🏡', audioKey: 'chata' };
const dzem: Word = { word: 'Džem', syllables: 'džem', emoji: '🍯', audioKey: 'dzem' };
const caj: Word = { word: 'Čaj', syllables: 'čaj', emoji: '🫖', audioKey: 'caj' };
const badHyphen: Word = { word: 'A-ha', syllables: 'a-ha', emoji: '😮', audioKey: 'a-ha' };
const badUnknown: Word = { word: 'Figa', syllables: 'fi-ga', emoji: '🧺', audioKey: 'figa' };

assert(parseWordLetterUnits('Mama', letters)?.join('|') === 'M|A|M|A', 'normal letters are parsed as units');
assert(parseWordLetterUnits('Chata', letters)?.join('|') === 'CH|A|T|A', 'CH is parsed as one Slovak letter unit');
assert(parseWordLetterUnits('Dzem', letters)?.join('|') === 'DZ|E|M', 'DZ is parsed as one Slovak letter unit');
assert(parseWordLetterUnits('Džem', letters)?.join('|') === 'DŽ|E|M', 'DŽ is parsed as one Slovak letter unit');
assert(parseWordLetterUnits('A-ha', letters) === null, 'hyphenated words are excluded');
assert(parseWordLetterUnits('Figa', letters) === null, 'words with unavailable letters are excluded');

const activeWithoutAccents = getActiveCompleteLetterLetters(letters, false);
assert(activeWithoutAccents.some((letter) => letter.symbol === 'CH'), 'CH remains active when accents are disabled');
assert(activeWithoutAccents.some((letter) => letter.symbol === 'DZ'), 'DZ remains active when accents are disabled');
assert(!activeWithoutAccents.some((letter) => letter.symbol === 'DŽ'), 'DŽ is disabled with accented letters');
assert(!activeWithoutAccents.some((letter) => letter.symbol === 'Č'), 'Č is disabled with accented letters');

assert(resolveMissingCount(1, 6) === 1, 'fixed one mode resolves to one');
assert(resolveMissingCount(2, 6) === 2, 'fixed two mode resolves to two');
assert(resolveMissingCount('adaptive', 4) === 1, 'adaptive mode uses one blank for four units');
assert(resolveMissingCount('adaptive', 5) === 2, 'adaptive mode uses two blanks for five units');

assert(chooseMissingIndexes(5, 1, () => 0).join('|') === '0', 'one missing index can choose first position');
assert(chooseMissingIndexes(5, 2, () => 0.99).join('|') === '3|4', 'two missing indexes are distinct and sorted');
assert(chooseMissingIndexes(2, 2, () => 0.2).length === 2, 'two-unit words can hide two positions');

const round = createCompleteLetterRound(mama, letters, 2, () => 0);
assert(round.word.word === 'Mama', 'round keeps target word');
assert(round.units.join('|') === 'M|A|M|A', 'round stores normalized units');
assert(round.missingIndexes.join('|') === '0|1', 'round stores guided missing positions');

const firstSlots = buildPromptSlots(round, 0);
assert(firstSlots.map((slot) => `${slot.text}:${slot.state}`).join('|') === '__:active|__:pending|M:visible|A:visible', 'initial slots show active and pending blanks');
assert(getActiveMissingIndex(round, 0) === 0, 'first blank is active before fills');

const secondSlots = buildPromptSlots(round, 1);
assert(secondSlots.map((slot) => `${slot.text}:${slot.state}`).join('|') === 'M:filled|__:active|M:visible|A:visible', 'after one fill, next blank becomes active');
assert(getActiveMissingIndex(round, 1) === 1, 'second blank is active after one fill');

const finalSlots = buildPromptSlots(round, 2);
assert(finalSlots.map((slot) => `${slot.text}:${slot.state}`).join('|') === 'M:filled|A:filled|M:visible|A:visible', 'all blanks are filled after two correct taps');
assert(getActiveMissingIndex(round, 2) === null, 'no active blank remains after all fills');

const firstChoices = buildLetterChoices(round, letters, 0, 4);
assert(firstChoices.length === 4, 'choice generation returns four letters');
assert(firstChoices.some((letter) => letter.symbol === 'M'), 'choices include first active correct letter');
assert(new Set(firstChoices.map((letter) => letter.symbol)).size === 4, 'choices are unique');

const secondChoices = buildLetterChoices(round, letters, 1, 4);
assert(secondChoices.some((letter) => letter.symbol === 'A'), 'choices update for next active blank');

const eligible = buildEligibleCompleteLetterWords([mama, chata, dzem, caj, badHyphen, badUnknown], letters, true, 1, 4);
assert(eligible.some((word) => word.word === 'Mama'), 'plain word is eligible');
assert(eligible.some((word) => word.word === 'Chata'), 'CH word is eligible');
assert(eligible.some((word) => word.word === 'Džem'), 'DŽ word is eligible when accents are enabled');
assert(eligible.some((word) => word.word === 'Čaj'), 'accented word is eligible when accents are enabled');
assert(!eligible.some((word) => word.word === 'A-ha'), 'punctuated word is ineligible');
assert(!eligible.some((word) => word.word === 'Figa'), 'word with unavailable unit is ineligible');

const eligibleWithoutAccents = buildEligibleCompleteLetterWords([mama, chata, dzem, caj], letters, false, 1, 4);
assert(eligibleWithoutAccents.some((word) => word.word === 'Mama'), 'plain word remains eligible without accents');
assert(eligibleWithoutAccents.some((word) => word.word === 'Chata'), 'CH word remains eligible without accents');
assert(!eligibleWithoutAccents.some((word) => word.word === 'Džem'), 'DŽ word is ineligible without accents');
assert(!eligibleWithoutAccents.some((word) => word.word === 'Čaj'), 'Č word is ineligible without accents');

const tinyLetters = letters.filter((letter) => ['A', 'M', 'CH'].includes(letter.symbol));
const tinyEligible = buildEligibleCompleteLetterWords([mama], tinyLetters, true, 1, 4);
assert(tinyEligible.length === 0, 'word is excluded when four unique choices cannot be built');

console.log('completeLetterLogic checks passed');
