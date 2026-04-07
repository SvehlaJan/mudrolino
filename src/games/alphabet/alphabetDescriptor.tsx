/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { LETTER_ITEMS } from '../../shared/contentRegistry';

export const alphabetDescriptor: GameDescriptor<Letter> = {
  gridSize: 8,
  gridColsClass: 'grid-cols-2 sm:grid-cols-4',
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
};
