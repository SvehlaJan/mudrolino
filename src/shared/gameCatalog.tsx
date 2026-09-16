/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Apple, BookOpen, Gamepad2, Play, Plus, Puzzle, Scale, Type, WandSparkles } from 'lucide-react';
import type { GameId } from './types';
import { getUiCopy, UiCopyKey } from './uiCopy';
import { SettingId } from './settings/settingIds';

// ---------------------------------------------------------------------------
// Catalog types (Phase 3: semantic capability registry, no Tailwind fragments)
// ---------------------------------------------------------------------------

export type GameCategoryId = 'literacy' | 'numeracy';
export type GameIconId =
  | 'letters'
  | 'syllables'
  | 'numbers'
  | 'counting'
  | 'compare'
  | 'addition'
  | 'words'
  | 'first-letter'
  | 'assembly'
  | 'complete-syllable'
  | 'complete-letter';
export type TactilePreset = 'wood' | 'magnet' | 'felt' | 'picture' | 'counter' | 'tray' | 'balance';

export interface GameCategory {
  id: GameCategoryId;
  titleKey: UiCopyKey;
  order: number;
}

export interface GameDefinition {
  id: GameId;
  path: string;
  categoryId: GameCategoryId;
  order: number;
  titleKey: UiCopyKey;
  descriptionKey: UiCopyKey;
  instructionKey: UiCopyKey;
  icon: GameIconId;
  tactilePreset: TactilePreset;
  settings: readonly SettingId[];
  promptMode: 'audio-first' | 'visual-and-audio';
  answerLayout: 'grid' | 'assembly' | 'quantity' | 'comparison';
}

export const GAME_CATEGORIES: GameCategory[] = [
  { id: 'literacy', titleKey: 'category.literacy', order: 1 },
  { id: 'numeracy', titleKey: 'category.numeracy', order: 2 },
];

