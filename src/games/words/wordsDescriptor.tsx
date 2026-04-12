/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Word } from '../../shared/types';
import { getPhraseClip, WORD_ITEMS } from '../../shared/contentRegistry';

export const wordsDescriptor: GameDescriptor<Word> = {
  gridSize: 6,
  gridCols: {
    base: 2,
    sm: 3,
  },
  getItems: () => WORD_ITEMS,
  getItemId: (w) => w.word,
  renderCard: (w) => (
    <span className="text-[clamp(2.25rem,7vw,5rem)] leading-none">{w.emoji}</span>
  ),
  renderPrompt: (w) => (
    <h2 className="text-[clamp(1.9rem,5.5vw,4rem)] font-black tracking-[0.12em] text-text-main leading-none">
      {w.syllables.toUpperCase()}
    </h2>
  ),
  getPromptAudio: (w) => ({
    clips: [
      getPhraseClip('find'),
      { path: `words/${w.audioKey}`, fallbackText: w.word },
    ],
  }),
  getReplayAudio: (w) => ({
    clips: [
      { path: `words/${w.audioKey}`, fallbackText: w.word },
    ],
  }),
  getWrongAudio: (_t, s) => ({
    clips: [
      getPhraseClip('thisIs'),
      { path: `words/${s.audioKey}`, fallbackText: s.word },
      getPhraseClip('retry'),
    ],
  }),
  getSuccessSpec: (w) => ({
    echoLine: `${w.syllables} ${w.emoji}`,
    audioSpec: { clips: [{ path: `words/${w.audioKey}`, fallbackText: w.word }] },
  }),
  getFailureSpec: (w) => ({
    echoLine: `${w.syllables} ${w.emoji}`,
    audioSpec: {
      clips: [
        getPhraseClip('neverMind'),
        getPhraseClip('itIs'),
        { path: `words/${w.audioKey}`, fallbackText: w.word },
      ],
    },
  }),
};
