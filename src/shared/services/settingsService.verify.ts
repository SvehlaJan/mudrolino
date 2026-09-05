/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { additionRangeForcesNumerals, applyAdditionSumRangeChange, DEFAULT_SETTINGS } from './settingsService';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// additionRangeForcesNumerals: the single source of truth both the auto-switch and the
// settings UI's disabled-tile check rely on.
assert(additionRangeForcesNumerals(5) === false, 'range 5 does not force numerals');
assert(additionRangeForcesNumerals(10) === false, 'range 10 does not force numerals');
assert(additionRangeForcesNumerals(20) === true, 'range 20 forces numerals');
assert(additionRangeForcesNumerals(100) === true, 'range 100 forces numerals');

// Dropping to/staying at 5 or 10 never touches representation, either direction.
const objectsAt5 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 5);
assert(objectsAt5.additionRepresentation === 'objects', 'range=5 leaves objects untouched');
assert(objectsAt5.additionSumRange === 5, 'range is always updated to the new value');

const objectsAt10 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 10);
assert(objectsAt10.additionRepresentation === 'objects', 'range=10 leaves objects untouched');

// Crossing into 20 or 100 forces numerals when it was objects.
const forcedAt20 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 20);
assert(forcedAt20.additionRepresentation === 'numerals', 'range=20 forces numerals when it was objects');

const forcedAt100 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 100);
assert(forcedAt100.additionRepresentation === 'numerals', 'range=100 forces numerals when it was objects');

// Already-numerals stays numerals at 20/100 (no-op, not an error).
const stillNumerals = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'numerals' }, 100);
assert(stillNumerals.additionRepresentation === 'numerals', 'already-numerals stays numerals');

// One-directional: dropping the range back to 5/10 does NOT restore objects.
const staysNumeralsOnDrop = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'numerals' }, 5);
assert(
  staysNumeralsOnDrop.additionRepresentation === 'numerals',
  'auto-switch is one-directional; dropping the range does not restore objects',
);

console.log('settingsService verify tests passed successfully!');
