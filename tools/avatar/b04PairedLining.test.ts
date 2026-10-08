import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(pairs: unknown[]) {
  return spawnSync('python3', ['tools/blender/catalog/b04_paired_lining_plan.py'], { input: JSON.stringify({ pairs }), encoding: 'utf8' });
}

const pair = { outer: 1, inner: 99, rest_outer: [-.001, 0, .74], rest_inner: [.001, 0, .74],
  outer_after: [.004, 0, .74], outer_normal_after: [-1, 0, 0], affected_normal_fan: true };

it('constructs lining from its paired outer normal at the original 2.5mm target rather than clamping both layers independently', () => {
  const result = run([pair]);
  expect(result.status, result.stderr).toBe(0);
  const plan = JSON.parse(result.stdout);
  const lining = plan.changes.find((c: { index: number }) => c.index === 99).after;
  expect(lining[0]).toBeCloseTo(.0065, 10);
  expect(lining.slice(1)).toEqual([0, .74]);
  expect(plan.changes.find((c: { index: number }) => c.index === 1).after).toEqual([.004, 0, .74]);
  expect(plan.thickness_m).toBe(.0025);
});

it('follows the shared crotch normal and preserves paired surfaces outside the affected normal fan', () => {
  const result = run([{ ...pair, outer_after: pair.rest_outer, outer_normal_after: [0, 0, -1] },
    { ...pair, outer: 2, inner: 100, affected_normal_fan: false }]);
  expect(result.status, result.stderr).toBe(0);
  const plan = JSON.parse(result.stdout);
  expect(plan.changes.map((c: { index: number }) => c.index)).toEqual([99]);
  expect(plan.changes[0].after.slice(0, 2)).toEqual([-.001, 0]);
  expect(plan.changes[0].after[2]).toBeCloseTo(.7425, 10);
});

it('rejects duplicate or ambiguous layer identities and degenerate normals before construction', () => {
  expect(run([pair, { ...pair, outer: 2 }]).stderr).toContain('Layer mapping must be one-to-one');
  expect(run([{ ...pair, outer_normal_after: [0, 0, 0] }]).stderr).toContain('Unit outer normal required');
});
