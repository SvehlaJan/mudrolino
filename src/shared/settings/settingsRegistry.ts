import { GAME_DEFINITIONS_BY_ID } from '../gameCatalog';
import type { GameSettings, SettingsTarget } from '../types';
import { SETTING_IDS, type SettingId } from './settingIds';

export type SettingRange = { start: number; end: number };
export type SettingValue = boolean | number | string | SettingRange;

export interface SettingOption {
  value: SettingValue;
  label: string;
}

export interface SettingApplyResult {
  settings: GameSettings;
  notice?: string;
  /** Invalid values are rejected as an isolated no-op, never coerced or persisted. */
  rejected?: true;
}

export interface SettingDefinition {
  id: SettingId;
  label: string;
  description: string;
  kind: 'switch' | 'radio';
  options: readonly SettingOption[];
  read: (settings: GameSettings) => SettingValue;
  apply: (settings: GameSettings, value: SettingValue) => SettingApplyResult;
  summarize: (settings: GameSettings) => string;
  isValid: (value: unknown) => value is SettingValue;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = Object.freeze({
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: Object.freeze({ start: 1, end: 10 }),
  countingRange: Object.freeze({ start: 1, end: 5 }),
  completeLetterMissingCount: 1,
  compareRange: Object.freeze({ start: 1, end: 5 }),
  compareMode: 'objects',
  additionSumRange: 5,
  additionRepresentation: 'objects',
}) as GameSettings;

export function cloneSettings(settings: GameSettings): GameSettings {
  return {
    ...settings,
    numbersRange: { ...settings.numbersRange },
    countingRange: { ...settings.countingRange },
    compareRange: { ...settings.compareRange },
  };
}

export function createDefaultSettings(): GameSettings {
  return cloneSettings(DEFAULT_GAME_SETTINGS);
}

export const ADDITION_NUMERALS_NOTICE = 'Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.';

export function additionRangeForcesNumerals(range: GameSettings['additionSumRange']): boolean {
  return range === 20 || range === 100;
}

const range = (end: number): SettingRange => ({ start: 1, end });
const isRange = (value: SettingValue): value is SettingRange => typeof value === 'object' && value !== null;
const cloneValue = (value: SettingValue): SettingValue => isRange(value) ? { ...value } : value;
const isExactRange = (value: unknown, ends: readonly number[]): value is SettingRange =>
  typeof value === 'object' && value !== null &&
  (value as SettingRange).start === 1 && ends.includes((value as SettingRange).end);
const isOneOf = <T extends SettingValue>(value: unknown, allowed: readonly T[]): value is T =>
  allowed.includes(value as T);
const valuesEqual = (left: SettingValue, right: SettingValue): boolean =>
  isRange(left) && isRange(right)
    ? left.start === right.start && left.end === right.end
    : left === right;
const optionLabel = (options: readonly SettingOption[], value: SettingValue): string =>
  options.find(option => valuesEqual(option.value, value))?.label ?? String(value);
const freezeOptions = (options: readonly SettingOption[]): readonly SettingOption[] => Object.freeze(options.map(option => Object.freeze({
  ...option,
  value: isRange(option.value) ? Object.freeze({ ...option.value }) : option.value,
})));
const rejected = (settings: GameSettings): SettingApplyResult => ({ settings: cloneSettings(settings), rejected: true });
const plainApply = <K extends SettingId>(id: K, isValid: (value: unknown) => value is SettingValue) =>
  (settings: GameSettings, value: SettingValue): SettingApplyResult =>
    isValid(value)
      ? { settings: { ...cloneSettings(settings), [id]: cloneValue(value) } as GameSettings }
      : rejected(settings);
const withValidation = (
  isValid: (value: unknown) => value is SettingValue,
  apply: (settings: GameSettings, value: SettingValue) => SettingApplyResult,
) => (settings: GameSettings, value: SettingValue): SettingApplyResult => isValid(value) ? apply(settings, value) : rejected(settings);

const settingsRegistry: SettingDefinition[] = [
  {
    id: 'alphabetAccents', label: 'Písmená s dĺžňami a mäkčeňmi', description: 'Rozšíriť hru o slovenské znaky.', kind: 'switch',
    options: [{ value: false, label: 'Vypnuté' }, { value: true, label: 'Zapnuté' }],
    read: settings => settings.alphabetAccents, apply: plainApply('alphabetAccents', value => isOneOf(value, [false, true])), summarize: settings => settings.alphabetAccents ? 'Zapnuté' : 'Vypnuté',
    isValid: value => isOneOf(value, [false, true]),
  },
  {
    id: 'alphabetGridSize', label: 'Počet kariet', description: 'Vyberte počet kariet v hre.', kind: 'radio',
    options: [4, 6, 8].map(value => ({ value, label: String(value) })),
    read: settings => settings.alphabetGridSize, apply: plainApply('alphabetGridSize', value => isOneOf(value, [4, 6, 8])), summarize: settings => String(settings.alphabetGridSize),
    isValid: value => isOneOf(value, [4, 6, 8]),
  },
  {
    id: 'syllablesGridSize', label: 'Počet kariet', description: 'Vyberte počet kariet v hre.', kind: 'radio',
    options: [4, 6].map(value => ({ value, label: String(value) })),
    read: settings => settings.syllablesGridSize, apply: plainApply('syllablesGridSize', value => isOneOf(value, [4, 6])), summarize: settings => String(settings.syllablesGridSize),
    isValid: value => isOneOf(value, [4, 6]),
  },
  {
    id: 'numbersRange', label: 'Rozsah čísel', description: 'Vyberte rozsah čísel pre hru.', kind: 'radio',
    options: [5, 10, 20].map(end => ({ value: range(end), label: `1 - ${end}` })),
    read: settings => settings.numbersRange, apply: plainApply('numbersRange', value => isExactRange(value, [5, 10, 20])), summarize: settings => optionLabel(SETTINGS_REGISTRY.find(setting => setting.id === 'numbersRange')!.options, settings.numbersRange),
    isValid: value => isExactRange(value, [5, 10, 20]),
  },
  {
    id: 'countingRange', label: 'Rozsah počítania', description: 'Vyberte rozsah počítania predmetov.', kind: 'radio',
    options: [5, 10].map(end => ({ value: range(end), label: `1 - ${end}` })),
    read: settings => settings.countingRange, apply: plainApply('countingRange', value => isExactRange(value, [5, 10])), summarize: settings => optionLabel(SETTINGS_REGISTRY.find(setting => setting.id === 'countingRange')!.options, settings.countingRange),
    isValid: value => isExactRange(value, [5, 10]),
  },
  {
    id: 'completeLetterMissingCount', label: 'Chýbajúce písmená', description: 'Vyberte, koľko písmen má v slove chýbať.', kind: 'radio',
    options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 'adaptive', label: 'Podľa dĺžky' }],
    read: settings => settings.completeLetterMissingCount, apply: plainApply('completeLetterMissingCount', value => isOneOf(value, [1, 2, 'adaptive'])), summarize: settings => settings.completeLetterMissingCount === 'adaptive' ? 'Podľa dĺžky' : String(settings.completeLetterMissingCount),
    isValid: value => isOneOf(value, [1, 2, 'adaptive']),
  },
  {
    id: 'compareRange', label: 'Rozsah čísel', description: 'Vyberte rozsah čísel pre porovnávanie.', kind: 'radio',
    options: [5, 10].map(end => ({ value: range(end), label: `1 - ${end}` })),
    read: settings => settings.compareRange, apply: plainApply('compareRange', value => isExactRange(value, [5, 10])), summarize: settings => optionLabel(SETTINGS_REGISTRY.find(setting => setting.id === 'compareRange')!.options, settings.compareRange),
    isValid: value => isExactRange(value, [5, 10]),
  },
  {
    id: 'compareMode', label: 'Zobrazenie', description: 'Predmety na počítanie, alebo napísané čísla.', kind: 'radio',
    options: [{ value: 'objects', label: 'Predmety' }, { value: 'numerals', label: 'Čísla' }],
    read: settings => settings.compareMode, apply: plainApply('compareMode', value => isOneOf(value, ['objects', 'numerals'])), summarize: settings => settings.compareMode === 'objects' ? 'Predmety' : 'Čísla',
    isValid: value => isOneOf(value, ['objects', 'numerals']),
  },
  {
    id: 'additionSumRange', label: 'Rozsah súčtu', description: 'Najväčší možný súčet.', kind: 'radio',
    options: [5, 10, 20, 100].map(value => ({ value, label: String(value) })),
    read: settings => settings.additionSumRange,
    apply: withValidation(value => isOneOf(value, [5, 10, 20, 100]), (settings, value) => {
      const additionSumRange = value as GameSettings['additionSumRange'];
      const forcesNumerals = additionRangeForcesNumerals(additionSumRange);
      return {
        settings: { ...cloneSettings(settings), additionSumRange, additionRepresentation: forcesNumerals ? 'numerals' : settings.additionRepresentation },
        ...(forcesNumerals && settings.additionRepresentation !== 'numerals' ? { notice: ADDITION_NUMERALS_NOTICE } : {}),
      };
    }),
    summarize: settings => String(settings.additionSumRange), isValid: value => isOneOf(value, [5, 10, 20, 100]),
  },
  {
    id: 'additionRepresentation', label: 'Zobrazenie', description: 'Predmety na počítanie, alebo napísané čísla.', kind: 'radio',
    options: [{ value: 'objects', label: 'Predmety' }, { value: 'numerals', label: 'Čísla' }],
    read: settings => settings.additionRepresentation,
    apply: withValidation(value => isOneOf(value, ['objects', 'numerals']), (settings, value) => {
      const forceNumerals = additionRangeForcesNumerals(settings.additionSumRange);
      return {
        settings: { ...cloneSettings(settings), additionRepresentation: forceNumerals ? 'numerals' : value as GameSettings['additionRepresentation'] },
        ...(forceNumerals && value === 'objects' ? { notice: ADDITION_NUMERALS_NOTICE } : {}),
      };
    }),
    summarize: settings => settings.additionRepresentation === 'objects' ? 'Predmety' : 'Čísla', isValid: value => isOneOf(value, ['objects', 'numerals']),
  },
];

