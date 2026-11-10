/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createAdditionProblem } from '../games/addition/additionLogic';
import { createComparisonRound } from '../games/compare/compareLogic';
import {
  buildEligibleCompleteLetterWords,
  chooseMissingIndexes,
  getActiveCompleteLetterLetters,
  parseWordLetterUnits,
  resolveMissingCount,
} from '../games/complete-letter/completeLetterLogic';
import {
  buildEligibleCompleteSyllableWords,
  parseWordSyllables,
} from '../games/complete-syllable/completeSyllableLogic';
import {
  buildFirstLetterItems,
  getActiveFirstLetterLetters,
  multiCharacterLetters,
} from '../games/first-letter/firstLetterLogic';
import { COUNTING_EMOJIS } from '../shared/contentRegistry';
import { getUnplayableReason } from '../shared/gamePlayability';
import { additionRangeForcesNumerals } from '../shared/settings/settingsRegistry';
import type { GameSettings, Letter, NumberItem, Syllable, Word } from '../shared/types';
import { createSeededRandom, deriveSeed, pickWith, randomIntInclusive, shuffleWith } from './seededRandom';

/** Games that keep their mechanic on paper; the rest need a different worksheet design. */
export const WORKSHEET_GAME_IDS = [
  'COUNTING_ITEMS',
  'COMPARE_QUANTITIES',
  'ADDITION',
  'FIRST_LETTER',
  'COMPLETE_SYLLABLE',
  'COMPLETE_LETTER',
] as const;

export type WorksheetGameId = typeof WORKSHEET_GAME_IDS[number];
/** How the child answers: circle one printed choice, or write the answer into an empty box. */
export type WorksheetAnswerMode = 'circle' | 'write';
export type WorksheetRepresentation = 'objects' | 'numerals';

export const TASKS_PER_PAGE = 6;
export const PAGES_PER_GAME_OPTIONS = [1, 2, 3] as const;
export type PagesPerGame = typeof PAGES_PER_GAME_OPTIONS[number];

export interface WorksheetContent {
  letterItems: Letter[];
  wordItems: Word[];
  syllableItems: Syllable[];
  settings: GameSettings;
}

export interface CountingTask { kind: 'counting'; emoji: string; count: number; choices: number[] }
export interface CompareTask { kind: 'compare'; emoji: string; left: number; right: number }
export interface AdditionTask { kind: 'addition'; emoji: string; a: number; b: number; sum: number; choices: number[] }
export interface FirstLetterTask { kind: 'first-letter'; word: Word; answer: string; choices: string[] }
/** `slots` holds the word in order; `null` marks a blank the child fills. */
export interface CompleteSyllableTask { kind: 'complete-syllable'; word: Word; slots: (string | null)[]; answers: string[]; choices: string[] }
export interface CompleteLetterTask { kind: 'complete-letter'; word: Word; slots: (string | null)[]; answers: string[]; choices: string[] }

export type WorksheetTask =
  | CountingTask
  | CompareTask
  | AdditionTask
  | FirstLetterTask
  | CompleteSyllableTask
  | CompleteLetterTask;

export interface WorksheetPage {
  gameId: WorksheetGameId;
  /** 1-based page number within its game. */
  pageNumber: number;
  representation: WorksheetRepresentation;
  tasks: WorksheetTask[];
}

export interface WorksheetRequest {
  gameIds: readonly WorksheetGameId[];
  pagesPerGame: number;
  seed: number;
  content: WorksheetContent;
}

/** Slovak msg()-marked reason when the family's content cannot fill a sheet, otherwise null. */
export function getWorksheetUnavailableReason(gameId: WorksheetGameId, content: WorksheetContent): string | null {
  return getUnplayableReason(gameId, content);
}

export function getWorksheetRepresentation(gameId: WorksheetGameId, settings: GameSettings): WorksheetRepresentation {
  if (gameId === 'COMPARE_QUANTITIES') return settings.compareMode;
  if (gameId === 'ADDITION') {
    return additionRangeForcesNumerals(settings.additionSumRange) ? 'numerals' : settings.additionRepresentation;
  }
  return 'objects';
}

/**
 * Builds every page in game order. Each game draws from its own seeded stream, so adding or
 * removing a game leaves the other games' tasks unchanged. Games without content are skipped.
 */
