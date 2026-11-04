import { describe, expect, it } from 'vitest';
import { GAME_DEFINITIONS } from './gameCatalog';
import { getLocaleContent } from './contentRegistry';
import { getAssemblyEligibleWords, getUnplayableReason, type PlayabilityInput } from './gamePlayability';
import { DEFAULT_GAME_SETTINGS } from './settings/settingsRegistry';
import type { GameId, Word } from './types';

const content = getLocaleContent('sk');

const bundledInput: PlayabilityInput = {
  wordItems: content.wordItems,
  letterItems: content.letterItems,
  syllableItems: content.syllableItems,
  settings: DEFAULT_GAME_SETTINGS,
};

const noWordsInput: PlayabilityInput = { ...bundledInput, wordItems: [], syllableItems: [] };

const WORD_GAME_REASONS: Record<string, string> = {
  WORDS: 'Pridajte slová v sekcii Vlastný obsah.',
  FIRST_LETTER: 'Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.',
  ASSEMBLY: 'Pridajte slová so slabikami v sekcii Vlastný obsah.',
  COMPLETE_SYLLABLE: 'Pridajte slová s dvomi až štyrmi slabikami.',
  COMPLETE_LETTER: 'Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.',
};

function wordWith(word: string, syllables: string): Word {
  return { word, syllables, emoji: '🧪', audioKey: word.toLowerCase() };
}

describe('getUnplayableReason', () => {
  it('every game is playable with the bundled words', () => {
    for (const { id } of GAME_DEFINITIONS) {
      expect(getUnplayableReason(id, bundledInput), id).toBeNull();
    }
  });

  it('word games explain themselves when no words are enabled', () => {
    for (const [id, reason] of Object.entries(WORD_GAME_REASONS)) {
      expect(getUnplayableReason(id as GameId, noWordsInput), id).toBe(reason);
    }
  });

  it('games that do not use words stay playable without them', () => {
    const wordFree: GameId[] = ['ALPHABET', 'NUMBERS', 'COUNTING_ITEMS', 'COMPARE_QUANTITIES', 'ADDITION'];
    for (const id of wordFree) {
      expect(getUnplayableReason(id, noWordsInput), id).toBeNull();
    }
  });

  it('assembly needs a two- or three-syllable word', () => {
    const tooLong = { ...bundledInput, wordItems: [wordWith('Kukurica', 'ku-ku-ri-ca')] };
    const fits = { ...bundledInput, wordItems: [wordWith('Mama', 'ma-ma')] };

    expect(getUnplayableReason('ASSEMBLY', tooLong)).toBe(WORD_GAME_REASONS.ASSEMBLY);
    expect(getUnplayableReason('ASSEMBLY', fits)).toBeNull();
  });

  it('letter games need four active letters', () => {
    // "Baba" is made of the first letters A, Á, B, so only the letter count can make a game Unplayable.
    const baba = [wordWith('Baba', 'ba-ba')];
    const enoughLetters = { ...bundledInput, wordItems: baba };
    const fewLetters = { ...enoughLetters, letterItems: content.letterItems.slice(0, 3) };

    expect(getUnplayableReason('FIRST_LETTER', enoughLetters)).toBeNull();
    expect(getUnplayableReason('COMPLETE_LETTER', enoughLetters)).toBeNull();
    expect(getUnplayableReason('FIRST_LETTER', fewLetters)).toBe(WORD_GAME_REASONS.FIRST_LETTER);
    expect(getUnplayableReason('COMPLETE_LETTER', fewLetters)).toBe(WORD_GAME_REASONS.COMPLETE_LETTER);
  });
});

describe('getAssemblyEligibleWords', () => {
  it('keeps only words of two or three syllables', () => {
    const words = [
      wordWith('Dom', 'dom'),
      wordWith('Mama', 'ma-ma'),
      wordWith('Jahoda', 'ja-ho-da'),
      wordWith('Kukurica', 'ku-ku-ri-ca'),
    ];

    expect(getAssemblyEligibleWords(words).map(({ word }) => word)).toEqual(['Mama', 'Jahoda']);
  });
});
