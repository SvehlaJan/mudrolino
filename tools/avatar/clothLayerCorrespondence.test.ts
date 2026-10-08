import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(input: unknown) {
  return spawnSync('python3', ['tools/blender/catalog/cloth_layer_correspondence.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}

const outer = [[0, 1, 4, 3], [1, 2, 5, 4]];
const inner = [[10, 11, 15, 13], [11, 12, 14, 15]];

it('pairs inserted vertices through actual edges and reverse face winding despite reordered indices', () => {
  const result = run({ outer, inner, seeds: { 0: 13, 1: 15, 3: 10 } });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).vertex_pairs).toEqual([[0, 13], [1, 15], [2, 14], [3, 10], [4, 11], [5, 12]]);
});

it('rejects ambiguous unseeded correspondence instead of guessing nearest coordinates', () => {
  const result = run({ outer: [outer[0]], inner: [inner[0]], seeds: { 0: 13 } });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Ambiguous layer correspondence');
});

it('rejects duplicate seed destinations and inconsistent oriented face correspondence', () => {
  expect(run({ outer, inner, seeds: { 0: 13, 1: 13 } }).stderr).toContain('Seed mapping is not one-to-one');
  const result = run({ outer, inner: inner.map(face => [...face].reverse()), seeds: { 0: 13, 1: 15, 3: 10 } });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Reversed face inventory differs');
});