export const SETTINGS_REGISTRY: readonly SettingDefinition[] = Object.freeze(
  settingsRegistry.map(setting => Object.freeze({ ...setting, options: freezeOptions(setting.options) })),
);

export const SETTINGS_BY_ID = Object.fromEntries(SETTINGS_REGISTRY.map(setting => [setting.id, setting])) as Record<SettingId, SettingDefinition>;

export function getSettingsForTarget(target: SettingsTarget): readonly SettingDefinition[] {
  if (target === 'home') return [];
  return GAME_DEFINITIONS_BY_ID[target].settings.map(id => SETTINGS_BY_ID[id]);
}

export const SETTINGS_SUBTITLES: Record<SettingsTarget, string> = {
  home: 'Nastavenia', ALPHABET: 'Hra s písmenami', SYLLABLES: 'Hra so slabikami', NUMBERS: 'Hra s číslami',
  COUNTING_ITEMS: 'Hra s počítaním', WORDS: 'Hra so slovami', FIRST_LETTER: 'Hra s prvým písmenkom', ASSEMBLY: 'Hra so skladaním',
  COMPLETE_SYLLABLE: 'Hra s dopĺňaním slabík', COMPLETE_LETTER: 'Hra s dopĺňaním písmen', COMPARE_QUANTITIES: 'Hra s porovnávaním', ADDITION: 'Hra so sčítaním',
};

export function getSettingsSubtitle(target: SettingsTarget): string { return SETTINGS_SUBTITLES[target]; }

if (SETTINGS_REGISTRY.length !== SETTING_IDS.length || new Set(SETTINGS_REGISTRY.map(setting => setting.id)).size !== SETTING_IDS.length) {
  throw new Error('Settings registry must define every SettingId exactly once.');
}
