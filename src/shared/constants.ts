/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Backward-compat re-exports — this file is deleted after all games are migrated.
 */
export { COLORS, BG_COLORS, LETTER_ITEMS, ACTIVE_LETTER_ITEMS, SYLLABLE_ITEMS, NUMBER_ITEMS, WORD_ITEMS, PRAISE_ENTRIES } from './contentRegistry';

// Legacy flat arrays — kept only until game components are migrated
import { LETTER_ITEMS, SYLLABLE_ITEMS } from './contentRegistry';
export const ALPHABET = LETTER_ITEMS.map(item => item.symbol);
export const SYLLABLES = SYLLABLE_ITEMS.map(item => item.symbol);