export function buildWorksheet({ gameIds, pagesPerGame, seed, content }: WorksheetRequest): WorksheetPage[] {
  const selected = WORKSHEET_GAME_IDS.filter(gameId => gameIds.includes(gameId));
  return selected.flatMap(gameId => {
    if (getWorksheetUnavailableReason(gameId, content) !== null) return [];
    const random = createSeededRandom(deriveSeed(seed, gameId));
    const generate = createTaskGenerator(gameId, content, random);
    const representation = getWorksheetRepresentation(gameId, content.settings);
    return Array.from({ length: pagesPerGame }, (_, index) => ({
      gameId,
      pageNumber: index + 1,
      representation,
      tasks: generateDistinct(generate, TASKS_PER_PAGE),
    }));
  });
}

export function taskKey(task: WorksheetTask): string {
  switch (task.kind) {
    case 'counting':
      return `${task.count}`;
    case 'compare':
      return [task.left, task.right].sort((x, y) => x - y).join('-');
    case 'addition':
      return [task.a, task.b].sort((x, y) => x - y).join('+');
    case 'first-letter':
      return task.word.word;
    case 'complete-syllable':
    case 'complete-letter':
      return `${task.word.word}:${task.slots.map(slot => slot ?? '_').join('')}`;
  }
}

interface TaskGenerator {
  next(): WorksheetTask;
}

/**
 * Prefers a task not yet on the page; small pools (counting 1–5, few custom words) may
 * still repeat once every distinct task is used, rather than leaving the page short.
 */
function generateDistinct(generator: TaskGenerator, count: number): WorksheetTask[] {
  const tasks: WorksheetTask[] = [];
  const seen = new Set<string>();
  while (tasks.length < count) {
    let task = generator.next();
    for (let attempt = 0; attempt < 30 && seen.has(taskKey(task)); attempt += 1) {
      task = generator.next();
    }
    seen.add(taskKey(task));
    tasks.push(task);
  }
  return tasks;
}

function createTaskGenerator(gameId: WorksheetGameId, content: WorksheetContent, random: () => number): TaskGenerator {
  switch (gameId) {
    case 'COUNTING_ITEMS':
      return countingGenerator(content.settings, random);
    case 'COMPARE_QUANTITIES':
      return compareGenerator(content.settings, random);
    case 'ADDITION':
      return additionGenerator(content.settings, random);
    case 'FIRST_LETTER':
      return firstLetterGenerator(content, random);
    case 'COMPLETE_SYLLABLE':
      return completeSyllableGenerator(content, random);
    case 'COMPLETE_LETTER':
      return completeLetterGenerator(content, random);
  }
}

/** Three distinct choices including `target`, preferring near misses so guessing by size fails. */
export function buildNumberChoices(
  target: number,
  min: number,
  max: number,
  random: () => number,
  count = 3,
): number[] {
  const distractors = new Set<number>();
  const near = shuffleWith([-2, -1, 1, 2], random).map(offset => target + offset);
  for (const value of near) {
    if (distractors.size >= count - 1) break;
    if (value >= min && value <= max) distractors.add(value);
  }
  const rest = shuffleWith(
    Array.from({ length: max - min + 1 }, (_, index) => min + index).filter(value => value !== target),
    random,
  );
  for (const value of rest) {
    if (distractors.size >= count - 1) break;
    distractors.add(value);
  }
  return shuffleWith([target, ...distractors], random);
}

function countingGenerator(settings: GameSettings, random: () => number): TaskGenerator {
  const { start, end } = settings.countingRange;
  return {
    next: () => {
      const count = randomIntInclusive(start, end, random);
      return { kind: 'counting', emoji: pickWith(COUNTING_EMOJIS, random), count, choices: buildNumberChoices(count, start, end, random) };
    },
  };
}

function compareGenerator(settings: GameSettings, random: () => number): TaskGenerator {
  const { start, end } = settings.compareRange;
  const items: NumberItem[] = Array.from({ length: end - start + 1 }, (_, index) => ({
    value: start + index,
    audioKey: String(start + index),
  }));
  return {
    next: () => {
      const round = createComparisonRound(items, random);
      return { kind: 'compare', emoji: pickWith(COUNTING_EMOJIS, random), left: round.left.value, right: round.right.value };
    },
  };
}

