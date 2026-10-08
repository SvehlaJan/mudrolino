import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(input: unknown) {
  return spawnSync('python3', ['tools/blender/catalog/b04_centre_key_plan.py'], { input: JSON.stringify(input), encoding: 'utf8' });
}

it('removes inherited Left coordinates inside the formerly excluded centre strip while preserving intended Right targets', () => {
  const result = run({ basis: [[.002, .17, .84], [-.002, .17, .84], [0, .17, .84]],
    left: [[.003, .16, .845], [-.002, .17, .84], [0, .17, .84]],
    right: [[.003, .16, .845], [-.003, .16, .845], [0, .17, .84]], expected_count: 1 });
  expect(result.status, result.stderr).toBe(0);
  const resultPlan = JSON.parse(result.stdout);
  expect(resultPlan.changes.map((r: { vertex: number }) => r.vertex)).toEqual([0]);
  expect(resultPlan.corrected_right).toEqual([[.002, .17, .84], [-.003, .16, .845], [0, .17, .84]]);
  expect(resultPlan.intended_right).toEqual([1]);
});

it('rejects unexpected opposite-side deltas rather than treating every centre coordinate as inherited', () => {
  const fixture = { basis: [[.01, 0, 1]], left: [[.01, 0, 1]], right: [[.01, .01, 1]], expected_count: 1 };
  const result = run(fixture);
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('not inherited from Left');
});

it('rejects unaccounted Left leakage and count drift', () => {
  const leftLeak = run({ basis: [[-.001, 0, 1]], left: [[-.001, .01, 1]], right: [[-.001, 0, 1]], expected_count: 0 });
  expect(leftLeak.status).not.toBe(0);
  expect(leftLeak.stderr).toContain('Left key moves the opposite side');
  const countDrift = run({ basis: [[.001, 0, 1]], left: [[.001, .01, 1]], right: [[.001, .01, 1]], expected_count: 2 });
  expect(countDrift.status).not.toBe(0);
  expect(countDrift.stderr).toContain('Audited inherited count changed');
});

it('does not reintroduce a spatial dead zone at small positive X', () => {
  const result = run({ basis: [[1e-8, 0, 1]], left: [[1e-8, .01, 1]], right: [[1e-8, .01, 1]], expected_count: 1 });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).corrected_right).toEqual([[1e-8, 0, 1]]);
});
