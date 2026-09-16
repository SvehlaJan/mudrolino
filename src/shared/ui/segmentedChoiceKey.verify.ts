/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveSegmentedChoiceOption, toSegmentedChoiceKey } from './segmentedChoiceKey';

const mixedOptions = [1, 2, 'adaptive'] as const;

if (toSegmentedChoiceKey(2) !== '2') {
  throw new Error('Expected a numeric option to stringify to its internal key');
}

const roundTripped = resolveSegmentedChoiceOption(mixedOptions, '2');
if (roundTripped !== 2) {
  throw new Error(`Expected key '2' to resolve back to the typed number 2, got ${JSON.stringify(roundTripped)}`);
}
if (typeof roundTripped !== 'number') {
  throw new Error('Round-tripped option lost its original number type');
}

if (resolveSegmentedChoiceOption(mixedOptions, 'adaptive') !== 'adaptive') {
  throw new Error("Expected key 'adaptive' to resolve back to the typed string option");
}

if (resolveSegmentedChoiceOption(mixedOptions, 'missing') !== undefined) {
  throw new Error('Expected an unknown key to resolve to undefined, not a fallback option');
}

console.log('✓ SegmentedChoice option round-trip contracts passed');
