/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = 'hrave-ucenie-app-settings';

export type AppFontFamily = 'nunito' | 'shantell';

export interface AppSettings {
  locale: string; // BCP 47: 'sk' | 'cs' | 'en' | 'fr' | ...
  fontFamily: AppFontFamily;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  locale: 'sk',
  fontFamily: 'nunito',
};

export function loadAppSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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

export function saveAppSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silent fail: private/incognito mode or storage quota exceeded
  }
}

export function applyFontFamily(font: AppFontFamily): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.font = font;
  }
}
