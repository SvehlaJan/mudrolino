import { GameSettings } from '../types';

const STORAGE_KEY = 'hrave-ucenie-settings';

export const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
};

function isValidRange(value: unknown): value is { start: number; end: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).start === 'number' &&
    typeof (value as Record<string, unknown>).end === 'number'
  );
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
