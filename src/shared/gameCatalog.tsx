/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Apple, BookOpen, Gamepad2, Play, Puzzle, Type } from 'lucide-react';
import type { GameId, GameMetadata } from './types';

interface GameLobbyMetadata {
  title: string;
  playButtonColorClassName: string;
  topDecorationClassName?: string;
  bottomDecorationClassName?: string;
}

export interface GameDefinition extends GameMetadata {
  path: string;
  lobby: GameLobbyMetadata;
}

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: 'ALPHABET',
    path: '/alphabet',
    title: 'Abeceda',
    description: 'Spoznávaj písmenká hravou formou',
    icon: <Type size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-primary',
    lobby: {
      title: 'ABECEDA',
      playButtonColorClassName: 'bg-success',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'SYLLABLES',
    path: '/syllables',
    title: 'Slabiky',
    description: 'Spájaj písmenká do slabík',
    icon: <Gamepad2 size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-success',
    lobby: {
      title: 'SLABIKY',
      playButtonColorClassName: 'bg-primary',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-success opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-accent-blue opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'NUMBERS',
    path: '/numbers',
    title: 'Čísla',
    description: 'Počítaj s kamarátmi',
    icon: <Play size={48} className="sm:w-16 sm:h-16 ml-2" fill="currentColor" />,
    color: 'bg-accent-blue',
    lobby: {
      title: 'ČÍSLA',
      playButtonColorClassName: 'bg-accent-blue',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'COUNTING_ITEMS',
    path: '/counting',
    title: 'Spočítaj',
    description: 'Koľko jabĺčok vidíš?',
    icon: <Apple size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
    lobby: {
      title: 'SPOČÍTAJ',
      playButtonColorClassName: 'bg-soft-watermelon',
    },
  },
  {
    id: 'WORDS',
    path: '/words',
    title: 'Slová',
    description: 'Prečítaj slovo a nájdi obrázok',
    icon: <BookOpen size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
    lobby: {
      title: 'SLOVÁ',
      playButtonColorClassName: 'bg-soft-watermelon',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'ASSEMBLY',
    path: '/assembly',
    title: 'Skladaj',
    description: 'Poskladaj slovo zo slabík',
    icon: <Puzzle size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-primary',
    lobby: {
      title: 'SKLADAJ',
      playButtonColorClassName: 'bg-primary',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-soft-watermelon opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-accent-blue opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
];

export const GAME_METADATA: GameMetadata[] = GAME_DEFINITIONS.map(({ lobby: _lobby, path: _path, ...metadata }) => metadata);

export const GAME_PATH: Record<GameId, string> = Object.fromEntries(
  GAME_DEFINITIONS.map(game => [game.id, game.path])
) as Record<GameId, string>;

export const GAME_DEFINITIONS_BY_ID: Record<GameId, GameDefinition> = Object.fromEntries(
  GAME_DEFINITIONS.map(game => [game.id, game])
) as Record<GameId, GameDefinition>;
