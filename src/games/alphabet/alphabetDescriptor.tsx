/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { translate } from '../../shared/i18n';

export function createAlphabetDescriptor(
  gridSize: 4 | 6 | 8,
  letterItems: Letter[],
  locale: string,
): GameDescriptor<Letter> {
  return {
    gridSize,
    instruction: translate(locale, 'Nájdi písmeno, ktoré počuješ.'),
    material: 'wood',
    getItems: () => letterItems,
    getItemId: (l) => l.symbol,
    getAccessibleLabel: (l) => translate(locale, 'Písmeno {letter}', { letter: l.symbol }),
    renderCard: (l) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{l.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (l) => ({
      clips: [
        getPhraseClip(locale, 'find'),
        { path: `${locale}/letters/${l.audioKey}`, fallbackText: l.symbol },
      ],
    }),
    getCorrectAudio: (l) => getItemAnnouncementAudio(locale, 'letters', l.audioKey, l.symbol),
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'letters', s.audioKey, s.symbol),
    getSuccessSpec: (l) => ({
      echoLine: translate(locale, '{letter} ako {word} {emoji}', { letter: l.symbol, word: l.label, emoji: l.emoji }),
    }),
    getFailureSpec: (l) => ({
      echoLine: translate(locale, '{letter} ako {word} {emoji}', { letter: l.symbol, word: l.label, emoji: l.emoji }),
      audioSpec: {
        clips: [
          getPhraseClip(locale, 'neverMind'),
          getPhraseClip(locale, 'itIs'),
          { path: `${locale}/letters/${l.audioKey}`, fallbackText: translate(locale, '{letter} ako {word}', { letter: l.symbol, word: l.label }) },
        ],
      },
    }),
  };
}
