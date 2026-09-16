/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'hrave-ucenie-app-settings';

export type SaveResult = { ok: true } | { ok: false; reason: 'storage-unavailable' };

export interface AppSettingsStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export type AppFontFamily = 'nunito' | 'shantell';

export interface AppSettings {
  locale: string; // BCP 47: 'sk' | 'cs' | 'en' | 'fr' | ...
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

export function loadAppSettings(storage: AppSettingsStorage | null = getDefaultStorage()): AppSettings {
  try {
    if (!storage) return DEFAULT_APP_SETTINGS;
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    return {
      locale: typeof stored.locale === 'string' ? stored.locale : DEFAULT_APP_SETTINGS.locale,
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
    storage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
