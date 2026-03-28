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
