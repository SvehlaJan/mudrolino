/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Screen = 'HOME' | 'GAME' | 'PARENTS_GATE' | 'SETTINGS';

export interface GameSettings {
  voice: boolean;
  sfx: boolean;
  music: boolean;
}

export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS'; // Future games

export interface GameMetadata {
  id: GameId;
  title: string;
  description: string;
  icon: string;
  color: string;
}
