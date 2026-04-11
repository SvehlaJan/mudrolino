/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { getAlphabetItems, getPhraseClip } from '../../shared/contentRegistry';

const GRID_COLS: Record<number, string> = {
  4: 'grid-cols-2',
  6: 'grid-cols-2 sm:grid-cols-3',
  8: 'grid-cols-2 sm:grid-cols-4',
};

export function createAlphabetDescriptor(
  gridSize: 4 | 6 | 8,
  includeAccentedLetters: boolean,
): GameDescriptor<Letter> {
  return {
    gridSize,
    gridColsClass: GRID_COLS[gridSize],
    getItems: () => getAlphabetItems(includeAccentedLetters),
    getItemId: (l) => l.symbol,
    renderCard: (l) => (
      <span className="text-6xl sm:text-[100px] font-bold font-spline">{l.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (l) => ({
      clips: [
        getPhraseClip('findLetter'),
        { path: `letters/${l.audioKey}`, fallbackText: l.symbol },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip('thisIsLetter'),
        { path: `letters/${s.audioKey}`, fallbackText: s.symbol },
      ],
    }),
    getSuccessSpec: (l) => ({ echoLine: `${l.symbol} ako ${l.label} ${l.emoji}` }),
    getFailureSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          getPhraseClip('neverMind'),
          getPhraseClip('correctAnswerIs'),
          { path: `letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
  };
}
