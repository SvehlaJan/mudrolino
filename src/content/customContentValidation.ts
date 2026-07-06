import type { UserPraise, UserWord } from '../shared/types';

export interface WordFormInput {
  word: string;
  syllables: string;
  emoji: string;
}

export interface PraiseFormInput {
  text: string;
  emoji: string;
}

export interface WordFormValues {
  word: string;
  syllables: string;
  emoji: string;
}

export interface PraiseFormValues {
  text: string;
  emoji: string;
}

export interface WordFormErrors {
  word?: string;
  syllables?: string;
  emoji?: string;
}

export interface PraiseFormErrors {
  text?: string;
  emoji?: string;
}

export type WordValidationResult =
  | { valid: true; values: WordFormValues; errors: WordFormErrors }
  | { valid: false; values: null; errors: WordFormErrors };

export type PraiseValidationResult =
  | { valid: true; values: PraiseFormValues; errors: PraiseFormErrors }
  | { valid: false; values: null; errors: PraiseFormErrors };

export function normalizeComparableText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sk-SK');
}

export function normalizeSyllables(value: string): string {
  return value
    .trim()
    .split('-')
    .map((part) => part.trim().replace(/\s+/g, ' ').toLocaleLowerCase('sk-SK'))
    .join('-');
}

function hasDuplicateWord(word: string, existingWords: UserWord[], currentId?: string): boolean {
  const normalized = normalizeComparableText(word);
  return existingWords.some((candidate) => (
    candidate.id !== currentId && normalizeComparableText(candidate.word) === normalized
  ));
}

function hasDuplicatePraise(text: string, existingPraises: UserPraise[], currentId?: string): boolean {
  const normalized = normalizeComparableText(text);
  return existingPraises.some((candidate) => (
    candidate.id !== currentId && normalizeComparableText(candidate.text) === normalized
  ));
}

export function validateWordForm(
  input: WordFormInput,
  existingWords: UserWord[],
  currentId?: string,
): WordValidationResult {
  const word = input.word.trim().replace(/\s+/g, ' ');
  const syllables = normalizeSyllables(input.syllables);
  const emoji = input.emoji.trim();
  const errors: WordFormErrors = {};

  if (!word) {
    errors.word = 'Zadajte slovo.';
  } else if (hasDuplicateWord(word, existingWords, currentId)) {
    errors.word = 'Toto slovo už v zozname je.';
  }

  const syllableParts = syllables.split('-');
  if (!input.syllables.trim()) {
    errors.syllables = 'Zadajte slabiky.';
  } else if (syllableParts.length < 2 || syllableParts.length > 4) {
    errors.syllables = 'Použite 2 až 4 slabiky oddelené pomlčkou.';
  } else if (syllableParts.some((part) => part.length === 0)) {
    errors.syllables = 'Každá slabika musí obsahovať text.';
  }

  if (!emoji) {
    errors.emoji = 'Zadajte emoji.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, values: null, errors };
  }

  return { valid: true, values: { word, syllables, emoji }, errors };
}

export function validatePraiseForm(
  input: PraiseFormInput,
  existingPraises: UserPraise[],
  currentId?: string,
): PraiseValidationResult {
  const text = input.text.trim().replace(/\s+/g, ' ');
  const emoji = input.emoji.trim();
  const errors: PraiseFormErrors = {};

  if (!text) {
    errors.text = 'Zadajte text pochvaly.';
  } else if (hasDuplicatePraise(text, existingPraises, currentId)) {
    errors.text = 'Táto pochvala už v zozname je.';
  }

  if (!emoji) {
    errors.emoji = 'Zadajte emoji.';
  }

  if (Object.keys(errors).length > 0) {
    return { valid: false, values: null, errors };
  }

  return { valid: true, values: { text, emoji }, errors };
}
