/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Stable string key for a generic `string | number` option, used as the underlying `RadioGroupControl` value. */
export function toSegmentedChoiceKey(option: string | number): string {
  return String(option);
}

/** Resolves an internal string key back to its original typed option. */
export function resolveSegmentedChoiceOption<T extends string | number>(
  options: readonly T[],
  key: string,
): T | undefined {
  return options.find(option => toSegmentedChoiceKey(option) === key);
}
