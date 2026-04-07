/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Syllable } from '../../shared/types';
import { SYLLABLE_ITEMS } from '../../shared/contentRegistry';

export const syllablesDescriptor: GameDescriptor<Syllable> = {
  gridSize: 6,
  gridColsClass: 'grid-cols-2 sm:grid-cols-3',
  getItems: () => SYLLABLE_ITEMS,
  getItemId: (s) => s.symbol,
  renderCard: (s) => (
    <span className="text-4xl sm:text-7xl font-bold font-spline">{s.symbol}</span>
  ),
  renderPrompt: () => null,
  getPromptAudio: (s) => ({
    sequence: ['phrases/slabika', `syllables/${s.audioKey}`],
    fallbackText: `Slabika ${s.symbol}`,
  }),
  getWrongAudio: (t, _s) => ({
    sequence: ['phrases/slabika', `syllables/${t.audioKey}`, 'phrases/skus-to-znova'],
    fallbackText: `Slabika ${t.symbol}. Skús to znova.`,
  }),
  getSuccessSpec: (s) => {
    const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
    return { echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}` };
  },
};
