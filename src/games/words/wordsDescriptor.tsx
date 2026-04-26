/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameDescriptor, Word } from '../../shared/types';
import { getPhraseClip } from '../../shared/contentRegistry';

export function createWordsDescriptor(wordItems: Word[], locale: string): GameDescriptor<Word> {
  return {
    gridSize: 6,
    gridCols: {
      base: 2,
      sm: 3,
    },
    getItems: () => wordItems,
    getItemId: (w) => w.word,
    renderCard: (w) => (
      <span className="text-[clamp(2.25rem,7vw,5rem)] leading-none">{w.emoji}</span>
    ),
    renderPrompt: (w) => (
      <h2 className="text-[clamp(1.9rem,5.5vw,4rem)] font-black tracking-[0.12em] text-text-main leading-none">
        {w.syllables.toUpperCase()}
      </h2>
    ),
    getPromptAudio: (_w) => ({
      clips: [getPhraseClip(locale, 'find')],
    }),
    getReplayAudio: (w) => ({
      clips: [{ path: `${locale}/words/${w.audioKey}`, fallbackText: w.word }],
    }),
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/words/${s.audioKey}`, fallbackText: s.word },
        getPhraseClip(locale, 'retry'),
      ],
    }),
    getSuccessSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: { clips: [{ path: `${locale}/words/${w.audioKey}`, fallbackText: w.word }] },
    }),
    getFailureSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: {
        clips: [
          getPhraseClip(locale, 'neverMind'),
          getPhraseClip(locale, 'itIs'),
          { path: `${locale}/words/${w.audioKey}`, fallbackText: w.word },
        ],
      },
    }),
  };
}
