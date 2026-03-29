/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Screen = 'HOME' | 'GAME' | 'PARENTS_GATE' | 'SETTINGS';

export interface GameSettings {
  music: boolean;
  numbersRange: {
    start: number;
    end: number;
  };
  countingRange: {
    start: number;
    end: number;
  };
}

export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS'; // Future games

export interface GameMetadata {
  id: GameId;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface ContentItem {
  symbol: string;        // Display character: "A", "Š", "MA", "3"
  label?: string;        // Human-readable word, e.g. "Ananás" for A
  emoji?: string;        // Optional emoji, e.g. "🍎" — undefined = TBD, excluded from games
  audioKey: string;      // ASCII slug for audio path: "a", "s-caron", "ma", "3"
  category: 'letter' | 'syllable' | 'number' | 'word';
}

export interface PraiseEntry {
  emoji: string;         // "🌟"
  text: string;          // "Výborne!"
  audioKey: string;      // "vyborne" → praise/vyborne.mp3
}

export type PhraseTemplate =
  | 'find-letter'
  | 'wrong-letter'
  | 'find-number'
  | 'wrong-number'
  | 'find-syllable'
  | 'wrong-syllable'
  | 'count-items'
  | 'correct-count'
  | 'wrong-count';
