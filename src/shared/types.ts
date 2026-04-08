/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

export type Screen = 'HOME' | 'GAME' | 'PARENTS_GATE' | 'SETTINGS';

export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS';

export interface GameSettings {
  music: boolean;
  alphabetGridSize: 4 | 6 | 8;
  syllablesGridSize: 4 | 6;
  numbersRange: { start: number; end: number };
  countingRange: { start: number; end: number };
}

export interface GameMetadata {
  id: GameId;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Domain models — pure data, no game logic, no optional cross-game fields
// ---------------------------------------------------------------------------

export interface Letter {
  symbol: string;    // "A", "Š", "DŽ"
  label: string;     // "Auto"
  emoji: string;     // "🚗"
  audioKey: string;  // "a", "s-caron", "dz-caron"
}

export interface Syllable {
  symbol: string;       // "JA"
  audioKey: string;     // "ja"
  sourceWords: Word[];  // used for success echo line
}

export interface Word {
  word: string;       // "Jahoda"
  syllables: string;  // "ja-ho-da"
  emoji: string;      // "🍓"
  audioKey: string;   // "jahoda" (lowercase ASCII, no diacritics)
}

export interface SlovakNumber {
  value: number;    // 3
  audioKey: string; // "3"
}

// ---------------------------------------------------------------------------
// Shared spec types — describe behavior, not domain
// ---------------------------------------------------------------------------

/** Describes a sequence of audio clips to play, with a TTS fallback. */
export interface AudioSpec {
  /** Paths relative to /audio/, without .mp3 — e.g. "phrases/najdi-pismeno", "letters/a" */
  sequence: string[];
  fallbackText: string;
}

/** Describes what the SuccessOverlay shows. */
export interface SuccessSpec {
  echoLine: string; // e.g. "ja-ho-da 🍓" or "A ako Auto 🚗"
}

// ---------------------------------------------------------------------------
// GameDescriptor — registered per "find it in a grid" game type
// ---------------------------------------------------------------------------

export interface GameDescriptor<T> {
  /** Total cards in the grid including the target. */
  gridSize: number;
  /** Tailwind grid-cols classes, e.g. "grid-cols-2 sm:grid-cols-3" */
  gridColsClass: string;
  /** Maximum correct answers before session ends. Defaults to 10 if omitted. */
  maxRounds?: number;
  /** Returns all items in the pool for this game. */
  getItems(): T[];
  /** Returns a stable unique string id for an item — used for dedup and comparison. */
  getItemId(item: T): string;
  /** Renders the card face shown in the grid. */
  renderCard(item: T): ReactNode;
  /**
   * Renders the prompt shown above the grid (e.g. syllabified word for Words game).
   * Return null for audio-only prompts (Alphabet, Syllables, Numbers).
   */
  renderPrompt(target: T): ReactNode;
  /** Audio to play at round start and when the replay button is tapped. */
  getPromptAudio(target: T): AudioSpec;
  /** Audio to play when the child taps a wrong card. */
  getWrongAudio(target: T, selected: T): AudioSpec;
  /** Success overlay content for the correct answer. */
  getSuccessSpec(target: T): SuccessSpec;
}

// ---------------------------------------------------------------------------
// Praise
// ---------------------------------------------------------------------------

export interface PraiseEntry {
  emoji: string;    // "🌟"
  text: string;     // "Výborne!"
  audioKey: string; // "vyborne" → praise/vyborne.mp3
}
