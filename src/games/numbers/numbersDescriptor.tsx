/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, NumberItem } from '../../shared/types';
import { getNumberItemsInRange, getPhraseClip } from '../../shared/contentRegistry';

export function createNumbersDescriptor(
  range: { start: number; end: number }
): GameDescriptor<NumberItem> {
  return {
    gridSize: 4,
    gridCols: {
      base: 2,
      sm: 4,
    },
    getItems: () => getNumberItemsInRange(range),
    getItemId: (n) => String(n.value),
    renderCard: (n) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] font-bold font-spline leading-none">{n.value}</span>
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
