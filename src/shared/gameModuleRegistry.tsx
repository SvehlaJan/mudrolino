/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameId } from './types';
import { GameRuntimeProps } from './gameRuntime';

function lazyRoute<TModule>(
  load: () => Promise<TModule>,
  render: (module: TModule, props: GameRuntimeProps) => React.ReactNode,
) {
  return React.lazy(async () => {
    const module = await load();
    return { default: (props: GameRuntimeProps) => render(module, props) };
  });
}

export const GAME_MODULES: Record<GameId, React.ComponentType<GameRuntimeProps>> = {
  ALPHABET: lazyRoute(() => import('../games/alphabet/AlphabetGame'), (m, p) => <m.AlphabetGame {...p} />),
  SYLLABLES: lazyRoute(() => import('../games/syllables/SyllablesGame'), (m, p) => <m.SyllablesGame {...p} />),
  NUMBERS: lazyRoute(() => import('../games/numbers/NumbersGame'), (m, p) => <m.NumbersGame {...p} />),
  COUNTING_ITEMS: lazyRoute(() => import('../games/counting/CountingItemsGame'), (m, p) => <m.CountingItemsGame {...p} />),
  COMPARE_QUANTITIES: lazyRoute(() => import('../games/compare/CompareQuantitiesGame'), (m, p) => <m.CompareQuantitiesGame {...p} />),
  ADDITION: lazyRoute(() => import('../games/addition/AdditionGame'), (m, p) => <m.AdditionGame {...p} />),
  WORDS: lazyRoute(() => import('../games/words/WordsGame'), (m, p) => <m.WordsGame {...p} />),
  FIRST_LETTER: lazyRoute(() => import('../games/first-letter/FirstLetterGame'), (m, p) => <m.FirstLetterGame {...p} />),
  ASSEMBLY: lazyRoute(() => import('../games/assembly/AssemblyGame'), (m, p) => <m.AssemblyGame {...p} />),
  COMPLETE_SYLLABLE: lazyRoute(() => import('../games/complete-syllable/CompleteSyllableGame'), (m, p) => <m.CompleteSyllableGame {...p} />),
  COMPLETE_LETTER: lazyRoute(() => import('../games/complete-letter/CompleteLetterGame'), (m, p) => <m.CompleteLetterGame {...p} />),
};

export const GAME_MODULE_IDS = Object.keys(GAME_MODULES) as GameId[];
