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

// Verify non-DOM safety
applyFontFamily('nunito');

// Verify DOM mutation behavior
const mockDocument = { documentElement: { dataset: {} as Record<string, string> } };
(global as unknown as { document: typeof mockDocument }).document = mockDocument;

applyFontFamily('shantell');
if (mockDocument.documentElement.dataset.font !== 'shantell') {
  throw new Error(`Expected dataset.font to be 'shantell', got '${mockDocument.documentElement.dataset.font}'`);
}

delete (global as unknown as { document?: unknown }).document;

console.log('✓ appSettingsStore font tests passed');