// Array order matches the pre-redesign GAME_DEFINITIONS order exactly, so the
// derived GAME_METADATA bridge below renders the HomeLauncher grid in the same
// order as today. Grouping/sorting by category is done via categoryId/order,
// not array position.
export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: 'ALPHABET',
    path: '/alphabet',
    categoryId: 'literacy',
    order: 1,
    titleKey: 'game.alphabet.title',
    descriptionKey: 'game.alphabet.description',
    instructionKey: 'game.alphabet.instruction',
    icon: 'letters',
    tactilePreset: 'wood',
    settings: ['alphabetAccents', 'alphabetGridSize'],
    promptMode: 'audio-first',
    answerLayout: 'grid',
  },
  {
    id: 'SYLLABLES',
    path: '/syllables',
    categoryId: 'literacy',
    order: 2,
    titleKey: 'game.syllables.title',
    descriptionKey: 'game.syllables.description',
    instructionKey: 'game.syllables.instruction',
    icon: 'syllables',
    tactilePreset: 'magnet',
    settings: ['syllablesGridSize'],
    promptMode: 'audio-first',
    answerLayout: 'grid',
  },
  {
    id: 'NUMBERS',
    path: '/numbers',
    categoryId: 'numeracy',
    order: 1,
    titleKey: 'game.numbers.title',
    descriptionKey: 'game.numbers.description',
    instructionKey: 'game.numbers.instruction',
    icon: 'numbers',
    tactilePreset: 'wood',
    settings: ['numbersRange'],
    promptMode: 'audio-first',
    answerLayout: 'grid',
  },
  {
    id: 'COUNTING_ITEMS',
    path: '/counting',
    categoryId: 'numeracy',
    order: 2,
    titleKey: 'game.counting.title',
    descriptionKey: 'game.counting.description',
    instructionKey: 'game.counting.instruction',
    icon: 'counting',
    tactilePreset: 'counter',
    settings: ['countingRange'],
    promptMode: 'visual-and-audio',
    answerLayout: 'quantity',
  },
  {
    id: 'COMPARE_QUANTITIES',
    path: '/compare',
    categoryId: 'numeracy',
    order: 3,
    titleKey: 'game.compare.title',
    descriptionKey: 'game.compare.description',
    instructionKey: 'game.compare.instruction',
    icon: 'compare',
    tactilePreset: 'balance',
    settings: ['compareMode', 'compareRange'],
    promptMode: 'visual-and-audio',
    answerLayout: 'comparison',
  },
  {
    id: 'ADDITION',
    path: '/addition',
    categoryId: 'numeracy',
    order: 4,
    titleKey: 'game.addition.title',
    descriptionKey: 'game.addition.description',
    instructionKey: 'game.addition.instruction',
    icon: 'addition',
    tactilePreset: 'tray',
    settings: ['additionSumRange', 'additionRepresentation'],
    promptMode: 'visual-and-audio',
    answerLayout: 'quantity',
  },
  {
    id: 'WORDS',
    path: '/words',
    categoryId: 'literacy',
    order: 3,
    titleKey: 'game.words.title',
    descriptionKey: 'game.words.description',
    instructionKey: 'game.words.instruction',
    icon: 'words',
    tactilePreset: 'picture',
    settings: [],
    promptMode: 'visual-and-audio',
    answerLayout: 'grid',
  },
  {
    id: 'FIRST_LETTER',
    path: '/first-letter',
    categoryId: 'literacy',
    order: 4,
    titleKey: 'game.first-letter.title',
    descriptionKey: 'game.first-letter.description',
    instructionKey: 'game.first-letter.instruction',
    icon: 'first-letter',
    tactilePreset: 'picture',
    settings: ['alphabetAccents'],
    promptMode: 'audio-first',
    answerLayout: 'grid',
  },
  {
    id: 'ASSEMBLY',
    path: '/assembly',
    categoryId: 'literacy',
    order: 5,
    titleKey: 'game.assembly.title',
    descriptionKey: 'game.assembly.description',
    instructionKey: 'game.assembly.instruction',
    icon: 'assembly',
    tactilePreset: 'felt',
    settings: [],
    promptMode: 'visual-and-audio',
    answerLayout: 'assembly',
  },
  {
    id: 'COMPLETE_SYLLABLE',
    path: '/complete-syllable',
    categoryId: 'literacy',
    order: 6,
    titleKey: 'game.complete-syllable.title',
    descriptionKey: 'game.complete-syllable.description',
    instructionKey: 'game.complete-syllable.instruction',
    icon: 'complete-syllable',
    tactilePreset: 'felt',
    settings: [],
    promptMode: 'visual-and-audio',
    answerLayout: 'grid',
  },
  {
    id: 'COMPLETE_LETTER',
    path: '/complete-letter',
    categoryId: 'literacy',
    order: 7,
    titleKey: 'game.complete-letter.title',
    descriptionKey: 'game.complete-letter.description',
    instructionKey: 'game.complete-letter.instruction',
    icon: 'complete-letter',
    tactilePreset: 'magnet',
    settings: ['alphabetAccents', 'completeLetterMissingCount'],
    promptMode: 'visual-and-audio',
    answerLayout: 'grid',
  },
];

export const GAME_PATH: Record<GameId, string> = Object.fromEntries(
  GAME_DEFINITIONS.map(game => [game.id, game.path])
) as Record<GameId, string>;

export const GAME_DEFINITIONS_BY_ID: Record<GameId, GameDefinition> = Object.fromEntries(
  GAME_DEFINITIONS.map(game => [game.id, game])
) as Record<GameId, GameDefinition>;

// ---------------------------------------------------------------------------
// Temporary bridge for the pre-redesign HomeLauncher; deleted together with
// HomeLauncher in Task 4.
// ---------------------------------------------------------------------------

