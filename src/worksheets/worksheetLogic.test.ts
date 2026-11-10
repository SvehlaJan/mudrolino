import { describe, expect, it } from 'vitest';
import { getLocaleContent } from '../shared/contentRegistry';
import { createDefaultSettings } from '../shared/settings/settingsRegistry';
import type { GameSettings, Word } from '../shared/types';
import { createSeededRandom } from './seededRandom';
import {
  buildNumberChoices,
  buildWorksheet,
  getWorksheetRepresentation,
  getWorksheetUnavailableReason,
  TASKS_PER_PAGE,
  taskKey,
  WORKSHEET_GAME_IDS,
  type WorksheetContent,
  type WorksheetTask,
} from './worksheetLogic';

function content(overrides: Partial<GameSettings> = {}, wordItems?: Word[]): WorksheetContent {
  const locale = getLocaleContent('sk');
  return {
    letterItems: locale.letterItems,
    wordItems: wordItems ?? locale.wordItems,
    syllableItems: locale.syllableItems,
    settings: { ...createDefaultSettings(), ...overrides },
  };
}

function allTasks(seed: number, input = content()): WorksheetTask[] {
  return buildWorksheet({ gameIds: WORKSHEET_GAME_IDS, pagesPerGame: 3, seed, content: input }).flatMap(page => page.tasks);
}

describe('buildWorksheet', () => {
  it('prints the same worksheet for the same seed and a different one for another seed', () => {
    const request = { gameIds: WORKSHEET_GAME_IDS, pagesPerGame: 2, content: content() };
    expect(buildWorksheet({ ...request, seed: 42 })).toEqual(buildWorksheet({ ...request, seed: 42 }));
    expect(buildWorksheet({ ...request, seed: 42 })).not.toEqual(buildWorksheet({ ...request, seed: 43 }));
  });

  it('gives every selected game the requested number of full pages, in catalog order', () => {
    const pages = buildWorksheet({ gameIds: ['ADDITION', 'COUNTING_ITEMS'], pagesPerGame: 2, seed: 1, content: content() });
    expect(pages.map(page => [page.gameId, page.pageNumber])).toEqual([
      ['COUNTING_ITEMS', 1], ['COUNTING_ITEMS', 2], ['ADDITION', 1], ['ADDITION', 2],
    ]);
    expect(pages.every(page => page.tasks.length === TASKS_PER_PAGE)).toBe(true);
  });

  it('keeps a game\'s tasks when another game is added or removed', () => {
    const alone = buildWorksheet({ gameIds: ['ADDITION'], pagesPerGame: 1, seed: 7, content: content() });
    const mixed = buildWorksheet({ gameIds: ['COUNTING_ITEMS', 'ADDITION'], pagesPerGame: 1, seed: 7, content: content() });
    expect(mixed.find(page => page.gameId === 'ADDITION')).toEqual(alone[0]);
  });

  it('skips a game the family content cannot fill', () => {
    const input = content({}, []);
    expect(getWorksheetUnavailableReason('FIRST_LETTER', input)).not.toBeNull();
    const pages = buildWorksheet({ gameIds: ['FIRST_LETTER', 'COUNTING_ITEMS'], pagesPerGame: 1, seed: 3, content: input });
    expect(pages.map(page => page.gameId)).toEqual(['COUNTING_ITEMS']);
  });

  it('avoids repeating a task on one page while distinct tasks remain', () => {
    const pages = buildWorksheet({ gameIds: ['FIRST_LETTER', 'ADDITION'], pagesPerGame: 3, seed: 11, content: content({ additionSumRange: 10 }) });
    for (const page of pages) {
      const keys = page.tasks.map(taskKey);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });
});

describe('worksheet tasks follow the game settings and stay solvable', () => {
  it('counts within the counting range and offers the count among three choices', () => {
    for (const task of allTasks(5, content({ countingRange: { start: 1, end: 10 } }))) {
      if (task.kind !== 'counting') continue;
      expect(task.count).toBeGreaterThanOrEqual(1);
      expect(task.count).toBeLessThanOrEqual(10);
      expect(task.choices).toHaveLength(3);
      expect(task.choices).toContain(task.count);
    }
  });

  it('compares two different numbers inside the compare range', () => {
    for (const task of allTasks(6)) {
      if (task.kind !== 'compare') continue;
      expect(task.left).not.toBe(task.right);
      expect(Math.max(task.left, task.right)).toBeLessThanOrEqual(5);
    }
  });

  it('adds up to the sum range and prints numerals once the range forces them', () => {
    const input = content({ additionSumRange: 20, additionRepresentation: 'objects' });
    expect(getWorksheetRepresentation('ADDITION', input.settings)).toBe('numerals');
    for (const task of allTasks(8, input)) {
      if (task.kind !== 'addition') continue;
      expect(task.a + task.b).toBe(task.sum);
      expect(task.sum).toBeLessThanOrEqual(20);
      expect(new Set(task.choices).size).toBe(3);
      expect(task.choices).toContain(task.sum);
    }
  });

  it('asks the first Slovak letter unit, so Chlieb starts with CH', () => {
    const chlieb: Word = { word: 'Chlieb', syllables: 'chlieb', emoji: '🍞', audioKey: 'chlieb' };
    const tasks = allTasks(9, content({}, [chlieb]));
    const firstLetter = tasks.filter(task => task.kind === 'first-letter');
    expect(firstLetter.length).toBeGreaterThan(0);
    for (const task of firstLetter) {
      expect(task.answer).toBe('CH');
      expect(task.choices).toHaveLength(4);
      expect(task.choices).toContain('CH');
    }
  });

  it('leaves out exactly the answer syllable and offers it among the choices', () => {
    for (const task of allTasks(10)) {
      if (task.kind !== 'complete-syllable') continue;
      const syllables = task.word.syllables.split('-').map(syllable => syllable.toLocaleUpperCase('sk-SK'));
      expect(task.slots.map(slot => slot ?? task.answers[0])).toEqual(syllables);
      expect(task.slots.filter(slot => slot === null)).toHaveLength(1);
      expect(task.choices).toContain(task.answers[0]);
    }
  });

  it('blanks as many letters as the setting asks and every blanked letter is a choice', () => {
    for (const task of allTasks(12, content({ completeLetterMissingCount: 2 }))) {
      if (task.kind !== 'complete-letter') continue;
      expect(task.slots.filter(slot => slot === null)).toHaveLength(task.answers.length);
      expect(task.answers.length).toBe(Math.min(2, task.slots.length));
      for (const answer of task.answers) expect(task.choices).toContain(answer);
      expect(task.choices.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('keeps accented letters out when accents are off', () => {
    for (const task of allTasks(13, content({ alphabetAccents: false }))) {
      if (task.kind !== 'first-letter' && task.kind !== 'complete-letter') continue;
      for (const choice of task.choices) expect(choice.normalize('NFD')).toBe(choice);
    }
  });
});

describe('buildNumberChoices', () => {
  it('returns distinct values within bounds even at the edge of a small range', () => {
    const random = createSeededRandom(1);
    for (let target = 1; target <= 5; target += 1) {
      const choices = buildNumberChoices(target, 1, 5, random);
      expect(new Set(choices).size).toBe(3);
      expect(choices.every(value => value >= 1 && value <= 5)).toBe(true);
      expect(choices).toContain(target);
    }
  });
});
