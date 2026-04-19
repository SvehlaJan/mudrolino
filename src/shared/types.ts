/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'ASSEMBLY';
export type SettingsTarget = 'home' | GameId;

export interface GameSettings {
  music: boolean;
  alphabetGridSize: 4 | 6 | 8;
  alphabetAccents: boolean;
  syllablesGridSize: 4 | 6;
  numbersRange: { start: number; end: number };
  countingRange: { start: number; end: number };
}

export interface GameMetadata {
  id: GameId;
  title: string;
  description: string;
  icon: ReactNode;
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

export interface NumberItem {
  value: number;    // 3
  audioKey: string; // "3"
}

// ---------------------------------------------------------------------------
// Shared spec types — describe behavior, not domain
// ---------------------------------------------------------------------------

/** A single audio clip with its own TTS fallback if the file is missing. */
export interface AudioClip {
  /** Path relative to /audio/, without .mp3 — e.g. "phrases/najdi-pismeno", "letters/a" */
  path: string;
  /** Spoken by TTS if this specific file fails to load or play. */
  fallbackText: string;
}

/** Describes a sequence of audio clips to play. */
export interface AudioSpec {
  clips: AudioClip[];
  // Extendable: add global fields here (volume, rate, etc.) without touching call sites
}

/** Describes what the SuccessOverlay shows. */
export interface SuccessSpec {
  echoLine: string; // e.g. "ja-ho-da 🍓" or "A ako Auto 🚗"
  /** Optional extra audio played after praise (e.g. the target word). */
  audioSpec?: AudioSpec;
  /** Optional specific praise to use instead of a random praise clip. */
  praiseEntry?: PraiseEntry;
}

/** Describes what the FailureOverlay shows when a child exhausts their attempts. */
export interface FailureSpec {
  echoLine: string;   // e.g. "A ako Auto 🚗" — the correct answer announcement
  audioSpec: AudioSpec; // audio to play in the overlay
}

// ---------------------------------------------------------------------------
// GameDescriptor — registered per "find it in a grid" game type
// ---------------------------------------------------------------------------

export interface GameDescriptor<T> {
  /** Total cards in the grid including the target. */
  gridSize: number;
  /** Responsive column counts used to size the square grid from viewport width and height. */
  gridCols: {
    base: number;
    sm?: number;
  };
  /** Maximum correct answers before session ends. Defaults to 5 if omitted. */
  maxRounds?: number;
  /** Maximum wrong attempts per round before the failure overlay shows. Defaults to 3 if omitted. */
  maxAttempts?: number;
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
  /**
   * Audio played when the speaker button is tapped.
   * If omitted, falls back to getPromptAudio (existing behavior).
   */
  getReplayAudio?: (target: T) => AudioSpec;
  /** Audio to play when the child taps a wrong card. */
  getWrongAudio(target: T, selected: T): AudioSpec;
  /** Success overlay content for the correct answer. */
  getSuccessSpec(target: T): SuccessSpec;
  /** Failure overlay content — announces the correct answer the child missed. */
  getFailureSpec(target: T): FailureSpec;
}

// ---------------------------------------------------------------------------
// Praise
// ---------------------------------------------------------------------------

export interface PraiseEntry {
  emoji: string;    // "🌟"
  text: string;     // "Výborne!"
  audioKey: string; // "vyborne" → praise/vyborne.mp3
}

export interface AudioPhrase {
  text: string;     // "Nájdi písmenko"
  audioKey: string; // "najdi-pismeno" → phrases/najdi-pismeno.mp3
}

export type AudioPhraseKey =
  | 'find' | 'thisIs' | 'number' | 'letter' | 'syllable' | 'word'
  | 'findLetter' | 'thisIsLetter' | 'thisIsSyllable' | 'thisIsWord'
  | 'countItems' | 'whatIsWrittenHere' | 'orderSyllables'
  | 'retry' | 'neverMind' | 'itIs' | 'yesThereAre' | 'noThereAre' | 'correctAnswerIs';

export interface LocaleContent {
  letterItems: Letter[];
  wordItems: Word[];
  syllableItems: Syllable[];  // derived from wordItems
  numberItems: NumberItem[];
  audioPhrases: Record<AudioPhraseKey, AudioPhrase>;
  praiseEntries: PraiseEntry[];
}
