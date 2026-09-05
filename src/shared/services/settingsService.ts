import { GameSettings } from '../types';

const STORAGE_KEY = 'hrave-ucenie-settings';

export const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
  completeLetterMissingCount: 1,
  compareRange: { start: 1, end: 5 },
  compareMode: 'objects',
  additionSumRange: 5,
  additionRepresentation: 'objects',
};

function isValidRange(value: unknown): value is { start: number; end: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).start === 'number' &&
    typeof (value as Record<string, unknown>).end === 'number'
  );
}

function isValidCompleteLetterMissingCount(value: unknown): value is GameSettings['completeLetterMissingCount'] {
  return value === 1 || value === 2 || value === 'adaptive';
}

function isValidCompareMode(value: unknown): value is GameSettings['compareMode'] {
  return value === 'objects' || value === 'numerals';
}

function isValidAdditionSumRange(value: unknown): value is GameSettings['additionSumRange'] {
  return value === 5 || value === 10 || value === 20 || value === 100;
}

function isValidAdditionRepresentation(value: unknown): value is GameSettings['additionRepresentation'] {
  return value === 'objects' || value === 'numerals';
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    return {
      music: typeof stored.music === 'boolean' ? stored.music : DEFAULT_SETTINGS.music,
      alphabetGridSize: [4, 6, 8].includes(stored.alphabetGridSize as number) ? stored.alphabetGridSize as 4 | 6 | 8 : DEFAULT_SETTINGS.alphabetGridSize,
      alphabetAccents: typeof stored.alphabetAccents === 'boolean' ? stored.alphabetAccents : DEFAULT_SETTINGS.alphabetAccents,
      syllablesGridSize: [4, 6].includes(stored.syllablesGridSize as number) ? stored.syllablesGridSize as 4 | 6 : DEFAULT_SETTINGS.syllablesGridSize,
      numbersRange: isValidRange(stored.numbersRange) ? stored.numbersRange : DEFAULT_SETTINGS.numbersRange,
      countingRange: isValidRange(stored.countingRange) ? stored.countingRange : DEFAULT_SETTINGS.countingRange,
      completeLetterMissingCount: isValidCompleteLetterMissingCount(stored.completeLetterMissingCount)
        ? stored.completeLetterMissingCount
        : DEFAULT_SETTINGS.completeLetterMissingCount,
      compareRange: isValidRange(stored.compareRange) ? stored.compareRange : DEFAULT_SETTINGS.compareRange,
      compareMode: isValidCompareMode(stored.compareMode) ? stored.compareMode : DEFAULT_SETTINGS.compareMode,
      additionSumRange: isValidAdditionSumRange(stored.additionSumRange) ? stored.additionSumRange : DEFAULT_SETTINGS.additionSumRange,
      additionRepresentation: isValidAdditionRepresentation(stored.additionRepresentation) ? stored.additionRepresentation : DEFAULT_SETTINGS.additionRepresentation,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silent fail: private/incognito mode or storage quota exceeded
  }
}

/** Ranges at which individual objects stop being sensible to render/count, forcing numerals. */
export function additionRangeForcesNumerals(range: GameSettings['additionSumRange']): boolean {
  return range === 20 || range === 100;
}

/**
 * Applies a new additionSumRange, auto-switching additionRepresentation to 'numerals'
 * if the new range makes 'objects' invalid (20 or 100). One-directional: dropping the
 * range back to 5/10 later does NOT restore 'objects' automatically — whatever is
 * stored is always exactly what's displayed, with no separate remembered preference.
 */
export function applyAdditionSumRangeChange(
  settings: GameSettings,
  nextRange: GameSettings['additionSumRange'],
): GameSettings {
  const forcesNumerals = additionRangeForcesNumerals(nextRange);
  return {
    ...settings,
    additionSumRange: nextRange,
    additionRepresentation: forcesNumerals ? 'numerals' : settings.additionRepresentation,
  };
}
