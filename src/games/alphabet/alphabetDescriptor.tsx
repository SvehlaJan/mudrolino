/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { LETTER_ITEMS } from '../../shared/contentRegistry';

const GRID_COLS: Record<number, string> = {
  4: 'grid-cols-2',
  6: 'grid-cols-2 sm:grid-cols-3',
  8: 'grid-cols-2 sm:grid-cols-4',
};

export function createAlphabetDescriptor(gridSize: 4 | 6 | 8): GameDescriptor<Letter> {
  return {
    gridSize,
    gridColsClass: GRID_COLS[gridSize],
    getItems: () => LETTER_ITEMS,
    getItemId: (l) => l.symbol,
    renderCard: (l) => (
      <span className="text-6xl sm:text-[100px] font-bold font-spline">{l.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (l) => ({
      sequence: ['phrases/najdi-pismeno', `letters/${l.audioKey}`],
      fallbackText: `Nájdi písmenko ${l.symbol}`,
    }),
    getWrongAudio: (_t, s) => ({
      sequence: ['phrases/toto-je-pismeno', `letters/${s.audioKey}`, 'phrases/skus-to-znova'],
      fallbackText: `Toto je písmenko ${s.symbol}. Skús to znova.`,
    }),
    getSuccessSpec: (l) => ({ echoLine: `${l.symbol} ako ${l.label} ${l.emoji}` }),
    getFailureSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        sequence: ['phrases/nevadi', 'phrases/spravna-odpoved', `letters/${l.audioKey}`],
        fallbackText: `Nevadí! Správna odpoveď je ${l.symbol} ako ${l.label}.`,
      },
    }),
  };
}
