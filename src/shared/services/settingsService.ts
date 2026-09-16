import { GameSettings } from '../types';
import { additionRangeForcesNumerals as registryAdditionRangeForcesNumerals, DEFAULT_GAME_SETTINGS, SETTINGS_REGISTRY } from '../settings/settingsRegistry';

const STORAGE_KEY = 'hrave-ucenie-settings';

export const DEFAULT_SETTINGS = DEFAULT_GAME_SETTINGS;

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    return SETTINGS_REGISTRY.reduce((settings, definition) => {
      const value = stored[definition.id];
      return definition.isValid(value) ? definition.apply(settings, value).settings : settings;
    }, { ...DEFAULT_SETTINGS });
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): { ok: true } | { ok: false; reason: 'storage-unavailable' } {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

/** Ranges at which individual objects stop being sensible to render/count, forcing numerals. */
export function additionRangeForcesNumerals(range: GameSettings['additionSumRange']): boolean {
  return registryAdditionRangeForcesNumerals(range);
}

/**
 * Applies a new additionSumRange, auto-switching additionRepresentation to 'numerals'
 * if the new range makes 'objects' invalid (20 or 100). One-directional: dropping the
 * range back to 5/10 later does NOT restore 'objects' automatically — whatever is
 * stored is always exactly what's displayed, with no separate remembered preference.
 */
export function applyAdditionSumRangeChange(
  settings: GameSettings,
  nextRange: GameSettings['additionSumRange'],
): GameSettings {
  return SETTINGS_REGISTRY.find(setting => setting.id === 'additionSumRange')!.apply(settings, nextRange).settings;
}
