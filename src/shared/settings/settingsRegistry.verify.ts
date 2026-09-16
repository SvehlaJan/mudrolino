import { GAME_DEFINITIONS } from '../gameCatalog';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../services/settingsService';
import { SETTING_IDS } from './settingIds';
import { SETTINGS_REGISTRY, getSettingsForTarget } from './settingsRegistry';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

assert(SETTINGS_REGISTRY.length === SETTING_IDS.length, 'registry defines every setting exactly once');
assert(new Set(SETTINGS_REGISTRY.map(setting => setting.id)).size === SETTING_IDS.length, 'registry setting ids are unique');
for (const id of SETTING_IDS) {
  assert(SETTINGS_REGISTRY.some(setting => setting.id === id), `${id} is registered`);
}

for (const game of GAME_DEFINITIONS) {
  const registered = getSettingsForTarget(game.id).map(setting => setting.id);
  assert(registered.length === game.settings.length, `${game.id} has every catalog setting`);
  for (const id of game.settings) assert(registered.includes(id), `${game.id} exposes ${id}`);
}

const numbersRange = SETTINGS_REGISTRY.find(setting => setting.id === 'numbersRange')!;
assert(
  numbersRange.summarize({ ...DEFAULT_SETTINGS, numbersRange: { start: 1, end: 20 } }) === '1 - 20',
  'summaries read their value from the complete settings object',
);
assert(numbersRange.isValid({ start: 1, end: 5 }), 'numbers accepts 1-5');
assert(numbersRange.isValid({ start: 1, end: 20 }), 'numbers accepts 1-20');
assert(!numbersRange.isValid({ start: 2, end: 5 }), 'numbers rejects a non-canonical start');
assert(!numbersRange.isValid({ start: 1, end: 6 }), 'numbers rejects an unsupported end');
assert(
  numbersRange.summarize({ ...DEFAULT_SETTINGS, numbersRange: { end: 20, start: 1 } }) === '1 - 20',
  'range summaries use structural equality regardless of property order',
);
const rejectedRange = numbersRange.apply(DEFAULT_SETTINGS, { start: 2, end: 20 });
assert(rejectedRange.rejected === true, 'invalid setting values are rejected');
assert(rejectedRange.settings.numbersRange.end === DEFAULT_SETTINGS.numbersRange.end, 'invalid settings are a no-op');
const rejectedGrid = SETTINGS_REGISTRY.find(setting => setting.id === 'alphabetGridSize')!.apply(DEFAULT_SETTINGS, false);
assert(rejectedGrid.rejected === true, 'invalid primitive setting values are rejected');

const mutableApplyResult = numbersRange.apply(DEFAULT_SETTINGS, { start: 1, end: 20 });
mutableApplyResult.settings.numbersRange.end = 5;
assert(DEFAULT_SETTINGS.numbersRange.end === 10, 'apply results do not share default range objects');
const rangeOption = numbersRange.options.find(option => typeof option.value === 'object')!;
assert(Object.isFrozen(rangeOption) && Object.isFrozen(rangeOption.value), 'registry options are immutable templates');

const additionSumRange = SETTINGS_REGISTRY.find(setting => setting.id === 'additionSumRange')!;
const forced = additionSumRange.apply({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 20);
assert(forced.settings.additionSumRange === 20, 'range application updates the setting');
assert(forced.settings.additionRepresentation === 'numerals', 'range 20 forces numerals');
assert(forced.notice === 'Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.', 'forced range reports the Slovak notice');

const storage = {
  getItem: () => JSON.stringify({ ...DEFAULT_SETTINGS, alphabetGridSize: 4, numbersRange: { start: 2, end: 10 }, compareMode: 'legacy' }),
  setItem: () => { throw new Error('quota'); },
};
const loaded = loadSettings(storage);
assert(loaded.numbersRange.end === DEFAULT_SETTINGS.numbersRange.end, 'invalid stored ranges fall back individually');
assert(loaded.compareMode === DEFAULT_SETTINGS.compareMode, 'legacy stored values fall back individually');
assert(loaded.alphabetGridSize === 4, 'valid stored values remain intact');
assert(saveSettings(DEFAULT_SETTINGS, storage).ok === false, 'storage write failures are reported');
const unavailable = loadSettings(null);
unavailable.numbersRange.end = 5;
assert(DEFAULT_SETTINGS.numbersRange.end === 10, 'unavailable storage returns an isolated default clone');
assert(saveSettings(DEFAULT_SETTINGS, null).ok === false, 'unavailable storage reports an explicit save failure');

console.log('settingsRegistry verify tests passed successfully!');
