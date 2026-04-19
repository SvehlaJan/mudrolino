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
  ASSEMBLY: 'Hra so skladaním',
};

export const SETTINGS_VISIBILITY: Record<SettingsTarget, {
  music: boolean;
  recordings: boolean;
  alphabetAccents: boolean;
  alphabetGridSize: boolean;
  syllablesGridSize: boolean;
  numbersRange: boolean;
  countingRange: boolean;
}> = {
  home: {
    music: true,
    recordings: true,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: true,
    numbersRange: true,
    countingRange: true,
  },
  ALPHABET: {
    music: true,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
  },
  SYLLABLES: {
    music: true,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: true,
    numbersRange: false,
    countingRange: false,
  },
  NUMBERS: {
    music: true,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: true,
    countingRange: false,
  },
  COUNTING_ITEMS: {
    music: true,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: true,
  },
  WORDS: {
    music: true,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
  },
  ASSEMBLY: {
    music: true,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
  },
};

export function getSettingsSubtitle(target: SettingsTarget) {
  return SETTINGS_SUBTITLES[target];
}
