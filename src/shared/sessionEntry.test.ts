import { afterEach, describe, expect, it, vi } from 'vitest';

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

describe('session entry and history navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('a popstate event disarms an entry whose tap never navigated', async () => {
    // Vitest runs in Node: an EventTarget stands in for the browser window.
    const fakeWindow = new EventTarget();
    vi.stubGlobal('window', fakeWindow);
    const { armSessionEntry, isSessionEntryArmed } = await loadSessionEntry();

    // A ctrl- or cmd-click arms the card's game but opens a new tab, so no route ever mounts.
    armSessionEntry('ALPHABET');
    expect(isSessionEntryArmed('ALPHABET')).toBe(true);

    // The browser's Back or Forward later fires popstate.
    fakeWindow.dispatchEvent(new Event('popstate'));
    expect(isSessionEntryArmed('ALPHABET')).toBe(false);
  });

  it('imports without a window, as in Node', async () => {
    vi.stubGlobal('window', undefined);
    const { armSessionEntry, isSessionEntryArmed } = await loadSessionEntry();

    armSessionEntry('NUMBERS');
    expect(isSessionEntryArmed('NUMBERS')).toBe(true);
  });
});
