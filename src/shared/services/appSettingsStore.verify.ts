import { DEFAULT_APP_SETTINGS, loadAppSettings, saveAppSettings, type AppFontFamily, applyFontFamily } from './appSettingsStore';

const store: Record<string, string> = {};

// Test default with injected storage, so this verifier never depends on browser globals.
const initial = loadAppSettings({
  getItem: () => null,
  setItem: () => undefined,
});
if (initial.fontFamily !== 'nunito' || initial.fontFamily !== DEFAULT_APP_SETTINGS.fontFamily) {
  throw new Error(`Expected default fontFamily to be 'nunito', got '${initial.fontFamily}'`);
}

// Test save & load preserves the existing key and schema.
const targetFont: AppFontFamily = 'shantell';
const roundTripStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
};
const saved = saveAppSettings({ locale: 'sk', fontFamily: targetFont }, roundTripStorage);
if (!saved.ok) {
  throw new Error('Expected injected storage save to succeed');
}
if (store['hrave-ucenie-app-settings'] !== JSON.stringify({ locale: 'sk', fontFamily: targetFont })) {
  throw new Error('Expected save to preserve the app settings storage key and schema');
}
const updated = loadAppSettings(roundTripStorage);
if (updated.fontFamily !== 'shantell') {
  throw new Error(`Expected fontFamily 'shantell', got '${updated.fontFamily}'`);
}

// Test invalid fallback
store['hrave-ucenie-app-settings'] = JSON.stringify({ locale: 'sk', fontFamily: 'comic-sans' });
const fallback = loadAppSettings(roundTripStorage);
if (fallback.fontFamily !== 'nunito') {
  throw new Error(`Expected fallback to 'nunito', got '${fallback.fontFamily}'`);
}

// Storage failures must be visible to automatic-save UI instead of being swallowed.
const failure = saveAppSettings(DEFAULT_APP_SETTINGS, {
  getItem: () => null,
  setItem() { throw new DOMException('quota'); },
});
if (failure.ok) {
  throw new Error('Storage failure must be observable');
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
