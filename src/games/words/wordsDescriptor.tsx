/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Word } from '../../shared/types';
import { WORD_ITEMS } from '../../shared/contentRegistry';

export const wordsDescriptor: GameDescriptor<Word> = {
  gridSize: 6,
  gridColsClass: 'grid-cols-2 sm:grid-cols-3',
  getItems: () => WORD_ITEMS,
  getItemId: (w) => w.word,
  renderCard: (w) => (
    <span className="text-5xl sm:text-7xl">{w.emoji}</span>
  ),
  renderPrompt: (w) => (
    <h2 className="text-5xl sm:text-7xl font-black tracking-widest text-text-main">
      {w.syllables.toUpperCase()}
    </h2>
  ),
  getPromptAudio: (w) => ({
    sequence: ['phrases/co-tu-je-napisane', `words/${w.audioKey}`],
    fallbackText: `Čo tu je napísané? ${w.word}`,
  }),
  getWrongAudio: () => ({
    sequence: ['phrases/skus-to-znova'],
    fallbackText: 'Skús to znova.',
  }),
  getSuccessSpec: (w) => ({ echoLine: `${w.syllables} ${w.emoji}` }),
};
