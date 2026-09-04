/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NumberItem } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface AdditionProblem {
  a: NumberItem;
  b: NumberItem;
  sum: NumberItem;
}

export function toNumberItem(value: number): NumberItem {
  return { value, audioKey: String(value) };
}

/** Stable key for a pair regardless of order, used to avoid repeating the same problem back-to-back. */
export function pairKey(a: number, b: number): string {
  return [a, b].sort((x, y) => x - y).join('-');
}

/**
 * Picks a target sum uniformly in [2, sumRange], then splits it into two addends
 * a (uniform in [1, sum-1]) and b = sum - a. Requires sumRange >= 2.
 */
export function createAdditionProblem(sumRange: number, random: () => number = Math.random): AdditionProblem {
  if (sumRange < 2) {
    throw new Error(`sumRange must be >= 2, got ${sumRange}`);
  }
  const sumValue = 2 + Math.floor(random() * (sumRange - 1)); // integer in [2, sumRange]
  const aValue = 1 + Math.floor(random() * (sumValue - 1));   // integer in [1, sumValue - 1]
  const bValue = sumValue - aValue;
  return {
    a: toNumberItem(aValue),
    b: toNumberItem(bValue),
    sum: toNumberItem(sumValue),
  };
}

/**
 * Builds `count` numeral answer options including the correct sum. Distractors are
 * near-misses — sum +/- a small offset — so a child can't just tap "the number that
 * looks smallest/biggest" without actually computing. The offset band scales with
 * sumRange (wider band at bigger ranges, since a fixed +/-1..3 would become trivially
 * close at range=100). If the near-miss band can't supply enough distinct in-range
 * candidates (e.g. sum sits right at the top of a small range), a second pass fills
 * the rest from anywhere in [1, sumRange] — this guarantees `count` distinct options
 * whenever sumRange >= count (true for all 4 configured ranges: 5, 10, 20, 100).
 * Returns fewer than `count` items only if the range genuinely doesn't have enough
 * distinct values at all (sumRange < count) — callers should treat a short result as
 * "try a different problem".
 */
export function buildAnswerOptions(
  sum: NumberItem,
  sumRange: number,
  count: number,
  random: () => number = Math.random,
): NumberItem[] {
  const offsetMax = Math.max(2, Math.ceil(sumRange / 10));
  const distractorValues = new Set<number>();

  // Pass 1: prefer near-miss values within the offset band.
  let guard = 0;
  while (distractorValues.size < count - 1 && guard < 200) {
    guard += 1;
    const offset = 1 + Math.floor(random() * offsetMax);
    const sign = random() < 0.5 ? -1 : 1;
    const candidate = sum.value + sign * offset;
    if (candidate < 1 || candidate > sumRange || candidate === sum.value) continue;
    distractorValues.add(candidate);
  }

  // Pass 2: fall back to any other valid value if the near-miss band came up short
  // (e.g. sum is at the very edge of a small range, so half the offsets go out of bounds).
  guard = 0;
  while (distractorValues.size < count - 1 && guard < 200) {
    guard += 1;
    const candidate = 1 + Math.floor(random() * sumRange);
    if (candidate === sum.value || distractorValues.has(candidate)) continue;
    distractorValues.add(candidate);
  }

  if (distractorValues.size < count - 1) return [sum];

  const distractors = Array.from(distractorValues).map(toNumberItem);
  return fisherYatesShuffle([sum, ...distractors]);
}
