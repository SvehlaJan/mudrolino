/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Syllable } from '../../shared/types';
import { getPhraseClip, SYLLABLE_ITEMS } from '../../shared/contentRegistry';

const GRID_COLS: Record<number, string> = {
  4: 'grid-cols-2',
  6: 'grid-cols-2 sm:grid-cols-3',
};

export function createSyllablesDescriptor(gridSize: 4 | 6): GameDescriptor<Syllable> {
  return {
    gridSize,
    gridColsClass: GRID_COLS[gridSize],
    getItems: () => SYLLABLE_ITEMS,
    getItemId: (s) => s.symbol,
    renderCard: (s) => (
      <span className="text-4xl sm:text-7xl font-bold font-spline">{s.symbol}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (s) => ({
      clips: [
        getPhraseClip('syllable'),
        { path: `syllables/${s.audioKey}`, fallbackText: s.symbol },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip('thisIsSyllable'),
        { path: `syllables/${s.audioKey}`, fallbackText: s.symbol },
      ],
    }),
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return { echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}` };
    },
    getFailureSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}`,
        audioSpec: {
          clips: [
            getPhraseClip('neverMind'),
            getPhraseClip('correctAnswerIs'),
            { path: `syllables/${s.audioKey}`, fallbackText: `slabika ${s.symbol}` },
          ],
        },
      };
    },
  };
}
