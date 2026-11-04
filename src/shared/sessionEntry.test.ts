import { describe, expect, it, vi } from 'vitest';

/** A fresh module graph stands in for a fresh page load: module state is the only thing that
 * survives a client-side navigation and the only thing a reload discards. */
async function loadSessionEntry() {
  vi.resetModules();
  return import('./sessionEntry');
}

describe('session entry', () => {
  it('a fresh page load has no armed entry', async () => {
    const before = await loadSessionEntry();
    before.armSessionEntry('ALPHABET');
    expect(before.isSessionEntryArmed('ALPHABET')).toBe(true);

    const afterReload = await loadSessionEntry();
    expect(afterReload.isSessionEntryArmed('ALPHABET')).toBe(false);
  });

  it('arming is per game and survives repeated reads', async () => {
    const { armSessionEntry, isSessionEntryArmed } = await loadSessionEntry();
    armSessionEntry('ALPHABET');

    // React StrictMode runs a state initialiser twice in development; a read must not consume the entry.
    expect(isSessionEntryArmed('ALPHABET')).toBe(true);
    expect(isSessionEntryArmed('ALPHABET')).toBe(true);
    expect(isSessionEntryArmed('NUMBERS')).toBe(false);
  });

  it('disarming clears it', async () => {
    const { armSessionEntry, disarmSessionEntry, isSessionEntryArmed } = await loadSessionEntry();
    armSessionEntry('ALPHABET');
    disarmSessionEntry();

    expect(isSessionEntryArmed('ALPHABET')).toBe(false);
  });
});
