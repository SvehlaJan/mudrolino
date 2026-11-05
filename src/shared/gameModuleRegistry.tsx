/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameId } from './types';
import { GameRuntimeProps } from './gameRuntime';
import { createModuleLoader } from './moduleLoader';

interface GameModuleRoute {
  Component: React.ComponentType<GameRuntimeProps>;
  /** Starts (or joins) the one download of the game's chunk; the route renders the same chunk. */
  preload: () => Promise<unknown>;
}

function lazyRoute<TModule>(
  load: () => Promise<TModule>,
  render: (module: TModule, props: GameRuntimeProps) => React.ReactNode,
): GameModuleRoute {
  // A preload and the route share one download. Once it has finished the route renders without
  // suspending, so a card tap (which preloads on pointerdown) skips React's suspended-screen delay.
  const loader = createModuleLoader(load);
  function GameModule(props: GameRuntimeProps) {
    const module = loader.loaded() ?? React.use(loader.load());
    return render(module, props);
  }
  return { Component: GameModule, preload: loader.load };
}

const GAME_ROUTES: Record<GameId, GameModuleRoute> = {
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

export const GAME_MODULES = Object.fromEntries(
  Object.entries(GAME_ROUTES).map(([gameId, route]) => [gameId, route.Component]),
) as Record<GameId, React.ComponentType<GameRuntimeProps>>;

export const GAME_MODULE_IDS = Object.keys(GAME_MODULES) as GameId[];

/**
 * Starts downloading a game's code, so the route finds it ready. A Home-screen card calls this when a
 * finger touches it, which hides most of the download behind the tap itself. Memoised per game.
 */
export function preloadGameModule(gameId: GameId): Promise<unknown> {
  return GAME_ROUTES[gameId].preload();
}
