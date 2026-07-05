import {
  normalizeComparableText,
  normalizeSyllables,
  validatePraiseForm,
  validateWordForm,
} from './customContentValidation';
import type { UserPraise, UserWord } from '../shared/types';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const existingWords: UserWord[] = [
  {
    id: 'default-mama',
    word: 'Mama',
    syllables: 'ma-ma',
    emoji: '👩',
    audioKey: 'mama',
    status: 'ready',
    isDefault: true,
    locale: 'sk',
    order: 0,
  },
  {
    id: 'custom-auto',
    word: 'Auto malé',
    syllables: 'au-to',
    emoji: '🚗',
    audioKey: 'custom-auto',
    status: 'draft',
    isDefault: false,
    locale: 'sk',
    order: 1,
  },
];

const existingPraises: UserPraise[] = [
  {
    id: 'default-vyborne',
    text: 'Výborne!',
    emoji: '🌟',
    audioKey: 'vyborne',
    status: 'ready',
    isDefault: true,
    locale: 'sk',
    order: 0,
  },
];

assert(normalizeComparableText('  MaMa   veľká  ') === 'mama veľká', 'normalizes comparable text');
assert(normalizeSyllables(' MA -  ma ') === 'ma-ma', 'normalizes syllables');

const validWord = validateWordForm(
  { word: 'Jahoda', syllables: ' ja - ho - da ', emoji: '🍓' },
  existingWords,
);
assert(validWord.valid, 'valid word passes');
assert(validWord.values?.syllables === 'ja-ho-da', 'valid word returns normalized syllables');

const noHyphen = validateWordForm(
  { word: 'Auto', syllables: 'auto', emoji: '🚗' },
  existingWords,
);
assert(!noHyphen.valid && Boolean(noHyphen.errors.syllables), 'one-part syllables fail');

const fiveParts = validateWordForm(
  { word: 'Lokomotiva', syllables: 'lo-ko-mo-ti-va', emoji: '🚂' },
  existingWords,
);
assert(!fiveParts.valid && Boolean(fiveParts.errors.syllables), 'five-part syllables fail');

const duplicateWord = validateWordForm(
  { word: ' mama ', syllables: 'ma-ma', emoji: '👩' },
  existingWords,
);
assert(!duplicateWord.valid && Boolean(duplicateWord.errors.word), 'duplicate word fails');

const editedSameWord = validateWordForm(
  { word: 'Auto malé', syllables: 'au-to', emoji: '🚗' },
  existingWords,
  'custom-auto',
);
assert(editedSameWord.valid, 'editing same word excludes self from duplicate check');

const validPraise = validatePraiseForm(
  { text: 'Paráda!', emoji: '🎊' },
  existingPraises,
);
assert(validPraise.valid, 'valid praise passes');

const duplicatePraise = validatePraiseForm(
  { text: ' výborne! ', emoji: '🌟' },
  existingPraises,
);
assert(!duplicatePraise.valid && Boolean(duplicatePraise.errors.text), 'duplicate praise fails');

console.log('customContentValidation checks passed');
