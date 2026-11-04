/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildEligibleCompleteLetterWords, getActiveCompleteLetterLetters } from '../games/complete-letter/completeLetterLogic';
import { buildEligibleCompleteSyllableWords } from '../games/complete-syllable/completeSyllableLogic';
import {
  buildFirstLetterItems,
  getActiveFirstLetterLetters,
  multiCharacterLetters,
} from '../games/first-letter/firstLetterLogic';
import { msg } from './i18n';
import type { GameId, GameSettings, Letter, Syllable, Word } from './types';

/** Answer choices the letter and syllable games show per Round. */
const CHOICE_COUNT = 4;

export interface PlayabilityInput {
  wordItems: Word[];
  letterItems: Letter[];
  syllableItems: Syllable[];
  settings: GameSettings;
}

/** Words an Assembly Round can use: two or three syllables. */
export function getAssemblyEligibleWords(words: Word[]): Word[] {
  return words.filter(({ syllables }) => {
    const syllableCount = syllables.split('-').length;
    return syllableCount >= 2 && syllableCount <= 3;
  });
}

/** Slovak msg()-marked reason, or null when the game has something to ask. Callers translate it. */
export function getUnplayableReason(gameId: GameId, input: PlayabilityInput): string | null {
  const { wordItems, letterItems, syllableItems, settings } = input;

  switch (gameId) {
    case 'WORDS':
      return wordItems.length > 0 ? null : msg('Pridajte slová v sekcii Vlastný obsah.');

    case 'FIRST_LETTER': {
      const activeLetters = getActiveFirstLetterLetters(letterItems, settings.alphabetAccents);
      const eligibleItems = buildFirstLetterItems(wordItems, activeLetters, multiCharacterLetters(letterItems));
      return eligibleItems.length > 0 && activeLetters.length >= CHOICE_COUNT
        ? null
        : msg('Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.');
    }

    case 'ASSEMBLY':
      return getAssemblyEligibleWords(wordItems).length > 0
        ? null
        : msg('Pridajte slová so slabikami v sekcii Vlastný obsah.');

    case 'COMPLETE_SYLLABLE':
      return buildEligibleCompleteSyllableWords(wordItems, syllableItems, CHOICE_COUNT).length > 0
        ? null
        : msg('Pridajte slová s dvomi až štyrmi slabikami.');

    case 'COMPLETE_LETTER': {
      const activeLetters = getActiveCompleteLetterLetters(letterItems, settings.alphabetAccents);
      const eligibleWords = buildEligibleCompleteLetterWords(
        wordItems,
        letterItems,
        settings.alphabetAccents,
        settings.completeLetterMissingCount,
        CHOICE_COUNT,
      );
      return eligibleWords.length > 0 && activeLetters.length >= CHOICE_COUNT
        ? null
        : msg('Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.');
    }

    default:
      return null;
  }
}
