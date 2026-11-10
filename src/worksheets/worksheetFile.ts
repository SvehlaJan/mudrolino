/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const WORKSHEET_FILE_COUNTER_KEY = 'mudrolino-worksheet-file-counter';

const FILE_STEM: Record<string, string> = {
  sk: 'pracovne-listy',
  cs: 'pracovni-listy',
};

/** ASCII-only, so the name survives every file system and share sheet: Mudrolino-pracovne-listy-007. */
export function worksheetFileBaseName(locale: string, number: number): string {
  const stem = FILE_STEM[locale] ?? FILE_STEM.sk;
  return `Mudrolino-${stem}-${String(number).padStart(3, '0')}`;
}

type CounterStorage = Pick<Storage, 'getItem' | 'setItem'>;

function defaultStorage(): CounterStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

/**
 * Returns the next file number and remembers it, so each download gets a new name. Without
 * storage (private mode, blocked site data) it falls back to a time-based number, which is
 * still unlikely to repeat.
 */
export function takeNextWorksheetFileNumber(
  storage: CounterStorage | null = defaultStorage(),
  now: () => number = Date.now,
): number {
  try {
    if (!storage) throw new Error('No storage');
    const previous = Number.parseInt(storage.getItem(WORKSHEET_FILE_COUNTER_KEY) ?? '0', 10);
    const next = Number.isSafeInteger(previous) && previous > 0 ? previous + 1 : 1;
    storage.setItem(WORKSHEET_FILE_COUNTER_KEY, String(next));
    return next;
  } catch {
    return Math.floor(now() / 1000) % 1_000_000;
  }
}
