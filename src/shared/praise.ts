import type { PraiseEntry } from './types';

const FALLBACK_PRAISE: PraiseEntry = { emoji: '🌟', text: 'Výborne!', audioKey: 'vyborne' };

/** Select once so the displayed praise and its audio share the same entry. */
export function pickPraise(entries: readonly PraiseEntry[]): PraiseEntry {
  return entries[Math.floor(Math.random() * entries.length)] ?? FALLBACK_PRAISE;
}
