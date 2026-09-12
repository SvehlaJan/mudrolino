/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SettingsTarget } from '../types';

export const SETTINGS_SUBTITLES: Record<SettingsTarget, string> = {
  home: 'Nastavenia',
  ALPHABET: 'Hra s písmenami',
  SYLLABLES: 'Hra so slabikami',
  NUMBERS: 'Hra s číslami',
  COUNTING_ITEMS: 'Hra s počítaním',
  WORDS: 'Hra so slovami',
  FIRST_LETTER: 'Hra s prvým písmenkom',
  ASSEMBLY: 'Hra so skladaním',
  COMPLETE_SYLLABLE: 'Hra s dopĺňaním slabík',
  COMPLETE_LETTER: 'Hra s dopĺňaním písmen',
  COMPARE_QUANTITIES: 'Hra s porovnávaním',
  ADDITION: 'Hra so sčítaním',
};

export const SETTINGS_VISIBILITY: Record<SettingsTarget, {
  recordings: boolean;
  alphabetAccents: boolean;
  alphabetGridSize: boolean;
  syllablesGridSize: boolean;
  numbersRange: boolean;
  countingRange: boolean;
  completeLetterMissingCount: boolean;
  compareRange: boolean;
  compareMode: boolean;
  additionSumRange: boolean;
  additionRepresentation: boolean;
}> = {
  home: {
    recordings: true,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  ALPHABET: {
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  SYLLABLES: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: true,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  NUMBERS: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: true,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  COUNTING_ITEMS: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: true,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  WORDS: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  FIRST_LETTER: {
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  ASSEMBLY: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  COMPLETE_SYLLABLE: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  COMPLETE_LETTER: {
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: true,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
  COMPARE_QUANTITIES: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: true,
    compareMode: true,
    additionSumRange: false,
    additionRepresentation: false,
  },
  ADDITION: {
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: true,
    additionRepresentation: true,
  },
};

export function getSettingsSubtitle(target: SettingsTarget) {
  return SETTINGS_SUBTITLES[target];
}
