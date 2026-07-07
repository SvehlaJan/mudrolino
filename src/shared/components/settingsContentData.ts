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
};

export const SETTINGS_VISIBILITY: Record<SettingsTarget, {
  music: boolean;
  avatar: boolean;
  recordings: boolean;
  alphabetAccents: boolean;
  alphabetGridSize: boolean;
  syllablesGridSize: boolean;
  numbersRange: boolean;
  countingRange: boolean;
  completeLetterMissingCount: boolean;
}> = {
  home: {
    music: true,
    avatar: true,
    recordings: true,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: true,
    numbersRange: true,
    countingRange: true,
    completeLetterMissingCount: true,
  },
  ALPHABET: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  SYLLABLES: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: true,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  NUMBERS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: true,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  COUNTING_ITEMS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: true,
    completeLetterMissingCount: false,
  },
  WORDS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  FIRST_LETTER: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  ASSEMBLY: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  COMPLETE_SYLLABLE: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
  },
  COMPLETE_LETTER: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: true,
  },
};

export function getSettingsSubtitle(target: SettingsTarget) {
  return SETTINGS_SUBTITLES[target];
}
