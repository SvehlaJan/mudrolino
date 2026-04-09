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
  getPromptAudio: (_w) => ({
    clips: [
      { path: 'phrases/co-tu-je-napisane', fallbackText: 'Čo tu je napísané?' },
    ],
  }),
  getReplayAudio: (w) => ({
    clips: [
      { path: `words/${w.audioKey}`, fallbackText: w.word },
    ],
  }),
  speakerButtonPosition: 'inline',
  getWrongAudio: (_t, s) => ({
    clips: [
      { path: 'phrases/toto-je-slovo', fallbackText: 'Toto je slovo' },
      { path: `words/${s.audioKey}`, fallbackText: s.word },
    ],
  }),
  getSuccessSpec: (w) => ({ echoLine: `${w.syllables} ${w.emoji}` }),
  getFailureSpec: (w) => ({
    echoLine: `${w.syllables} ${w.emoji}`,
    audioSpec: {
      clips: [
        { path: 'phrases/nevadi', fallbackText: 'Nevadí!' },
        { path: 'phrases/spravna-odpoved', fallbackText: 'Správna odpoveď je' },
        { path: `words/${w.audioKey}`, fallbackText: w.word },
      ],
    },
  }),
};
