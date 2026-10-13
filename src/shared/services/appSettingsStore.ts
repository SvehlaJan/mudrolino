/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { detectLocale, isSupportedLocale } from '../i18n';
import { writeSettingsStamp } from './userData/syncMetadata';

export const APP_SETTINGS_STORAGE_KEY = 'hrave-ucenie-app-settings';
const STORAGE_KEY = APP_SETTINGS_STORAGE_KEY;

export type SaveResult = { ok: true } | { ok: false; reason: 'storage-unavailable' };

export interface AppSettingsStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export type AppFontFamily = 'nunito' | 'shantell';

export interface AppSettings {
  locale: string; // one of SUPPORTED_LOCALES in src/shared/i18n.ts
  fontFamily: AppFontFamily;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  locale: 'sk',
  fontFamily: 'nunito',
};

function getDefaultStorage(): AppSettingsStorage | null {
  try {
    return typeof globalThis.localStorage === 'undefined' ? null : globalThis.localStorage;
  } catch {
    return null;
  }
}

/** First start: Czech browsers get Czech, everyone else Slovak. */
function firstStartSettings(): AppSettings {
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  return { ...DEFAULT_APP_SETTINGS, locale: detectLocale(languages) };
}

export function loadAppSettings(storage: AppSettingsStorage | null = getDefaultStorage()): AppSettings {
  try {
    if (!storage) return firstStartSettings();
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return firstStartSettings();
    const stored = JSON.parse(raw) as Record<string, unknown>;
    return {
      locale: isSupportedLocale(stored.locale) ? stored.locale : DEFAULT_APP_SETTINGS.locale,
      fontFamily: stored.fontFamily === 'shantell' ? 'shantell' : DEFAULT_APP_SETTINGS.fontFamily,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(
  settings: AppSettings,
  storage: AppSettingsStorage | null = getDefaultStorage(),
): SaveResult {
  try {
    if (!storage) return { ok: false, reason: 'storage-unavailable' };
    const serialized = JSON.stringify(settings);
    const previous = storage.getItem(STORAGE_KEY);
    // Only replacing a stored value moves the change stamp. The first save of
    // defaults when the app opens is not a change, so a fresh device never looks
    // newer than a backup or another device.
    if (previous !== serialized) {
      storage.setItem(STORAGE_KEY, serialized);
      if (previous !== null) writeSettingsStamp('appSettings', Date.now(), storage);
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

export function applyFontFamily(font: AppFontFamily): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.font = font;
  }
}
