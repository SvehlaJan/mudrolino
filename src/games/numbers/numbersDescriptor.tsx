/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, SlovakNumber } from '../../shared/types';
import { getNumberItemsInRange } from '../../shared/contentRegistry';

export function createNumbersDescriptor(
  range: { start: number; end: number }
): GameDescriptor<SlovakNumber> {
  return {
    gridSize: 4,
    gridColsClass: 'grid-cols-2 sm:grid-cols-4',
    getItems: () => getNumberItemsInRange(range),
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