interface LegacyGameMetadata {
  id: GameId;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const LEGACY_ICON_ELEMENT: Record<GameIconId, React.ReactNode> = {
  letters: <Type size={48} className="sm:w-16 sm:h-16" />,
  syllables: <Gamepad2 size={48} className="sm:w-16 sm:h-16" />,
  numbers: <Play size={48} className="sm:w-16 sm:h-16 ml-2" fill="currentColor" />,
  counting: <Apple size={48} className="sm:w-16 sm:h-16" />,
  compare: <Scale size={48} className="sm:w-16 sm:h-16" />,
  addition: <Plus size={48} className="sm:w-16 sm:h-16" strokeWidth={3} />,
  words: <BookOpen size={48} className="sm:w-16 sm:h-16" />,
  'first-letter': <WandSparkles size={48} className="sm:h-16 sm:w-16" />,
  assembly: <Puzzle size={48} className="sm:w-16 sm:h-16" />,
  'complete-syllable': <Puzzle size={48} className="sm:h-16 sm:w-16" />,
  'complete-letter': <Type size={48} className="sm:h-16 sm:w-16" />,
};

const LEGACY_COLOR_BY_ID: Record<GameId, string> = {
  ALPHABET: 'bg-primary',
  SYLLABLES: 'bg-success',
  NUMBERS: 'bg-accent-blue',
  COUNTING_ITEMS: 'bg-soft-watermelon',
  COMPARE_QUANTITIES: 'bg-accent-blue',
  ADDITION: 'bg-soft-watermelon',
  WORDS: 'bg-soft-watermelon',
  FIRST_LETTER: 'bg-success',
  ASSEMBLY: 'bg-primary',
  COMPLETE_SYLLABLE: 'bg-accent-blue',
  COMPLETE_LETTER: 'bg-success',
};

export const GAME_METADATA: LegacyGameMetadata[] = GAME_DEFINITIONS.map((game) => ({
  id: game.id,
  title: getUiCopy('sk', game.titleKey),
  description: getUiCopy('sk', game.descriptionKey),
  icon: LEGACY_ICON_ELEMENT[game.icon],
  color: LEGACY_COLOR_BY_ID[game.id],
}));

// ---------------------------------------------------------------------------
// Temporary bridge for the pre-redesign GameLobby call sites; deleted together
// with GameLobby's old API in Task 5.
// ---------------------------------------------------------------------------

interface GameLobbyMetadata {
  title: string;
  playButtonColorClassName: string;
  topDecorationClassName?: string;
  bottomDecorationClassName?: string;
}

export const GAME_LOBBY_LEGACY: Record<GameId, GameLobbyMetadata> = {
  ALPHABET: {
    title: 'ABECEDA',
    playButtonColorClassName: 'bg-success',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  SYLLABLES: {
    title: 'SLABIKY',
    playButtonColorClassName: 'bg-primary',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-success opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-accent-blue opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  NUMBERS: {
    title: 'ČÍSLA',
    playButtonColorClassName: 'bg-accent-blue',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  COUNTING_ITEMS: {
    title: 'SPOČÍTAJ',
    playButtonColorClassName: 'bg-soft-watermelon',
  },
  COMPARE_QUANTITIES: {
    title: 'VIAC ALEBO MENEJ',
    playButtonColorClassName: 'bg-accent-blue',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  ADDITION: {
    title: 'SČÍTAJ',
    playButtonColorClassName: 'bg-soft-watermelon',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  WORDS: {
    title: 'SLOVÁ',
    playButtonColorClassName: 'bg-soft-watermelon',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  FIRST_LETTER: {
    title: 'PRVÉ PÍSMENKO',
    playButtonColorClassName: 'bg-success',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-soft-watermelon opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  ASSEMBLY: {
    title: 'SKLADAJ',
    playButtonColorClassName: 'bg-primary',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-soft-watermelon opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-accent-blue opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  COMPLETE_SYLLABLE: {
    title: 'DOPLŇ SLABIKU',
    playButtonColorClassName: 'bg-accent-blue',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-success opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none',
  },
  COMPLETE_LETTER: {
    title: 'DOPLŇ PÍSMENO',
    playButtonColorClassName: 'bg-success',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-soft-watermelon opacity-20 translate-y-10 blur-md pointer-events-none',
  },
};
