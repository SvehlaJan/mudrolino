/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** Deterministic [0, 1) generator (mulberry32), so one seed always prints the same worksheet. */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mixes a seed with a stream label, so each game keeps its tasks when other games are toggled. */
export function deriveSeed(seed: number, label: string): number {
  let hash = (seed ^ 0x9e3779b9) >>> 0;
  for (const character of label) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  }
  return hash;
}

export function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function pickWith<T>(items: readonly T[], random: () => number): T {
  if (items.length === 0) throw new Error('Cannot pick from an empty list.');
  return items[Math.floor(random() * items.length)];
}

export function randomIntInclusive(min: number, max: number, random: () => number): number {
  return min + Math.floor(random() * (max - min + 1));
}

export function createWorksheetSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff);
}
