/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GameId } from './types';
import type { UiCopyKey } from './uiCopy';
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
