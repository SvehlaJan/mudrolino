export const SETTING_IDS = [
  'alphabetAccents',
  'alphabetGridSize',
  'syllablesGridSize',
  'numbersRange',
  'countingRange',
  'completeLetterMissingCount',
  'compareRange',
  'compareMode',
  'additionSumRange',
  'additionRepresentation',
] as const;

export type SettingId = typeof SETTING_IDS[number];
