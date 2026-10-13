/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { audioOverrideStore } from '../audioOverrideStore';
import { APP_SETTINGS_STORAGE_KEY, loadAppSettings } from '../appSettingsStore';
import { LocalContentRepository, storedContentLocales } from '../localContentRepository';
import { GAME_SETTINGS_STORAGE_KEY, loadSettings } from '../settingsService';
import type { Stamped } from './merge';
import { mergeSnapshots, type UserDataSnapshot } from './snapshot';
import { readSettingsStamp, writeSettingsStamp, type SettingsDocument } from './syncMetadata';

function readSettingsDocument(key: string, name: SettingsDocument): Stamped<unknown> | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' ? { value, updatedAt: readSettingsStamp(name) } : null;
  } catch {
    return null;
  }
}

/** Writes a settings document only after the app's own loader has validated it. */
function writeSettingsDocument(key: string, name: SettingsDocument, document: Stamped<unknown>, validate: (raw: string) => unknown) {
  const validated = validate(JSON.stringify(document.value));
  localStorage.setItem(key, JSON.stringify(validated));
  writeSettingsStamp(name, document.updatedAt);
}

/** Reads everything the family stored on this device. */
export async function readLocalUserData(): Promise<UserDataSnapshot> {
  const content: UserDataSnapshot['content'] = {};
  for (const locale of storedContentLocales()) {
    content[locale] = await new LocalContentRepository(locale).readAll();
  }
  return {
    gameSettings: readSettingsDocument(GAME_SETTINGS_STORAGE_KEY, 'gameSettings'),
    appSettings: readSettingsDocument(APP_SETTINGS_STORAGE_KEY, 'appSettings'),
    content,
    audio: await audioOverrideStore.readAll(),
  };
}

/**
 * Merges a backup into this device: the newer copy of each setting, word,
 * praise and recording wins, so nothing recorded on either side is lost.
 * Recordings are written first in a single transaction; if that fails,
 * nothing else changes.
 */
export async function restoreUserData(incoming: UserDataSnapshot): Promise<UserDataSnapshot> {
  const merged = mergeSnapshots(await readLocalUserData(), incoming);
  await audioOverrideStore.replaceAll(merged.audio.records, merged.audio.deleted);
  for (const [locale, localeContent] of Object.entries(merged.content)) {
    await new LocalContentRepository(locale).replaceAll(localeContent);
  }
  const memoryStorage = (raw: string) => ({ getItem: () => raw, setItem: () => undefined });
  if (merged.gameSettings) {
    writeSettingsDocument(GAME_SETTINGS_STORAGE_KEY, 'gameSettings', merged.gameSettings, raw => loadSettings(memoryStorage(raw)));
  }
  if (merged.appSettings) {
    writeSettingsDocument(APP_SETTINGS_STORAGE_KEY, 'appSettings', merged.appSettings, raw => loadAppSettings(memoryStorage(raw)));
  }
  return merged;
}
