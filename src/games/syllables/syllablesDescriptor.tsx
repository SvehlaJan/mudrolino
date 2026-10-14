/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Syllable } from '../../shared/types';
import { getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { translate } from '../../shared/i18n';

export function createSyllablesDescriptor(
  gridSize: 4 | 6,
  syllableItems: Syllable[],
  locale: string,
): GameDescriptor<Syllable> {
  return {
    gridSize,
    instruction: translate(locale, 'Nájdi slabiku, ktorú počuješ.'),
    material: 'magnet',
    getItems: () => syllableItems,
    getItemId: (s) => s.symbol,
    getAccessibleLabel: (s) => translate(locale, 'Slabika {syllable}', { syllable: s.symbol }),
    renderCard: (s) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{s.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (s) => ({
      clips: [
        getPhraseClip(locale, 'find'),
        { path: `${locale}/syllables/${s.audioKey}`, fallbackText: s.symbol },
      ],
    }),
    getCorrectAudio: (s) => getItemAnnouncementAudio(locale, 'syllables', s.audioKey, s.symbol),
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'syllables', s.audioKey, s.symbol),
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: translate(locale, '{letter} ako {word} {emoji}', { letter: s.symbol, word: w.syllables, emoji: w.emoji }),
        audioSpec: { clips: [getItemAudioClip(locale, 'words', w.audioKey, w.word)] },
      };
    },
    getFailureSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: translate(locale, '{letter} ako {word} {emoji}', { letter: s.symbol, word: w.syllables, emoji: w.emoji }),
        audioSpec: {
          clips: [
            getPhraseClip(locale, 'neverMind'),
            getPhraseClip(locale, 'itIs'),
            { path: `${locale}/syllables/${s.audioKey}`, fallbackText: translate(locale, 'slabika {syllable}', { syllable: s.symbol }) },
          ],
        },
      };
    },
  };
}
