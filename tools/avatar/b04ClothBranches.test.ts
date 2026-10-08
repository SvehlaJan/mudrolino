import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(input: unknown) {
  return spawnSync('python3', ['tools/blender/catalog/cloth_branch_distances.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}

it('follows cloth edges instead of assigning an inseam vertex by its crossed X coordinate', () => {
  const result = run({ points: [[1, 0, 0], [-.1, 0, 1], [0, 0, 2], [.1, 0, 1], [-1, 0, 0]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]], seeds: { Left: [0], Right: [4] } });
  expect(result.status, result.stderr).toBe(0);
  const distances = JSON.parse(result.stdout);
  expect(distances.Left[1]).toBeLessThan(distances.Right[1]);
  expect(distances.Right[3]).toBeLessThan(distances.Left[3]);
  expect(distances.Left[2]).toBeCloseTo(distances.Right[2], 10);
});

it('uses physical path length and every lower-leg seed rather than edge counts', () => {
  const result = run({ points: [[0, 0, 0], [1, 0, 0], [1, 2, 0], [0, 2, 0]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 0]], seeds: { Left: [0, 2], Right: [3] } });
  expect(result.status, result.stderr).toBe(0);
  const distances = JSON.parse(result.stdout);
  expect(distances.Left).toEqual([0, 1, 0, 1]);
  expect(distances.Right).toEqual([2, 3, 1, 0]);
});

it('rejects disconnected fabric and invalid seed inventories instead of emitting unmeasured branch assignments', () => {
  const base = { points: [[0, 0, 0], [1, 0, 0], [0, 1, 0]], edges: [[0, 1]], seeds: { Left: [0], Right: [1] } };
  expect(run(base).stderr).toContain('Unreachable fabric vertex');
  expect(run({ ...base, seeds: { Left: [], Right: [1] } }).stderr).toContain('Empty branch seeds');
});
