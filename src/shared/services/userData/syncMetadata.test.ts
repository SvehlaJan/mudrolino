import { describe, expect, it, vi } from 'vitest';
import { saveAppSettings } from '../appSettingsStore';
import { saveSettings } from '../settingsService';
import { createDefaultSettings } from '../../settings/settingsRegistry';
import { readAudioStamps, readContentDeletions, readSettingsStamp, recordContentDeletion, stampAudioDeleted, stampAudioSaved } from './syncMetadata';

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe('settings change stamps', () => {
  it('leave the first save of defaults unstamped, so a fresh device never outranks a backup', () => {
    const storage = memoryStorage();
    saveAppSettings({ locale: 'sk', fontFamily: 'nunito' }, storage);
    saveSettings(createDefaultSettings(), storage);
    expect(readSettingsStamp('appSettings', storage)).toBe(0);
    expect(readSettingsStamp('gameSettings', storage)).toBe(0);
  });

  it('stamp a real change and ignore saving the same value again', () => {
    const storage = memoryStorage();
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    saveAppSettings({ locale: 'sk', fontFamily: 'nunito' }, storage);
    saveAppSettings({ locale: 'sk', fontFamily: 'shantell' }, storage);
    expect(readSettingsStamp('appSettings', storage)).toBe(1000);
    vi.spyOn(Date, 'now').mockReturnValue(2000);
    saveAppSettings({ locale: 'sk', fontFamily: 'shantell' }, storage);
    expect(readSettingsStamp('appSettings', storage)).toBe(1000);
    vi.restoreAllMocks();
  });
});

describe('audio and content stamps', () => {
  it('track the latest save or deletion of each recording', () => {
    const storage = memoryStorage();
    stampAudioSaved('sk/words/a', 5, storage);
    stampAudioDeleted('sk/words/a', 7, storage);
    expect(readAudioStamps(storage)).toEqual({ updated: {}, deleted: { 'sk/words/a': 7 } });
    stampAudioSaved('sk/words/a', 9, storage);
    expect(readAudioStamps(storage)).toEqual({ updated: { 'sk/words/a': 9 }, deleted: {} });
  });

  it('record content deletions per locale and kind', () => {
    const storage = memoryStorage();
    recordContentDeletion('sk', 'words', 'w1', 3, storage);
    recordContentDeletion('sk', 'praises', 'p1', 4, storage);
    expect(readContentDeletions('sk', storage)).toEqual({ words: { w1: 3 }, praises: { p1: 4 } });
    expect(readContentDeletions('cs', storage)).toEqual({ words: {}, praises: {} });
  });

  it('treat unreadable metadata as empty instead of failing', () => {
    const storage = memoryStorage();
    storage.setItem('hrave-ucenie-audio-stamps', 'not json');
    expect(readAudioStamps(storage)).toEqual({ updated: {}, deleted: {} });
  });
});
