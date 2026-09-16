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
}

export interface SettingDefinition {
  id: SettingId;
  label: string;
  description: string;
  kind: 'switch' | 'radio';
  options: readonly SettingOption[];
  read: (settings: GameSettings) => SettingValue;
  apply: (settings: GameSettings, value: SettingValue) => SettingApplyResult;
  summarize: (value: SettingValue) => string;
  isValid: (value: unknown) => value is SettingValue;
}

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
  completeLetterMissingCount: 1,
  compareRange: { start: 1, end: 5 },
  compareMode: 'objects',
  additionSumRange: 5,
  additionRepresentation: 'objects',
};

export const ADDITION_NUMERALS_NOTICE = 'Pri rozsahu 20 alebo 100 sa zobrazenie prepne na čísla.';

export function additionRangeForcesNumerals(range: GameSettings['additionSumRange']): boolean {
  return range === 20 || range === 100;
}

const range = (end: number): SettingRange => ({ start: 1, end });
const isExactRange = (value: unknown, ends: readonly number[]): value is SettingRange =>
  typeof value === 'object' && value !== null &&
  (value as SettingRange).start === 1 && ends.includes((value as SettingRange).end);
const isOneOf = <T extends SettingValue>(value: unknown, allowed: readonly T[]): value is T =>
  allowed.includes(value as T);
const optionLabel = (options: readonly SettingOption[], value: SettingValue): string =>
  options.find(option => JSON.stringify(option.value) === JSON.stringify(value))?.label ?? String(value);
const plainApply = <K extends SettingId>(id: K) =>
  (settings: GameSettings, value: SettingValue): SettingApplyResult => ({ settings: { ...settings, [id]: value } as GameSettings });

export const SETTINGS_REGISTRY: readonly SettingDefinition[] = [
  {
    id: 'alphabetAccents', label: 'Písmená s dĺžňami a mäkčeňmi', description: 'Rozšíriť hru o slovenské znaky.', kind: 'switch',
    options: [{ value: false, label: 'Vypnuté' }, { value: true, label: 'Zapnuté' }],
    read: settings => settings.alphabetAccents, apply: plainApply('alphabetAccents'), summarize: value => value ? 'Zapnuté' : 'Vypnuté',
    isValid: value => isOneOf(value, [false, true]),
  },
  {
    id: 'alphabetGridSize', label: 'Počet kariet', description: 'Vyberte počet kariet v hre.', kind: 'radio',
    options: [4, 6, 8].map(value => ({ value, label: String(value) })),
    read: settings => settings.alphabetGridSize, apply: plainApply('alphabetGridSize'), summarize: value => String(value),
    isValid: value => isOneOf(value, [4, 6, 8]),
  },
  {
    id: 'syllablesGridSize', label: 'Počet kariet', description: 'Vyberte počet kariet v hre.', kind: 'radio',
    options: [4, 6].map(value => ({ value, label: String(value) })),
    read: settings => settings.syllablesGridSize, apply: plainApply('syllablesGridSize'), summarize: value => String(value),
    isValid: value => isOneOf(value, [4, 6]),
  },
  {
    id: 'numbersRange', label: 'Rozsah čísel', description: 'Vyberte rozsah čísel pre hru.', kind: 'radio',
    options: [5, 10, 20].map(end => ({ value: range(end), label: `1 - ${end}` })),
    read: settings => settings.numbersRange, apply: plainApply('numbersRange'), summarize: value => optionLabel(SETTINGS_REGISTRY.find(setting => setting.id === 'numbersRange')!.options, value),
    isValid: value => isExactRange(value, [5, 10, 20]),
  },
  {
    id: 'countingRange', label: 'Rozsah počítania', description: 'Vyberte rozsah počítania predmetov.', kind: 'radio',
    options: [5, 10].map(end => ({ value: range(end), label: `1 - ${end}` })),
    read: settings => settings.countingRange, apply: plainApply('countingRange'), summarize: value => optionLabel(SETTINGS_REGISTRY.find(setting => setting.id === 'countingRange')!.options, value),
    isValid: value => isExactRange(value, [5, 10]),
  },
  {
    id: 'completeLetterMissingCount', label: 'Chýbajúce písmená', description: 'Vyberte, koľko písmen má v slove chýbať.', kind: 'radio',
    options: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 'adaptive', label: 'Podľa dĺžky' }],
    read: settings => settings.completeLetterMissingCount, apply: plainApply('completeLetterMissingCount'), summarize: value => value === 'adaptive' ? 'Podľa dĺžky' : String(value),
    isValid: value => isOneOf(value, [1, 2, 'adaptive']),
  },
  {
    id: 'compareRange', label: 'Rozsah čísel', description: 'Vyberte rozsah čísel pre porovnávanie.', kind: 'radio',
    options: [5, 10].map(end => ({ value: range(end), label: `1 - ${end}` })),
    read: settings => settings.compareRange, apply: plainApply('compareRange'), summarize: value => optionLabel(SETTINGS_REGISTRY.find(setting => setting.id === 'compareRange')!.options, value),
    isValid: value => isExactRange(value, [5, 10]),
  },
  {
    id: 'compareMode', label: 'Zobrazenie', description: 'Predmety na počítanie, alebo napísané čísla.', kind: 'radio',
    options: [{ value: 'objects', label: 'Predmety' }, { value: 'numerals', label: 'Čísla' }],
    read: settings => settings.compareMode, apply: plainApply('compareMode'), summarize: value => value === 'objects' ? 'Predmety' : 'Čísla',
    isValid: value => isOneOf(value, ['objects', 'numerals']),
  },
  {
    id: 'additionSumRange', label: 'Rozsah súčtu', description: 'Najväčší možný súčet.', kind: 'radio',
    options: [5, 10, 20, 100].map(value => ({ value, label: String(value) })),
    read: settings => settings.additionSumRange,
    apply: (settings, value) => {
      const additionSumRange = value as GameSettings['additionSumRange'];
      const forcesNumerals = additionRangeForcesNumerals(additionSumRange);
      return {
        settings: { ...settings, additionSumRange, additionRepresentation: forcesNumerals ? 'numerals' : settings.additionRepresentation },
        ...(forcesNumerals && settings.additionRepresentation !== 'numerals' ? { notice: ADDITION_NUMERALS_NOTICE } : {}),
      };
    },
    summarize: value => String(value), isValid: value => isOneOf(value, [5, 10, 20, 100]),
  },
  {
    id: 'additionRepresentation', label: 'Zobrazenie', description: 'Predmety na počítanie, alebo napísané čísla.', kind: 'radio',
    options: [{ value: 'objects', label: 'Predmety' }, { value: 'numerals', label: 'Čísla' }],
    read: settings => settings.additionRepresentation,
    apply: (settings, value) => {
      const forceNumerals = additionRangeForcesNumerals(settings.additionSumRange);
      return {
        settings: { ...settings, additionRepresentation: forceNumerals ? 'numerals' : value as GameSettings['additionRepresentation'] },
        ...(forceNumerals && value === 'objects' ? { notice: ADDITION_NUMERALS_NOTICE } : {}),
      };
    },
    summarize: value => value === 'objects' ? 'Predmety' : 'Čísla', isValid: value => isOneOf(value, ['objects', 'numerals']),
  },
];

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