function additionGenerator(settings: GameSettings, random: () => number): TaskGenerator {
  const range = settings.additionSumRange;
  return {
    next: () => {
      const problem = createAdditionProblem(range, random);
      return {
        kind: 'addition',
        emoji: pickWith(COUNTING_EMOJIS, random),
        a: problem.a.value,
        b: problem.b.value,
        sum: problem.sum.value,
        choices: buildNumberChoices(problem.sum.value, 2, range, random),
      };
    },
  };
}

function uniqueSymbols(symbols: readonly string[]): string[] {
  return Array.from(new Set(symbols.map(symbol => symbol.trim().toLocaleUpperCase('sk-SK'))));
}

/** The correct answers plus distinct distractors, at least four choices in all. */
function buildTextChoices(answers: readonly string[], pool: readonly string[], random: () => number): string[] {
  const correct = uniqueSymbols(answers);
  const total = Math.max(4, correct.length + 2);
  const distractors = shuffleWith(uniqueSymbols(pool).filter(symbol => !correct.includes(symbol)), random)
    .slice(0, total - correct.length);
  return shuffleWith([...correct, ...distractors], random);
}

/** Walks a shuffled pool and reshuffles when it runs out, so a page uses every word before repeating. */
function createPool<T>(items: readonly T[], random: () => number): () => T {
  let queue: T[] = [];
  return () => {
    if (queue.length === 0) queue = shuffleWith(items, random);
    return queue.pop() as T;
  };
}

function firstLetterGenerator(content: WorksheetContent, random: () => number): TaskGenerator {
  const activeLetters = getActiveFirstLetterLetters(content.letterItems, content.settings.alphabetAccents);
  const items = buildFirstLetterItems(content.wordItems, activeLetters, multiCharacterLetters(content.letterItems));
  const nextItem = createPool(items, random);
  const symbols = activeLetters.map(letter => letter.symbol);
  return {
    next: () => {
      const item = nextItem();
      const answer = item.firstLetter.symbol.toLocaleUpperCase('sk-SK');
      return { kind: 'first-letter', word: item.word, answer, choices: buildTextChoices([answer], symbols, random) };
    },
  };
}

function completeSyllableGenerator(content: WorksheetContent, random: () => number): TaskGenerator {
  const words = buildEligibleCompleteSyllableWords(content.wordItems, content.syllableItems);
  const nextWord = createPool(words, random);
  const symbols = content.syllableItems.map(syllable => syllable.symbol);
  return {
    next: () => {
      const word = nextWord();
      const syllables = parseWordSyllables(word.syllables).map(syllable => syllable.toLocaleUpperCase('sk-SK'));
      const missingIndex = Math.floor(random() * syllables.length);
      const answers = [syllables[missingIndex]];
      return {
        kind: 'complete-syllable',
        word,
        slots: syllables.map((syllable, index) => (index === missingIndex ? null : syllable)),
        answers,
        choices: buildTextChoices(answers, symbols, random),
      };
    },
  };
}

function completeLetterGenerator(content: WorksheetContent, random: () => number): TaskGenerator {
  const { settings, letterItems, wordItems } = content;
  const activeLetters = getActiveCompleteLetterLetters(letterItems, settings.alphabetAccents);
  const multiCharacter = multiCharacterLetters(letterItems);
  const words = buildEligibleCompleteLetterWords(wordItems, letterItems, settings.alphabetAccents, settings.completeLetterMissingCount);
  const nextWord = createPool(words, random);
  const symbols = activeLetters.map(letter => letter.symbol);
  return {
    next: () => {
      const word = nextWord();
      const units = parseWordLetterUnits(word.word, activeLetters, multiCharacter) ?? [];
      const missingCount = resolveMissingCount(settings.completeLetterMissingCount, units.length);
      const missingIndexes = chooseMissingIndexes(units.length, missingCount, random);
      const answers = missingIndexes.map(index => units[index]);
      return {
        kind: 'complete-letter',
        word,
        slots: units.map((unit, index) => (missingIndexes.includes(index) ? null : unit)),
        answers,
        choices: buildTextChoices(answers, symbols, random),
      };
    },
  };
}
