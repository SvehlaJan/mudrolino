import { DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings, type AppFontFamily, applyFontFamily } from './appSettingsStore';

// Mock localStorage
const store: Record<string, string> = {};
global.localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
} as unknown as Storage;

// Test default
const initial = loadAppSettings();
if (initial.fontFamily !== 'nunito' || initial.fontFamily !== DEFAULT_APP_SETTINGS.fontFamily) {
  throw new Error(`Expected default fontFamily to be 'nunito', got '${initial.fontFamily}'`);
}

// Test save & load
const targetFont: AppFontFamily = 'shantell';
saveAppSettings({ locale: 'sk', fontFamily: targetFont });
const updated = loadAppSettings();
if (updated.fontFamily !== 'shantell') {
  throw new Error(`Expected fontFamily 'shantell', got '${updated.fontFamily}'`);
}

// Test invalid fallback
store['hrave-ucenie-app-settings'] = JSON.stringify({ locale: 'sk', fontFamily: 'comic-sans' });
const fallback = loadAppSettings();
if (fallback.fontFamily !== 'nunito') {
  throw new Error(`Expected fallback to 'nunito', got '${fallback.fontFamily}'`);
}

// Test applyFontFamily safe in non-DOM and DOM environments
applyFontFamily('nunito');
if (typeof document !== 'undefined') {
  if (document.documentElement.dataset.font !== 'nunito') {
    throw new Error(`Expected document dataset.font to be 'nunito'`);
  }
}

console.log('✓ appSettingsStore font tests passed');
