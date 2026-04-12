/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, SlovakNumber } from '../../shared/types';
import { getNumberItemsInRange, getPhraseClip } from '../../shared/contentRegistry';

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
      clips: [
        getPhraseClip('find'),
        { path: `numbers/${n.audioKey}`, fallbackText: String(n.value) },
      ],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip('thisIs'),
        { path: `numbers/${s.audioKey}`, fallbackText: String(s.value) },
        getPhraseClip('retry'),
      ],
    }),
    getSuccessSpec: (n) => ({ echoLine: `Číslo ${n.value} 🎉` }),
    getFailureSpec: (n) => ({
      echoLine: `Číslo ${n.value} 🎉`,
      audioSpec: {
        clips: [
          getPhraseClip('neverMind'),
          getPhraseClip('itIs'),
          { path: `numbers/${n.audioKey}`, fallbackText: `číslo ${n.value}` },
        ],
      },
    }),
  };
}
