import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(vertices: unknown[]) {
  return spawnSync('python3', ['tools/blender/catalog/b04_inseam_separation_plan.py'], { input: JSON.stringify({ vertices }), encoding: 'utf8' });
}

it('separates crossed inner panels by cloth branch, retaining an ordered 2.5 mm inner layer', () => {
  const result = run([
    { index: 1, point: [-.002, .01, .74], layer: 0, path_delta: -.05 },
    { index: 2, point: [.005, .01, .74], layer: 0, path_delta: .05 },
    { index: 3, point: [.0005, .01, .74], layer: 1, path_delta: .05 },
  ]);
  expect(result.status, result.stderr).toBe(0);
  const changes = JSON.parse(result.stdout).changes;
  expect(changes.map((c: { after: number[] }) => c.after[0])).toEqual([.004, -.004, -.0065]);
  expect(changes.every((c: { before: number[]; after: number[] }) => c.before[1] === c.after[1] && c.before[2] === c.after[2])).toBe(true);
});

it('preserves the shared crotch seam, outside thigh silhouette, waist and cuff boundary', () => {
  const result = run([
    { index: 0, point: [0, 0, .764], layer: 0, path_delta: .001 },
    { index: 1, point: [.15, 0, .74], layer: 0, path_delta: -.05 },
    { index: 2, point: [-.002, 0, .9], layer: 0, path_delta: -.05 },
    { index: 3, point: [-.002, 0, .17], layer: 0, path_delta: -.05 },
  ]);
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).changes).toEqual([]);
});

it('rejects duplicate source indices and unknown fabric layers', () => {
  const vertex = { index: 1, point: [0, 0, .74], layer: 0, path_delta: -.05 };
  expect(run([vertex, vertex]).stderr).toContain('Duplicate source index');
  expect(run([{ ...vertex, layer: 3 }]).stderr).toContain('Unknown fabric layer');
});
