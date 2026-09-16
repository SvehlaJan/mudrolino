/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveSegmentedChoiceOption, toSegmentedChoiceKey } from './segmentedChoiceKey';

const mixedOptions = [1, 2, '2', 'adaptive'] as const;

if (toSegmentedChoiceKey(2) !== 'number:2') {
  throw new Error('Expected a numeric option to stringify to a type-namespaced key');
}

if (toSegmentedChoiceKey('2') !== 'string:2') {
  throw new Error('Expected a string option to stringify to a type-namespaced key');
}

if (toSegmentedChoiceKey(2) === toSegmentedChoiceKey('2')) {
  throw new Error('Expected the number 2 and the string \'2\' to produce distinct keys');
}

const roundTrippedNumber = resolveSegmentedChoiceOption(mixedOptions, toSegmentedChoiceKey(2));
if (roundTrippedNumber !== 2) {
  throw new Error(`Expected key for 2 to resolve back to the typed number 2, got ${JSON.stringify(roundTrippedNumber)}`);
}
if (typeof roundTrippedNumber !== 'number') {
  throw new Error('Round-tripped option lost its original number type');
}

const roundTrippedString = resolveSegmentedChoiceOption(mixedOptions, toSegmentedChoiceKey('2'));
if (roundTrippedString !== '2') {
  throw new Error(`Expected key for '2' to resolve back to the typed string '2', got ${JSON.stringify(roundTrippedString)}`);
}
if (typeof roundTrippedString !== 'string') {
  throw new Error("Round-tripped option lost its original string type for '2'");
}

if (resolveSegmentedChoiceOption(mixedOptions, toSegmentedChoiceKey('adaptive')) !== 'adaptive') {
  throw new Error("Expected key 'adaptive' to resolve back to the typed string option");
}

if (resolveSegmentedChoiceOption(mixedOptions, 'missing') !== undefined) {
  throw new Error('Expected an unknown key to resolve to undefined, not a fallback option');
}

console.log('✓ SegmentedChoice option round-trip contracts passed');
