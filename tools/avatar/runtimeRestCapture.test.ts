import { spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';

function run(captured: unknown, expected: unknown) {
  return spawnSync('python3', ['tools/blender/catalog/runtime_rest_capture.py'], { input: JSON.stringify({ captured, expected }), encoding: 'utf8' });
}
const identity = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

it('accepts reset bind matrices with native float precision', () => {
  const captured = identity.map(r => [...r]); captured[0][0] += 1e-7;
  const result = run({ Hips: captured }, { Hips: identity });
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toBeCloseTo(1e-7);
});

it('rejects a gait pose captured as rest and a missing rig bone', () => {
  const captured = identity.map(r => [...r]); captured[2][3] = .1;
  const posed = run({ Hips: captured }, { Hips: identity });
  expect(posed.status).not.toBe(0);
  expect(posed.stderr).toContain('Captured runtime rest is posed');
  const missing = run({ Hips: identity }, { Hips: identity, LeftLeg: identity });
  expect(missing.status).not.toBe(0);
  expect(missing.stderr).toContain('Captured rig inventory differs');
});
