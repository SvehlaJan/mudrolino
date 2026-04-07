/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, SlovakNumber } from '../../shared/types';
import { NUMBER_ITEMS } from '../../shared/contentRegistry';

export function createNumbersDescriptor(
  range: { start: number; end: number }
): GameDescriptor<SlovakNumber> {
  return {
    gridSize: 4,
    gridColsClass: 'grid-cols-2',
    getItems: () => NUMBER_ITEMS.filter(n => n.value >= range.start && n.value <= range.end),
    getItemId: (n) => String(n.value),
    renderCard: (n) => (
      <span className="text-6xl sm:text-[100px] font-bold font-spline">{n.value}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (n) => ({
      sequence: ['phrases/cislo', `numbers/${n.audioKey}`],
      fallbackText: `Číslo ${n.value}`,
    }),
    getWrongAudio: () => ({
      sequence: ['phrases/skus-to-znova'],
      fallbackText: 'Skús to znova.',
    }),
    getSuccessSpec: (n) => ({ echoLine: `Číslo ${n.value} 🎉` }),
  };
}
