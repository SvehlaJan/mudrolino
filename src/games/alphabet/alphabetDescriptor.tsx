/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { getAlphabetItems, getPhraseClip } from '../../shared/contentRegistry';

export function createAlphabetDescriptor(
  gridSize: 4 | 6 | 8,
  includeAccentedLetters: boolean,
): GameDescriptor<Letter> {
  return {
    gridSize,
    gridCols: {
      base: 2,
      sm: gridSize === 8 ? 4 : gridSize === 6 ? 3 : 2,
    },
    getItems: () => getAlphabetItems(includeAccentedLetters),
    getItemId: (l) => l.symbol,
    renderCard: (l) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{l.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (l) => ({
      clips: [
        getPhraseClip('find'),
        { path: `letters/${l.audioKey}`, fallbackText: l.symbol },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip('thisIs'),
        { path: `letters/${s.audioKey}`, fallbackText: s.symbol },
        getPhraseClip('retry'),
      ],
    }),
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          { path: `letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
    getFailureSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          getPhraseClip('neverMind'),
          getPhraseClip('itIs'),
          { path: `letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
  };
}
