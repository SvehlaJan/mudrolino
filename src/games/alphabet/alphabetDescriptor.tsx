/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';

export function createAlphabetDescriptor(
  gridSize: 4 | 6 | 8,
  letterItems: Letter[],
  locale: string,
): GameDescriptor<Letter> {
  return {
    gridSize,
    gridCols: {
      base: 2,
      sm: gridSize === 8 ? 4 : gridSize === 6 ? 3 : 2,
    },
    getItems: () => letterItems,
    getItemId: (l) => l.symbol,
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
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'letters', s.audioKey, s.symbol),
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [getItemAudioClip(locale, 'letters', l.audioKey, `${l.symbol} ako ${l.label}`)],
      },
    }),
    getFailureSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          getPhraseClip(locale, 'neverMind'),
          getPhraseClip(locale, 'itIs'),
          { path: `${locale}/letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
  };
}
