/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Stable string key for a generic `string | number` option, used as the underlying `RadioGroupControl` value.
 * Namespaced by primitive type so the number `2` and the string `'2'` never collide when both appear in the
 * same option list.
 */
export function toSegmentedChoiceKey(option: string | number): string {
  return `${typeof option}:${option}`;
}

/** Resolves an internal string key back to its original typed option. */
export function resolveSegmentedChoiceOption<T extends string | number>(
  options: readonly T[],
  key: string,
): T | undefined {
  return options.find(option => toSegmentedChoiceKey(option) === key);
}
